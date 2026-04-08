import { HttpCrawler } from 'crawlee';
import { config } from '../config.js';
import { normalizeMeliItem } from '../normalizers/mercadolibre.js';
import { computeContentHash, computeFingerprint, normalizePropertyType } from '../normalizers/base.js';
import { supabase } from '../lib/supabase.js';
import { getUFValue, clpToUF, ufToCLP } from '../lib/uf.js';

const MELI_API = 'https://api.mercadolibre.com';
const SITE_ID = 'MLC';
const CATEGORIES = ['MLC1459', 'MLC1473']; // venta, arriendo
const PAGE_SIZE = 50;
const MAX_OFFSET = 1000; // ML API limit

interface CrawlStats {
  found: number;
  created: number;
  updated: number;
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function crawlMercadoLibre(): Promise<CrawlStats> {
  const stats: CrawlStats = { found: 0, created: 0, updated: 0 };
  const ufValue = await getUFValue();

  const headers: Record<string, string> = {};
  if (config.meli.accessToken) {
    headers['Authorization'] = `Bearer ${config.meli.accessToken}`;
  }

  for (const categoryId of CATEGORIES) {
    let offset = 0;
    let total = Infinity;

    while (offset < total && offset < MAX_OFFSET) {
      const url = `${MELI_API}/sites/${SITE_ID}/search?category=${categoryId}&offset=${offset}&limit=${PAGE_SIZE}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.error(`MELI API error ${res.status}: ${await res.text()}`);
        break;
      }
      const data = await res.json();
      total = Math.min(data.paging?.total ?? 0, MAX_OFFSET);
      const items = data.results || [];

      for (const item of items) {
        stats.found++;
        try {
          // Get full item details
          const detailRes = await fetch(`${MELI_API}/items/${item.id}`, { headers });
          if (!detailRes.ok) continue;
          const detail = await detailRes.json();

          const raw = normalizeMeliItem(detail, categoryId);
          raw.property_type = normalizePropertyType(raw.property_type);
          const content_hash = computeContentHash(raw);
          const fp = computeFingerprint(raw);

          // Compute prices in both currencies
          let price_clp = raw.price_clp ?? null;
          let price_uf = raw.price_uf ?? null;
          if (price_clp && !price_uf) price_uf = clpToUF(price_clp, ufValue);
          if (price_uf && !price_clp) price_clp = ufToCLP(price_uf, ufValue);

          const built_area = raw.built_area_m2 ?? raw.total_area_m2;
          const price_per_m2 = price_uf && built_area ? Math.round((price_uf / built_area) * 100) / 100 : null;

          const commune = raw.commune ? slugify(raw.commune) : null;
          let commune_id: number | null = null;
          if (commune) {
            const { data: communeData } = await supabase
              .from('communes')
              .select('id')
              .eq('slug', commune)
              .single();
            commune_id = communeData?.id ?? null;
          }

          const slug = `${raw.property_type.slice(0, 5)}-${raw.bedrooms || 0}d-${raw.bathrooms || 0}b-${commune || 'chile'}-${raw.external_id.slice(-8).toLowerCase()}`;

          const location = raw.latitude && raw.longitude
            ? `SRID=4326;POINT(${raw.longitude} ${raw.latitude})`
            : null;

          const row = {
            slug,
            title: raw.title,
            description: raw.description || null,
            price_clp,
            price_uf,
            currency: raw.currency,
            price_per_m2_uf: price_per_m2,
            operation: raw.operation,
            property_type: raw.property_type,
            bedrooms: raw.bedrooms ?? null,
            bathrooms: raw.bathrooms ?? null,
            parking_spots: raw.parking_spots ?? null,
            total_area_m2: raw.total_area_m2 ?? null,
            built_area_m2: raw.built_area_m2 ?? null,
            floor_number: raw.floor_number ?? null,
            address: raw.address ?? null,
            commune_id,
            sector: raw.sector ?? null,
            location,
            latitude: raw.latitude ?? null,
            longitude: raw.longitude ?? null,
            images: raw.images,
            image_count: raw.images.length,
            primary_source: 'mercadolibre' as const,
            primary_source_url: raw.source_url,
            primary_external_id: raw.external_id,
            content_hash,
            fingerprint: fp,
            last_seen_at: new Date().toISOString(),
            is_active: true,
          };

          // Check existing by source + external_id
          const { data: existing } = await supabase
            .from('properties')
            .select('id')
            .eq('primary_source', 'mercadolibre')
            .eq('primary_external_id', raw.external_id)
            .single();

          if (existing) {
            await supabase.from('properties').update({
              ...row,
              updated_at: new Date().toISOString(),
            }).eq('id', existing.id);
            stats.updated++;
          } else {
            // Check cross-source fingerprint
            const { data: fpMatch } = await supabase
              .from('properties')
              .select('id, source_count')
              .eq('fingerprint', fp)
              .neq('primary_source', 'mercadolibre')
              .single();

            if (fpMatch) {
              await supabase.from('property_sources').upsert({
                property_id: fpMatch.id,
                source: 'mercadolibre',
                external_id: raw.external_id,
                source_url: raw.source_url,
                source_price_clp: price_clp,
                source_price_uf: price_uf,
                last_checked_at: new Date().toISOString(),
              }, { onConflict: 'source,external_id' });

              await supabase.from('properties').update({
                source_count: (fpMatch.source_count || 1) + 1,
                last_seen_at: new Date().toISOString(),
              }).eq('id', fpMatch.id);
              stats.updated++;
            } else {
              // PostGIS point needs raw SQL or use location column
              const { error } = await supabase.from('properties').insert(row);
              if (error) {
                console.error(`Insert error for ${raw.external_id}:`, error.message);
              } else {
                stats.created++;
              }
            }
          }
        } catch (err) {
          console.error(`Error processing item ${item.id}:`, err);
        }
      }

      offset += PAGE_SIZE;
      // Rate limit: ~25 req/s = 1500/min
      await new Promise(r => setTimeout(r, 40));
    }
  }

  return stats;
}

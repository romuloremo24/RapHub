import { CheerioCrawler, Dataset } from 'crawlee';
import type { RawListing } from '../normalizers/base.js';
import { computeContentHash, computeFingerprint, normalizePropertyType } from '../normalizers/base.js';
import { supabase } from '../lib/supabase.js';
import { getUFValue, clpToUF } from '../lib/uf.js';

const BASE_URL = 'https://www.toctoc.com';

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

function parsePrice(text: string): { amount: number; currency: 'CLP' | 'UF' } | null {
  const cleaned = text.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const ufMatch = cleaned.match(/UF\s*([\d.]+)/i);
  if (ufMatch) return { amount: parseFloat(ufMatch[1]), currency: 'UF' };
  const clpMatch = cleaned.match(/\$?\s*([\d]+)/);
  if (clpMatch) return { amount: parseInt(clpMatch[1], 10), currency: 'CLP' };
  return null;
}

export async function crawlTocToc(): Promise<CrawlStats> {
  const stats: CrawlStats = { found: 0, created: 0, updated: 0 };
  const ufValue = await getUFValue();

  const startUrls = [
    `${BASE_URL}/arriendo/departamento/region-metropolitana`,
    `${BASE_URL}/arriendo/casa/region-metropolitana`,
    `${BASE_URL}/venta/departamento/region-metropolitana`,
    `${BASE_URL}/venta/casa/region-metropolitana`,
  ];

  const crawler = new CheerioCrawler({
    maxRequestsPerCrawl: 500,
    maxConcurrency: 3,
    requestHandlerTimeoutSecs: 60,

    async requestHandler({ request, $, enqueueLinks, log }) {
      const isListing = request.url.includes('/propiedad/') || request.url.includes('/detalle/');

      if (!isListing) {
        // List page — extract property links and paginate
        const links: string[] = [];
        $('a[href*="/propiedad/"], a[href*="/detalle/"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) links.push(href.startsWith('http') ? href : `${BASE_URL}${href}`);
        });

        for (const link of [...new Set(links)]) {
          await crawler.addRequests([{ url: link, userData: { operation: request.userData.operation, type: request.userData.type } }]);
        }

        // Pagination — look for next page link
        const nextPage = $('a[rel="next"], .pagination a:last-child').attr('href');
        if (nextPage) {
          const nextUrl = nextPage.startsWith('http') ? nextPage : `${BASE_URL}${nextPage}`;
          await crawler.addRequests([{ url: nextUrl, userData: request.userData }]);
        }

        log.info(`Found ${links.length} listings on ${request.url}`);
        return;
      }

      // Detail page — extract property data
      stats.found++;

      const title = $('h1').first().text().trim() || $('title').text().trim();
      const priceText = $('.price, .precio, [class*="price"]').first().text().trim();
      const price = parsePrice(priceText);
      const description = $('meta[name="description"]').attr('content') || $('[class*="description"]').first().text().trim();

      // Extract specs from common patterns
      const specText = $('[class*="spec"], [class*="feature"], [class*="detail"]').text();
      const bedroomsMatch = specText.match(/(\d+)\s*(?:dormitorio|habitaci)/i);
      const bathroomsMatch = specText.match(/(\d+)\s*(?:baño)/i);
      const areaMatch = specText.match(/([\d,.]+)\s*m²/i);

      const images: string[] = [];
      $('img[src*="toctoc"], img[data-src*="toctoc"], [class*="gallery"] img').each((_, el) => {
        const src = $(el).attr('data-src') || $(el).attr('src');
        if (src && !src.includes('logo') && !src.includes('icon')) {
          images.push(src.startsWith('http') ? src : `${BASE_URL}${src}`);
        }
      });

      const urlParts = request.url.split('/');
      const externalId = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];

      // Determine operation from URL or page content
      let operation: 'arriendo' | 'venta' = 'venta';
      if (request.url.includes('arriendo') || request.userData.operation === 'arriendo') {
        operation = 'arriendo';
      }

      let propertyType = 'departamento';
      if (request.url.includes('/casa/') || request.userData.type === 'casa') {
        propertyType = 'casa';
      }

      const communeEl = $('[class*="location"], [class*="comuna"], .breadcrumb').text();
      const communeMatch = communeEl.match(/(?:comuna|en)\s+(\w[\w\s]+)/i);

      // Extract coordinates from page scripts or meta tags
      let latitude: number | undefined;
      let longitude: number | undefined;
      const scripts = $('script').text();
      const latMatch = scripts.match(/(?:lat(?:itude)?)\s*[:=]\s*(-?\d+\.\d+)/i);
      const lngMatch = scripts.match(/(?:lng|lon(?:gitude)?)\s*[:=]\s*(-?\d+\.\d+)/i);
      if (latMatch && lngMatch) {
        latitude = parseFloat(latMatch[1]);
        longitude = parseFloat(lngMatch[1]);
      }

      const raw: RawListing = {
        external_id: `toctoc-${externalId}`,
        source: 'toctoc',
        source_url: request.url,
        title,
        description: description || undefined,
        price_clp: price?.currency === 'CLP' ? price.amount : undefined,
        price_uf: price?.currency === 'UF' ? price.amount : undefined,
        currency: price?.currency || 'CLP',
        operation,
        property_type: propertyType,
        bedrooms: bedroomsMatch ? parseInt(bedroomsMatch[1]) : undefined,
        bathrooms: bathroomsMatch ? parseInt(bathroomsMatch[1]) : undefined,
        built_area_m2: areaMatch ? parseFloat(areaMatch[1].replace('.', '').replace(',', '.')) : undefined,
        address: $('[class*="address"]').first().text().trim() || undefined,
        commune: communeMatch?.[1]?.trim(),
        latitude,
        longitude,
        images: [...new Set(images)].slice(0, 20),
      };

      const content_hash = computeContentHash(raw);
      const fp = computeFingerprint(raw);
      raw.property_type = normalizePropertyType(raw.property_type);

      let price_clp = raw.price_clp ?? null;
      let price_uf = raw.price_uf ?? null;
      if (price_clp && !price_uf) price_uf = clpToUF(price_clp, ufValue);
      if (price_uf && !price_clp) price_clp = Math.round(price_uf * ufValue);

      const built_area = raw.built_area_m2 ?? raw.total_area_m2;
      const price_per_m2 = price_uf && built_area ? Math.round((price_uf / built_area) * 100) / 100 : null;

      const commune = raw.commune ? slugify(raw.commune) : null;
      let commune_id: number | null = null;
      if (commune) {
        const { data } = await supabase.from('communes').select('id').eq('slug', commune).single();
        commune_id = data?.id ?? null;
      }

      const slug = `${raw.property_type.slice(0, 5)}-${raw.bedrooms || 0}d-${raw.bathrooms || 0}b-${commune || 'chile'}-${externalId.slice(-8)}`;

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
        total_area_m2: raw.total_area_m2 ?? null,
        built_area_m2: raw.built_area_m2 ?? null,
        address: raw.address ?? null,
        commune_id,
        sector: raw.sector ?? null,
        location,
        latitude: raw.latitude ?? null,
        longitude: raw.longitude ?? null,
        images: raw.images,
        image_count: raw.images.length,
        primary_source: 'toctoc' as const,
        primary_source_url: raw.source_url,
        primary_external_id: raw.external_id,
        content_hash,
        fingerprint: fp,
        last_seen_at: new Date().toISOString(),
        is_active: true,
      };

      const { data: existing } = await supabase
        .from('properties')
        .select('id')
        .eq('primary_source', 'toctoc')
        .eq('primary_external_id', raw.external_id)
        .single();

      if (existing) {
        await supabase.from('properties').update({
          ...row,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
        stats.updated++;
      } else {
        const { data: fpMatch } = await supabase
          .from('properties')
          .select('id, source_count')
          .eq('fingerprint', fp)
          .neq('primary_source', 'toctoc')
          .single();

        if (fpMatch) {
          await supabase.from('property_sources').upsert({
            property_id: fpMatch.id,
            source: 'toctoc',
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
          const { error } = await supabase.from('properties').insert(row);
          if (error) console.error(`Insert error for ${raw.external_id}:`, error.message);
          else stats.created++;
        }
      }
    },
  });

  await crawler.run(startUrls.map(url => {
    const parts = url.split('/');
    return {
      url,
      userData: { operation: parts[3], type: parts[4] },
    };
  }));

  return stats;
}

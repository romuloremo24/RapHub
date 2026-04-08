import { createHash } from 'crypto';

export interface RawListing {
  external_id: string;
  source: 'portalinmobiliario' | 'mercadolibre' | 'toctoc' | 'yapo';
  source_url: string;
  title: string;
  description?: string;
  price_clp?: number;
  price_uf?: number;
  currency: 'CLP' | 'UF' | 'USD';
  operation: 'arriendo' | 'venta';
  property_type: string;
  bedrooms?: number;
  bathrooms?: number;
  parking_spots?: number;
  total_area_m2?: number;
  built_area_m2?: number;
  floor_number?: number;
  year_built?: number;
  is_furnished?: boolean;
  common_expenses_clp?: number;
  address?: string;
  commune?: string;
  sector?: string;
  latitude?: number;
  longitude?: number;
  images: string[];
}

export function computeContentHash(listing: RawListing): string {
  const raw = [
    listing.title.toLowerCase().trim(),
    (listing.address || '').toLowerCase().trim(),
    listing.bedrooms ?? '',
    listing.bathrooms ?? '',
    listing.built_area_m2 ?? listing.total_area_m2 ?? '',
  ].join('|');
  return createHash('md5').update(raw).digest('hex');
}

function areaBucket(area: number): number {
  return Math.round(area / 5) * 5;
}

export function computeFingerprint(listing: RawListing): string {
  const area = listing.built_area_m2 ?? listing.total_area_m2;
  const raw = [
    (listing.address || '').toLowerCase().replace(/\s+/g, ' ').trim(),
    listing.operation,
    listing.property_type,
    area ? areaBucket(area) : '',
  ].join('|');
  return createHash('md5').update(raw).digest('hex');
}

export function normalizePropertyType(raw: string): string {
  const map: Record<string, string> = {
    'departamento': 'departamento',
    'depto': 'departamento',
    'apartment': 'departamento',
    'casa': 'casa',
    'house': 'casa',
    'terreno': 'terreno',
    'land': 'terreno',
    'parcela': 'parcela',
    'oficina': 'oficina',
    'office': 'oficina',
    'local comercial': 'local-comercial',
    'local': 'local-comercial',
    'bodega': 'bodega',
    'estacionamiento': 'estacionamiento',
    'parking': 'estacionamiento',
  };
  return map[raw.toLowerCase().trim()] || 'departamento';
}

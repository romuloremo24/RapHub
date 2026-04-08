import type { RawListing } from './base.js';

interface MeliItem {
  id: string;
  title: string;
  permalink: string;
  price: number;
  currency_id: string;
  condition: string;
  thumbnail: string;
  pictures?: { url: string; secure_url: string }[];
  attributes: { id: string; value_name: string | null }[];
  location?: {
    latitude: number;
    longitude: number;
    address_line?: string;
    city?: { name: string };
    neighborhood?: { name: string };
    state?: { name: string };
  };
  category_id: string;
}

const OPERATION_CATEGORIES: Record<string, 'arriendo' | 'venta'> = {
  'MLC1459': 'venta',    // Inmuebles venta
  'MLC1473': 'arriendo', // Inmuebles arriendo
};

function getAttr(item: MeliItem, id: string): string | null {
  return item.attributes.find(a => a.id === id)?.value_name ?? null;
}

function parseNumber(val: string | null): number | undefined {
  if (!val) return undefined;
  const n = parseFloat(val.replace(/[^\d.]/g, ''));
  return isNaN(n) ? undefined : n;
}

export function normalizeMeliItem(item: MeliItem, categoryId: string): RawListing {
  const operation = OPERATION_CATEGORIES[categoryId] || 'venta';
  const propertyTypeRaw = getAttr(item, 'PROPERTY_TYPE') || 'departamento';

  const images = item.pictures
    ? item.pictures.map(p => p.secure_url || p.url)
    : item.thumbnail
    ? [item.thumbnail.replace('-I.jpg', '-O.jpg')]
    : [];

  return {
    external_id: item.id,
    source: 'mercadolibre',
    source_url: item.permalink,
    title: item.title,
    price_clp: item.currency_id === 'CLP' ? item.price : undefined,
    price_uf: item.currency_id === 'CLF' ? item.price : undefined,
    currency: item.currency_id === 'CLF' ? 'UF' : item.currency_id === 'USD' ? 'USD' : 'CLP',
    operation,
    property_type: propertyTypeRaw.toLowerCase(),
    bedrooms: parseNumber(getAttr(item, 'BEDROOMS')),
    bathrooms: parseNumber(getAttr(item, 'FULL_BATHROOMS') || getAttr(item, 'BATHROOMS')),
    parking_spots: parseNumber(getAttr(item, 'PARKING_LOTS')),
    total_area_m2: parseNumber(getAttr(item, 'TOTAL_AREA')),
    built_area_m2: parseNumber(getAttr(item, 'COVERED_AREA')),
    floor_number: parseNumber(getAttr(item, 'FLOOR')),
    address: item.location?.address_line || undefined,
    commune: item.location?.city?.name || undefined,
    sector: item.location?.neighborhood?.name || undefined,
    latitude: item.location?.latitude,
    longitude: item.location?.longitude,
    images,
  };
}

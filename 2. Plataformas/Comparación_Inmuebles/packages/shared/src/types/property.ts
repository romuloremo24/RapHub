export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price_clp: number | null;
  price_uf: number | null;
  currency: 'CLP' | 'UF' | 'USD';
  price_per_m2_uf: number | null;
  operation: Operation;
  property_type: PropertyType;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  total_area_m2: number | null;
  built_area_m2: number | null;
  floor_number: number | null;
  floor_count: number | null;
  year_built: number | null;
  is_furnished: boolean | null;
  has_common_expenses: boolean | null;
  common_expenses_clp: number | null;
  address: string | null;
  commune_id: number | null;
  commune_name?: string;
  region_name?: string;
  sector: string | null;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  image_count: number;
  primary_source: Source;
  primary_source_url: string;
  primary_external_id: string;
  content_hash: string;
  fingerprint: string;
  source_count: number;
  is_active: boolean;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface PropertySource {
  id: string;
  property_id: string;
  source: Source;
  external_id: string;
  source_url: string;
  source_price_clp: number | null;
  source_price_uf: number | null;
  last_checked_at: string;
  is_active: boolean;
}

export interface PriceHistory {
  id: string;
  property_id: string;
  source: string;
  price_clp: number | null;
  price_uf: number | null;
  recorded_at: string;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  original_url: string;
  storage_path: string | null;
  position: number;
  width: number | null;
  height: number | null;
}

export type Operation = 'arriendo' | 'venta';
export type PropertyType = 'departamento' | 'casa' | 'terreno' | 'parcela' | 'oficina' | 'local-comercial' | 'bodega' | 'estacionamiento';
export type Source = 'portalinmobiliario' | 'mercadolibre' | 'toctoc' | 'yapo';

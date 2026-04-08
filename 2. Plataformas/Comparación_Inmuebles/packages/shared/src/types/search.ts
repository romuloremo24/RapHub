import type { Operation, PropertyType } from './property';

export interface SearchFilters {
  q?: string;
  operation?: Operation;
  property_type?: PropertyType;
  commune_slug?: string;
  region_slug?: string;
  price_min?: number;
  price_max?: number;
  price_currency?: 'CLP' | 'UF';
  bedrooms_min?: number;
  bathrooms_min?: number;
  area_min?: number;
  area_max?: number;
  parking_min?: number;
  is_furnished?: boolean;
  year_built_min?: number;
  sort_by?: 'price_asc' | 'price_desc' | 'newest' | 'area_desc' | 'price_m2_asc' | 'price_m2_desc';
  page?: number;
  limit?: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  polygon?: [number, number][];
}

export interface SearchResult {
  properties: import('./property').Property[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface MapCluster {
  id: number;
  latitude: number;
  longitude: number;
  count: number;
  expansion_zoom: number;
}

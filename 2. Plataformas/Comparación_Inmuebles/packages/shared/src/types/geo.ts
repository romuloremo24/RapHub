export interface Region {
  id: number;
  name: string;
  slug: string;
  code: string;
}

export interface Commune {
  id: number;
  region_id: number;
  name: string;
  slug: string;
  avg_price_uf_m2: number | null;
  listing_count: number;
  centroid_lat: number | null;
  centroid_lng: number | null;
}

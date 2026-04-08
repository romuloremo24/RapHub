import { supabase } from './supabase';
import type { SearchFilters } from '@vesta/shared/types/search';
import type { Property } from '@vesta/shared/types/property';

export async function searchProperties(filters: SearchFilters) {
  let query = supabase
    .from('properties')
    .select('*, communes!inner(name, slug, regions!inner(name, slug))', { count: 'exact' })
    .eq('is_active', true);

  if (filters.operation) query = query.eq('operation', filters.operation);
  if (filters.property_type) query = query.eq('property_type', filters.property_type);
  if (filters.commune_slug) query = query.eq('communes.slug', filters.commune_slug);
  if (filters.bedrooms_min) query = query.gte('bedrooms', filters.bedrooms_min);
  if (filters.bathrooms_min) query = query.gte('bathrooms', filters.bathrooms_min);
  if (filters.area_min) query = query.gte('built_area_m2', filters.area_min);
  if (filters.area_max) query = query.lte('built_area_m2', filters.area_max);

  if (filters.price_currency === 'UF') {
    if (filters.price_min) query = query.gte('price_uf', filters.price_min);
    if (filters.price_max) query = query.lte('price_uf', filters.price_max);
  } else {
    if (filters.price_min) query = query.gte('price_clp', filters.price_min);
    if (filters.price_max) query = query.lte('price_clp', filters.price_max);
  }

  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    newest: { column: 'first_seen_at', ascending: false },
    price_asc: { column: 'price_uf', ascending: true },
    price_desc: { column: 'price_uf', ascending: false },
    price_m2_asc: { column: 'price_per_m2_uf', ascending: true },
    price_m2_desc: { column: 'price_per_m2_uf', ascending: false },
    area_desc: { column: 'built_area_m2', ascending: false },
  };
  const sort = sortMap[filters.sort_by ?? 'newest'];
  query = query.order(sort.column, { ascending: sort.ascending, nullsFirst: false });

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 24;
  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  const properties: Property[] = (data ?? []).map((row: Record<string, unknown>) => {
    const commune = row.communes as { name: string; slug: string; regions: { name: string; slug: string } } | null;
    return {
      ...row,
      commune_name: commune?.name,
      region_name: commune?.regions?.name,
    } as Property;
  });

  return {
    properties,
    total: count ?? 0,
    page,
    limit,
    has_more: (count ?? 0) > from + limit,
  };
}

export async function getProperty(slug: string): Promise<Property | null> {
  const { data, error } = await supabase
    .from('properties')
    .select('*, communes(name, slug, regions(name, slug)), property_sources(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;

  const commune = data.communes as { name: string; slug: string; regions: { name: string; slug: string } } | null;
  return {
    ...data,
    commune_name: commune?.name,
    region_name: commune?.regions?.name,
  } as Property;
}

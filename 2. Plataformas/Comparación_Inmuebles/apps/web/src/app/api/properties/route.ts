import { NextRequest, NextResponse } from 'next/server';
import { searchProperties } from '@/lib/properties';
import type { SearchFilters } from '@vesta/shared/types/search';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const filters: SearchFilters = {
    operation: sp.get('op') as SearchFilters['operation'] ?? undefined,
    property_type: sp.get('tipo') as SearchFilters['property_type'] ?? undefined,
    commune_slug: sp.get('comuna') ?? undefined,
    price_min: sp.has('precio_min') ? Number(sp.get('precio_min')) : undefined,
    price_max: sp.has('precio_max') ? Number(sp.get('precio_max')) : undefined,
    price_currency: (sp.get('moneda') as 'CLP' | 'UF') ?? 'UF',
    bedrooms_min: sp.has('dormitorios') ? Number(sp.get('dormitorios')) : undefined,
    sort_by: sp.get('orden') as SearchFilters['sort_by'] ?? 'newest',
    page: sp.has('pagina') ? Number(sp.get('pagina')) : 1,
    limit: Math.min(Number(sp.get('limit') ?? 24), 100),
  };

  if (sp.has('bounds')) {
    const [south, west, north, east] = sp.get('bounds')!.split(',').map(Number);
    filters.bounds = { south, west, north, east };
  }

  const result = await searchProperties(filters);
  return NextResponse.json(result);
}

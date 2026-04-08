import { Suspense } from 'react';
import { SearchFilters } from '@/components/search-filters';
import { PropertyList } from '@/components/property-list';
import { PropertyMap } from '@/components/property-map';
import { searchProperties } from '@/lib/properties';
import type { SearchFilters as Filters } from '@vesta/shared/types/search';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters: Filters = {
    operation: (params.op as Filters['operation']) ?? 'arriendo',
    property_type: params.tipo as Filters['property_type'],
    commune_slug: params.comuna as string,
    price_min: params.precio_min ? Number(params.precio_min) : undefined,
    price_max: params.precio_max ? Number(params.precio_max) : undefined,
    price_currency: (params.moneda as 'CLP' | 'UF') ?? 'UF',
    bedrooms_min: params.dormitorios ? Number(params.dormitorios) : undefined,
    sort_by: (params.orden as Filters['sort_by']) ?? 'newest',
    page: params.pagina ? Number(params.pagina) : 1,
    limit: 24,
  };

  const result = await searchProperties(filters);

  return (
    <div className="mx-auto max-w-screen-2xl">
      <SearchFilters current={filters} />
      <div className="flex flex-col lg:flex-row">
        <div className="w-full lg:w-[55%] xl:w-[60%] overflow-y-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          }>
            <PropertyList properties={result.properties} total={result.total} page={filters.page!} hasMore={result.has_more} />
          </Suspense>
        </div>
        <div className="hidden lg:block lg:w-[45%] xl:w-[40%] sticky top-16 h-[calc(100vh-4rem)]">
          <div className="h-full p-3 pl-0">
            <div className="h-full overflow-hidden rounded-2xl border border-border-light shadow-card">
              <PropertyMap properties={result.properties} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

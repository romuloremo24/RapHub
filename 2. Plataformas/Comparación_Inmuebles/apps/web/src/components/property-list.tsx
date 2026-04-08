import type { Property } from '@vesta/shared/types/property';
import { PropertyCard } from './property-card';
import { ChevronLeft, ChevronRight, SearchX } from 'lucide-react';

interface PropertyListProps {
  properties: Property[];
  total: number;
  page: number;
  hasMore: boolean;
}

export function PropertyList({ properties, total, page, hasMore }: PropertyListProps) {
  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-alt mb-4">
          <SearchX size={28} className="text-text-muted" />
        </div>
        <p className="text-lg font-semibold text-primary">Sin resultados</p>
        <p className="mt-1.5 max-w-sm text-sm text-text-muted">
          No encontramos propiedades con estos filtros. Prueba ampliando tu búsqueda.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-text-secondary">
          <span className="text-primary font-bold">{total.toLocaleString('es-CL')}</span> propiedades
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
        {properties.map((p) => (
          <PropertyCard key={p.id} property={p} />
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-8 flex items-center justify-center gap-3">
        {page > 1 && (
          <a
            href={`?pagina=${page - 1}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-medium text-text-secondary shadow-sm transition-all hover:border-accent hover:text-accent hover:shadow-card-hover"
          >
            <ChevronLeft size={16} /> Anterior
          </a>
        )}
        <span className="rounded-full bg-accent/10 px-4 py-2 text-sm font-bold text-accent">
          {page}
        </span>
        {hasMore && (
          <a
            href={`?pagina=${page + 1}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-medium text-text-secondary shadow-sm transition-all hover:border-accent hover:text-accent hover:shadow-card-hover"
          >
            Siguiente <ChevronRight size={16} />
          </a>
        )}
      </div>
    </div>
  );
}

import Image from 'next/image';
import { BedDouble, Bath, Maximize, MapPin } from 'lucide-react';
import type { Property } from '@vesta/shared/types/property';
import { SOURCES } from '@vesta/shared/constants/properties';
import { formatUF, formatCLP, formatArea } from '@/lib/format';

export function PropertyCard({ property }: { property: Property }) {
  const imageUrl = property.images?.[0];
  const source = SOURCES.find((s) => s.value === property.primary_source);

  return (
    <a
      href={`/propiedad/${property.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-border-light shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-alt">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={property.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-text-muted">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-30">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Source badge */}
        {source && (
          <div className="absolute left-3 top-3">
            <span className="inline-flex items-center rounded-lg bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold shadow-sm"
              style={{ color: source.color }}>
              {source.label}
            </span>
          </div>
        )}

        {/* Multi-source badge */}
        {property.source_count > 1 && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-lg bg-accent/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              {property.source_count} fuentes
            </span>
          </div>
        )}

        {/* Operation tag */}
        <div className="absolute left-3 bottom-3">
          <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide shadow-sm backdrop-blur-sm ${
            property.operation === 'arriendo'
              ? 'bg-emerald-500/90 text-white'
              : 'bg-blue-500/90 text-white'
          }`}>
            {property.operation}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight text-primary">
            {property.price_uf ? formatUF(property.price_uf) : property.price_clp ? formatCLP(property.price_clp) : 'Consultar'}
          </span>
          {property.operation === 'arriendo' && (
            <span className="text-sm text-text-muted font-medium">/mes</span>
          )}
        </div>
        {property.price_per_m2_uf != null && property.price_per_m2_uf > 0 && (
          <span className="text-xs text-text-muted mt-0.5">
            {formatUF(property.price_per_m2_uf)}/m²
          </span>
        )}

        {/* Title */}
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-text-secondary group-hover:text-accent transition-colors">
          {property.title}
        </h3>

        {/* Location */}
        {(property.commune_name || property.address) && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-text-muted">
            <MapPin size={12} className="shrink-0 text-accent" />
            <span className="truncate">
              {property.commune_name}{property.sector ? ` · ${property.sector}` : ''}
            </span>
          </p>
        )}

        {/* Features bar */}
        <div className="mt-3 flex items-center gap-4 border-t border-border-light pt-3 text-xs font-medium text-text-secondary">
          {property.bedrooms != null && (
            <span className="flex items-center gap-1.5">
              <BedDouble size={14} className="text-text-muted" />
              {property.bedrooms} <span className="text-text-muted hidden sm:inline">dorm.</span>
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1.5">
              <Bath size={14} className="text-text-muted" />
              {property.bathrooms} <span className="text-text-muted hidden sm:inline">baño{property.bathrooms > 1 ? 's' : ''}</span>
            </span>
          )}
          {property.built_area_m2 != null && (
            <span className="flex items-center gap-1.5">
              <Maximize size={14} className="text-text-muted" />
              {formatArea(property.built_area_m2)}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

import { notFound } from 'next/navigation';
import Image from 'next/image';
import { BedDouble, Bath, Maximize, MapPin, Car, Calendar, ExternalLink, ArrowLeft, Tag } from 'lucide-react';
import { getProperty } from '@/lib/properties';
import { formatUF, formatCLP, formatArea } from '@/lib/format';
import { SOURCES } from '@vesta/shared/constants/properties';
import { PropertyDetailMap } from '@/components/property-detail-map';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) return { title: 'Propiedad no encontrada — Vesta' };
  return {
    title: `${property.title} — Vesta`,
    description: `${property.operation === 'arriendo' ? 'Arriendo' : 'Venta'} ${property.property_type} en ${property.commune_name ?? 'Chile'}. ${property.price_uf ? formatUF(property.price_uf) : ''}`,
  };
}

export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) notFound();

  const source = SOURCES.find((s) => s.value === property.primary_source);

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-8">
      {/* Back */}
      <a href="/" className="mb-6 inline-flex items-center gap-2 rounded-full bg-white border border-border-light px-4 py-2 text-sm font-medium text-text-secondary shadow-sm transition-all hover:border-accent hover:text-accent hover:shadow-card-hover">
        <ArrowLeft size={16} /> Volver
      </a>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Images + Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Image gallery */}
          <div className="grid gap-2">
            {property.images.length > 0 ? (
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-surface-alt shadow-card">
                <Image
                  src={property.images[0]}
                  alt={property.title}
                  fill
                  className="object-cover"
                  priority
                />
                {/* Operation badge on image */}
                <div className="absolute left-4 top-4">
                  <span className={`inline-flex rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow-sm backdrop-blur-sm ${
                    property.operation === 'arriendo'
                      ? 'bg-emerald-500/90 text-white'
                      : 'bg-blue-500/90 text-white'
                  }`}>
                    {property.operation}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center rounded-2xl bg-surface-alt text-text-muted">
                Sin imágenes disponibles
              </div>
            )}
            {property.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {property.images.slice(1, 5).map((img, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-surface-alt">
                    <Image src={img} alt="" fill className="object-cover" sizes="150px" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Title + Location */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">{property.title}</h1>
            {(property.commune_name || property.address) && (
              <p className="mt-2 flex items-center gap-2 text-text-secondary">
                <MapPin size={16} className="text-accent shrink-0" />
                {property.address ?? property.commune_name}
                {property.region_name ? ` · ${property.region_name}` : ''}
              </p>
            )}
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {property.bedrooms != null && (
              <FeatureBox icon={<BedDouble size={22} />} label="Dormitorios" value={String(property.bedrooms)} />
            )}
            {property.bathrooms != null && (
              <FeatureBox icon={<Bath size={22} />} label="Baños" value={String(property.bathrooms)} />
            )}
            {property.built_area_m2 != null && (
              <FeatureBox icon={<Maximize size={22} />} label="Superficie" value={formatArea(property.built_area_m2)} />
            )}
            {property.parking_spots != null && (
              <FeatureBox icon={<Car size={22} />} label="Estacionamientos" value={String(property.parking_spots)} />
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div className="rounded-2xl bg-white border border-border-light p-6 shadow-card">
              <h2 className="mb-3 text-lg font-bold text-primary">Descripción</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                {property.description}
              </p>
            </div>
          )}

          {/* Map */}
          {property.latitude && property.longitude && (
            <div>
              <h2 className="mb-3 text-lg font-bold text-primary">Ubicación</h2>
              <div className="h-80 overflow-hidden rounded-2xl border border-border-light shadow-card">
                <PropertyDetailMap lat={property.latitude} lng={property.longitude} />
              </div>
            </div>
          )}
        </div>

        {/* Right: Price sidebar */}
        <div>
          <div className="rounded-2xl border border-border-light bg-white p-6 shadow-card sticky top-24">
            {/* Price section */}
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {property.operation === 'arriendo' ? 'Arriendo mensual' : 'Precio de venta'}
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-primary">
                {property.price_uf ? formatUF(property.price_uf) : 'Consultar'}
              </p>
              {property.price_clp != null && (
                <p className="mt-0.5 text-sm text-text-muted">{formatCLP(property.price_clp)}</p>
              )}
              {property.price_per_m2_uf != null && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-accent-subtle px-3 py-1.5">
                  <Tag size={12} className="text-accent" />
                  <span className="text-xs font-semibold text-accent">{formatUF(property.price_per_m2_uf)}/m²</span>
                </div>
              )}
              {property.common_expenses_clp != null && (
                <p className="mt-2 text-xs text-text-muted">
                  + {formatCLP(property.common_expenses_clp)} gastos comunes
                </p>
              )}
            </div>

            {/* CTA */}
            <a
              href={property.primary_source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-accent-light hover:shadow-card-hover"
            >
              <ExternalLink size={16} />
              Ver en {source?.label ?? 'fuente original'}
            </a>

            {/* Meta info */}
            <div className="mt-5 space-y-2 border-t border-border-light pt-5">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Calendar size={13} className="shrink-0" />
                <span>Publicado {new Date(property.first_seen_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Calendar size={13} className="shrink-0" />
                <span>Actualizado {new Date(property.last_seen_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              {source && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: source.color }} />
                  <span className="text-text-secondary font-medium">{source.label}</span>
                </div>
              )}
              {property.source_count > 1 && (
                <p className="text-xs font-bold text-accent">
                  Disponible en {property.source_count} portales
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border-light bg-white p-4 text-center shadow-card transition-shadow hover:shadow-card-hover">
      <span className="text-accent">{icon}</span>
      <span className="mt-2 text-xl font-bold text-primary">{value}</span>
      <span className="mt-0.5 text-xs font-medium text-text-muted">{label}</span>
    </div>
  );
}

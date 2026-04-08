import Link from 'next/link'
import { MapPin, Route, Star } from 'lucide-react'
import type { Zona } from '@/lib/types'
import { ClimbTypeIcon } from './ClimbTypeIcon'
import { GradeTag } from './GradeTag'
import { cn } from '@/lib/utils'

interface ZonaCardProps {
  zona: Zona
  regionSlug: string
  highlighted?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function ZonaCard({ zona, regionSlug, highlighted, onMouseEnter, onMouseLeave }: ZonaCardProps) {
  return (
    <Link
      href={`/zonas/${regionSlug}/${zona.slug}`}
      className={cn(
        'block rounded-lg border border-gris bg-roca-light p-4 transition-all hover:border-naranja/50 hover:bg-gris/30',
        highlighted && 'border-naranja bg-gris/30'
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-heading text-lg font-semibold text-nieve">
            {zona.nombre}
          </h3>
          <div className="mt-1 flex items-center gap-1 text-sm text-nieve-dim">
            <MapPin size={14} />
            <span>{zona.ciudad_referencia ?? 'Chile'}</span>
            {zona.tipo_roca && (
              <>
                <span className="mx-1">·</span>
                <span>{zona.tipo_roca}</span>
              </>
            )}
          </div>
        </div>
        {zona.estrellas != null && zona.estrellas > 0 && (
          <div className="flex items-center gap-0.5 text-naranja">
            <Star size={14} fill="currentColor" />
            <span className="text-sm font-medium">{zona.estrellas.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {zona.tipos.map(t => (
          <ClimbTypeIcon key={t} type={t} showLabel size={14} />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex items-center gap-1 text-sm text-nieve-dim">
          <Route size={14} />
          <span>{zona.num_vias} vías</span>
        </div>
        {zona.grado_min && zona.grado_max && (
          <div className="flex items-center gap-1">
            <GradeTag grade={zona.grado_min} />
            <span className="text-nieve-dim">–</span>
            <GradeTag grade={zona.grado_max} />
          </div>
        )}
      </div>

      {zona.descripcion_corta && (
        <p className="mt-2 line-clamp-2 text-sm text-nieve-dim">
          {zona.descripcion_corta}
        </p>
      )}
    </Link>
  )
}

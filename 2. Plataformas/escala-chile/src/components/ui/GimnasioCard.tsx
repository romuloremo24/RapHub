import { MapPin, ExternalLink, Instagram } from 'lucide-react'
import type { Gimnasio } from '@/lib/types'
import { formatPrice, cn } from '@/lib/utils'

interface GimnasioCardProps {
  gimnasio: Gimnasio
  highlighted?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

const wallTypeLabels: Record<string, string> = {
  boulder: 'Boulder',
  lead: 'Lead',
  'top-rope': 'Top Rope',
  'auto-belay': 'Auto Belay',
  exterior: 'Exterior',
}

export function GimnasioCard({ gimnasio, highlighted, onMouseEnter, onMouseLeave }: GimnasioCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gris bg-roca-light p-4 transition-all hover:border-naranja/50 hover:bg-gris/30',
        highlighted && 'border-naranja bg-gris/30'
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <h3 className="font-heading text-lg font-semibold text-nieve">{gimnasio.nombre}</h3>
      <div className="mt-1 flex items-center gap-1 text-sm text-nieve-dim">
        <MapPin size={14} />
        <span>{gimnasio.direccion ?? gimnasio.ciudad}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {gimnasio.tipos.map(t => (
          <span key={t} className="rounded bg-gris px-2 py-0.5 text-xs text-nieve-dim">
            {wallTypeLabels[t] ?? t}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm">
        {gimnasio.precio_dia != null && (
          <div>
            <span className="text-nieve-dim">Día: </span>
            <span className="font-medium text-naranja">{formatPrice(gimnasio.precio_dia)}</span>
          </div>
        )}
        {gimnasio.precio_mensual != null && (
          <div>
            <span className="text-nieve-dim">Mes: </span>
            <span className="font-medium text-nieve">{formatPrice(gimnasio.precio_mensual)}</span>
          </div>
        )}
      </div>

      {gimnasio.descripcion && (
        <p className="mt-2 line-clamp-2 text-sm text-nieve-dim">{gimnasio.descripcion}</p>
      )}

      <div className="mt-3 flex items-center gap-3">
        {gimnasio.web && (
          <a
            href={`https://${gimnasio.web}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-naranja hover:text-naranja-light"
          >
            <ExternalLink size={14} />
            Web
          </a>
        )}
        {gimnasio.instagram && (
          <a
            href={`https://instagram.com/${gimnasio.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-naranja hover:text-naranja-light"
          >
            <Instagram size={14} />
            @{gimnasio.instagram}
          </a>
        )}
      </div>
    </div>
  )
}

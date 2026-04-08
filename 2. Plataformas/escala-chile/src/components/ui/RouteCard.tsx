import type { Via } from '@/lib/types'
import { ClimbTypeIcon } from './ClimbTypeIcon'
import { GradeTag } from './GradeTag'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RouteCardProps {
  via: Via
  index: number
  highlighted?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onClick?: () => void
}

export function RouteCard({ via, index, highlighted, onMouseEnter, onMouseLeave, onClick }: RouteCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded px-3 py-2 transition-colors',
        highlighted ? 'bg-naranja/10' : 'hover:bg-gris/30',
        onClick && 'cursor-pointer'
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <span className="w-6 text-center text-sm font-medium text-nieve-dim">{index}</span>
      <span className="min-w-0 flex-1 truncate font-medium text-nieve">{via.nombre}</span>
      <GradeTag grade={via.grado_hueco ?? via.grado} />
      <ClimbTypeIcon type={via.tipo} size={14} />
      {via.largo && <span className="text-sm text-nieve-dim">{via.largo}m</span>}
      {via.estrellas != null && via.estrellas > 0 && (
        <div className="flex items-center gap-0.5 text-naranja">
          {Array.from({ length: via.estrellas }, (_, i) => (
            <Star key={i} size={12} fill="currentColor" />
          ))}
        </div>
      )}
    </div>
  )
}

import { Mountain, Anchor, Snowflake, ArrowUpDown, Cable, Pickaxe } from 'lucide-react'
import type { ClimbType } from '@/lib/types'
import { cn } from '@/lib/utils'

const iconMap: Record<ClimbType, { icon: typeof Mountain; label: string }> = {
  deportiva: { icon: Cable, label: 'Deportiva' },
  boulder: { icon: Mountain, label: 'Boulder' },
  trad: { icon: Anchor, label: 'Trad' },
  hielo: { icon: Snowflake, label: 'Hielo' },
  mixta: { icon: Pickaxe, label: 'Mixta' },
  multipitch: { icon: ArrowUpDown, label: 'Multilargo' },
}

interface ClimbTypeIconProps {
  type: ClimbType
  size?: number
  showLabel?: boolean
  className?: string
}

export function ClimbTypeIcon({ type, size = 16, showLabel = false, className }: ClimbTypeIconProps) {
  const { icon: Icon, label } = iconMap[type] ?? iconMap.deportiva
  return (
    <span className={cn('inline-flex items-center gap-1', className)} title={label}>
      <Icon size={size} />
      {showLabel && <span className="text-xs text-nieve-dim">{label}</span>}
    </span>
  )
}

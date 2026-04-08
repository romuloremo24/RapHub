'use client'

import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import type { ClimbType } from '@/lib/types'
import type { Region } from '@/lib/types'
import { GRADE_ORDER } from '@/lib/grades'
import { cn } from '@/lib/utils'

export interface FilterState {
  region: number | null
  tipos: ClimbType[]
  gradoMin: string
  gradoMax: string
  busqueda: string
}

interface FilterBarProps {
  regions: Region[]
  filters: FilterState
  onChange: (filters: FilterState) => void
  className?: string
}

const CLIMB_TYPES: { value: ClimbType; label: string }[] = [
  { value: 'deportiva', label: 'Deportiva' },
  { value: 'boulder', label: 'Boulder' },
  { value: 'trad', label: 'Trad' },
  { value: 'hielo', label: 'Hielo' },
  { value: 'multipitch', label: 'Multilargo' },
]

const GRADE_OPTIONS = ['', '4a', '5a', '5c', '6a', '6b', '6c', '7a', '7b', '7c', '8a', '8b', '9a']

export const INITIAL_FILTERS: FilterState = {
  region: null,
  tipos: [],
  gradoMin: '',
  gradoMax: '',
  busqueda: '',
}

export function FilterBar({ regions, filters, onChange, className }: FilterBarProps) {
  const [open, setOpen] = useState(false)

  const hasActiveFilters =
    filters.region !== null ||
    filters.tipos.length > 0 ||
    filters.gradoMin !== '' ||
    filters.gradoMax !== '' ||
    filters.busqueda !== ''

  function toggleTipo(tipo: ClimbType) {
    const next = filters.tipos.includes(tipo)
      ? filters.tipos.filter(t => t !== tipo)
      : [...filters.tipos, tipo]
    onChange({ ...filters, tipos: next })
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Buscar zona..."
          value={filters.busqueda}
          onChange={e => onChange({ ...filters, busqueda: e.target.value })}
          className="flex-1 rounded-lg border border-gris bg-roca-light px-3 py-2 text-sm text-nieve placeholder:text-gris-light focus:border-naranja focus:outline-none"
        />
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors',
            hasActiveFilters
              ? 'border-naranja bg-naranja/10 text-naranja'
              : 'border-gris text-nieve-dim hover:border-nieve-dim'
          )}
        >
          <Filter size={16} />
          Filtros
        </button>
        {hasActiveFilters && (
          <button
            onClick={() => onChange(INITIAL_FILTERS)}
            className="flex items-center gap-1 text-sm text-nieve-dim hover:text-nieve"
          >
            <X size={14} />
            Limpiar
          </button>
        )}
      </div>

      {open && (
        <div className="rounded-lg border border-gris bg-roca-light p-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-nieve-dim">Región</label>
            <select
              value={filters.region ?? ''}
              onChange={e => onChange({ ...filters, region: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded border border-gris bg-roca px-2 py-1.5 text-sm text-nieve focus:border-naranja focus:outline-none"
            >
              <option value="">Todas las regiones</option>
              {regions.map(r => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-nieve-dim">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {CLIMB_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleTipo(value)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    filters.tipos.includes(value)
                      ? 'border-naranja bg-naranja/10 text-naranja'
                      : 'border-gris text-nieve-dim hover:border-nieve-dim'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-nieve-dim">Grado mínimo</label>
              <select
                value={filters.gradoMin}
                onChange={e => onChange({ ...filters, gradoMin: e.target.value })}
                className="w-full rounded border border-gris bg-roca px-2 py-1.5 text-sm text-nieve focus:border-naranja focus:outline-none"
              >
                <option value="">Sin mínimo</option>
                {GRADE_OPTIONS.filter(g => g).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-nieve-dim">Grado máximo</label>
              <select
                value={filters.gradoMax}
                onChange={e => onChange({ ...filters, gradoMax: e.target.value })}
                className="w-full rounded border border-gris bg-roca px-2 py-1.5 text-sm text-nieve focus:border-naranja focus:outline-none"
              >
                <option value="">Sin máximo</option>
                {GRADE_OPTIONS.filter(g => g).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

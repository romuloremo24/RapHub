'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { Zona, Region } from '@/lib/types'
import { ZonaCard } from '@/components/ui/ZonaCard'
import { FilterBar, INITIAL_FILTERS, type FilterState } from '@/components/ui/FilterBar'
import { compareGrades, GRADE_ORDER } from '@/lib/grades'

const ZonasMap = dynamic(() => import('@/components/map/ZonasMap').then(m => m.ZonasMap), { ssr: false })

const regionSlugMap: Record<number, string> = {}

interface ZonasPageClientProps {
  zonas: Zona[]
  regiones: Region[]
}

export function ZonasPageClient({ zonas, regiones }: ZonasPageClientProps) {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  // Build region slug map
  regiones.forEach(r => { regionSlugMap[r.id] = r.slug })

  const filteredZonas = useMemo(() => {
    return zonas.filter(z => {
      if (filters.region !== null && z.region_id !== filters.region) return false
      if (filters.tipos.length > 0 && !z.tipos.some(t => filters.tipos.includes(t))) return false
      if (filters.gradoMin && z.grado_max) {
        if (compareGrades(z.grado_max, filters.gradoMin) < 0) return false
      }
      if (filters.gradoMax && z.grado_min) {
        if (compareGrades(z.grado_min, filters.gradoMax) > 0) return false
      }
      if (filters.busqueda) {
        const q = filters.busqueda.toLowerCase()
        if (
          !z.nombre.toLowerCase().includes(q) &&
          !(z.ciudad_referencia?.toLowerCase().includes(q)) &&
          !(z.tipo_roca?.toLowerCase().includes(q))
        ) return false
      }
      return true
    })
  }, [zonas, filters])

  function getRegionSlug(regionId: number) {
    return regionSlugMap[regionId] ?? 'chile'
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-4 font-heading text-3xl font-bold">Zonas de Escalada</h1>
      <FilterBar regions={regiones} filters={filters} onChange={setFilters} className="mb-4" />

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Mapa */}
        <div className="h-[400px] overflow-hidden rounded-lg border border-gris lg:h-[calc(100vh-16rem)] lg:w-3/5 lg:sticky lg:top-20">
          <ZonasMap
            zonas={filteredZonas}
            highlightedZonaId={highlightedId ?? undefined}
            onZonaHover={setHighlightedId}
          />
        </div>

        {/* Lista */}
        <div className="flex-1 space-y-3 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto">
          {filteredZonas.length === 0 ? (
            <p className="py-12 text-center text-nieve-dim">No se encontraron zonas con esos filtros.</p>
          ) : (
            filteredZonas.map(zona => (
              <ZonaCard
                key={zona.id}
                zona={zona}
                regionSlug={getRegionSlug(zona.region_id)}
                highlighted={zona.id === highlightedId}
                onMouseEnter={() => setHighlightedId(zona.id)}
                onMouseLeave={() => setHighlightedId(null)}
              />
            ))
          )}
          <p className="pb-4 text-center text-sm text-gris-light">
            {filteredZonas.length} zona{filteredZonas.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { Sector, Via, Topo, TopoCanvasData } from '@/lib/types'
import { RouteCard } from '@/components/ui/RouteCard'

const TopoViewer = dynamic(
  () => import('@/components/topo/TopoViewer').then(m => m.TopoViewer),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-lg bg-gris" /> }
)

interface Props {
  zona: { nombre: string; slug: string }
  sector: Sector
  vias: Via[]
  topos: Topo[]
  regionSlug: string
}

export function SectorClient({ zona, sector, vias, topos, regionSlug }: Props) {
  const [highlightedViaId, setHighlightedViaId] = useState<string | null>(null)
  const [selectedTopoIdx, setSelectedTopoIdx] = useState(0)

  const activeTopo = topos[selectedTopoIdx]

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link
        href={`/zonas/${regionSlug}/${zona.slug}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-nieve-dim hover:text-nieve"
      >
        <ChevronLeft size={16} />
        {zona.nombre}
      </Link>

      <h1 className="mb-1 font-heading text-3xl font-bold">{sector.nombre}</h1>
      {sector.orientacion && (
        <p className="mb-4 text-sm text-nieve-dim">Orientación: {sector.orientacion}</p>
      )}
      {sector.descripcion && (
        <p className="mb-6 text-sm leading-relaxed text-nieve-dim">{sector.descripcion}</p>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Topo viewer */}
        <div className="lg:w-3/5">
          {topos.length > 0 && activeTopo?.canvas_data ? (
            <>
              {topos.length > 1 && (
                <div className="mb-3 flex gap-2 overflow-x-auto">
                  {topos.map((topo, i) => (
                    <button
                      key={topo.id}
                      onClick={() => setSelectedTopoIdx(i)}
                      className={`shrink-0 rounded border px-3 py-1 text-sm ${
                        i === selectedTopoIdx
                          ? 'border-naranja bg-naranja/10 text-naranja'
                          : 'border-gris text-nieve-dim hover:border-nieve-dim'
                      }`}
                    >
                      {topo.titulo ?? `Topo ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
              <TopoViewer
                canvasData={activeTopo.canvas_data as TopoCanvasData}
                highlightedViaId={highlightedViaId ?? undefined}
                onViaHover={setHighlightedViaId}
              />
            </>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-gris bg-roca-light">
              <p className="text-sm text-nieve-dim">No hay topos disponibles para este sector.</p>
            </div>
          )}
        </div>

        {/* Vias list */}
        <div className="flex-1">
          <h2 className="mb-3 font-heading text-xl font-semibold">
            Vías ({vias.length})
          </h2>
          {vias.length === 0 ? (
            <p className="text-sm text-nieve-dim">No hay vías registradas.</p>
          ) : (
            <div className="divide-y divide-gris/30 rounded-lg border border-gris">
              {vias.map((via, i) => (
                <RouteCard
                  key={via.id}
                  via={via}
                  index={i + 1}
                  highlighted={via.id === highlightedViaId}
                  onMouseEnter={() => setHighlightedViaId(via.id)}
                  onMouseLeave={() => setHighlightedViaId(null)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

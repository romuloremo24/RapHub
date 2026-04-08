'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  MapPin,
  Route,
  Mountain as MountainIcon,
  Car,
  Calendar,
  Gem,
  Droplets,
  Tent,
} from 'lucide-react'
import type { Zona, Sector, Via } from '@/lib/types'
import { RouteCard } from '@/components/ui/RouteCard'
import { ClimbTypeIcon } from '@/components/ui/ClimbTypeIcon'
import { GradeTag } from '@/components/ui/GradeTag'
import { cn } from '@/lib/utils'

interface Props {
  zona: Zona
  sectores: Sector[]
  vias: Via[]
  regionSlug: string
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof Route; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gris bg-roca-light px-3 py-2">
      <Icon size={18} className="shrink-0 text-naranja" />
      <div>
        <p className="text-xs text-nieve-dim">{label}</p>
        <p className="text-sm font-medium text-nieve">{value}</p>
      </div>
    </div>
  )
}

export function ZonaDetailClient({ zona, sectores, vias, regionSlug }: Props) {
  const [openSector, setOpenSector] = useState<string | null>(sectores[0]?.id ?? null)

  const viasBySector = new Map<string, Via[]>()
  const viasWithoutSector: Via[] = []
  for (const via of vias) {
    if (via.sector_id) {
      const list = viasBySector.get(via.sector_id) ?? []
      list.push(via)
      viasBySector.set(via.sector_id, list)
    } else {
      viasWithoutSector.push(via)
    }
  }

  return (
    <div>
      {/* Hero Header */}
      <div className="relative flex min-h-[280px] items-end bg-gradient-to-br from-gris to-roca px-4 pb-8 pt-16">
        <div className="absolute inset-0 bg-gradient-to-t from-roca/90 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl">
          <Link
            href={`/zonas/${regionSlug}`}
            className="mb-3 inline-flex items-center gap-1 text-sm text-nieve-dim hover:text-nieve"
          >
            <ChevronLeft size={16} />
            Volver
          </Link>
          <h1 className="font-heading text-4xl font-bold">{zona.nombre}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 text-nieve-dim">
              <MapPin size={16} />
              {zona.ciudad_referencia ?? 'Chile'}
            </span>
            {zona.tipos.map(t => (
              <ClimbTypeIcon key={t} type={t} showLabel />
            ))}
            {zona.grado_min && zona.grado_max && (
              <span className="flex items-center gap-1">
                <GradeTag grade={zona.grado_min} />
                <span className="text-nieve-dim">–</span>
                <GradeTag grade={zona.grado_max} />
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <InfoCard icon={Route} label="Vías" value={`${zona.num_vias}`} />
          {zona.altitud && <InfoCard icon={MountainIcon} label="Altitud" value={`${zona.altitud} msnm`} />}
          {zona.acceso_dificultad && <InfoCard icon={Car} label="Acceso" value={zona.acceso_dificultad} />}
          {zona.temporada_recomendada && <InfoCard icon={Calendar} label="Temporada" value={zona.temporada_recomendada} />}
          {zona.tipo_roca && <InfoCard icon={Gem} label="Roca" value={zona.tipo_roca} />}
        </div>

        {/* Amenities */}
        <div className="mt-4 flex flex-wrap gap-3">
          {zona.camping && (
            <span className="flex items-center gap-1 text-sm text-verde-light">
              <Tent size={14} /> Camping
            </span>
          )}
          {zona.agua && (
            <span className="flex items-center gap-1 text-sm text-verde-light">
              <Droplets size={14} /> Agua
            </span>
          )}
        </div>

        {/* Description */}
        {zona.descripcion && (
          <p className="mt-4 text-sm leading-relaxed text-nieve-dim">{zona.descripcion}</p>
        )}
        {!zona.descripcion && zona.descripcion_corta && (
          <p className="mt-4 text-sm leading-relaxed text-nieve-dim">{zona.descripcion_corta}</p>
        )}

        {/* Access info */}
        {zona.acceso && (
          <div className="mt-4 rounded-lg border border-gris bg-roca-light p-4">
            <h3 className="mb-1 font-heading text-sm font-semibold">Acceso</h3>
            <p className="text-sm text-nieve-dim">{zona.acceso}</p>
          </div>
        )}

        {/* Sectors Accordion */}
        <h2 className="mb-4 mt-8 font-heading text-2xl font-bold">
          Sectores {sectores.length > 0 && `(${sectores.length})`}
        </h2>

        {sectores.length === 0 && viasWithoutSector.length === 0 && (
          <p className="py-8 text-center text-nieve-dim">No hay sectores ni vías registradas aún.</p>
        )}

        {sectores.map(sector => {
          const sectorVias = viasBySector.get(sector.id) ?? []
          const isOpen = openSector === sector.id
          return (
            <div key={sector.id} className="mb-2 rounded-lg border border-gris">
              <button
                onClick={() => setOpenSector(isOpen ? null : sector.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gris/20"
              >
                <div>
                  <span className="font-heading font-semibold">{sector.nombre}</span>
                  <span className="ml-2 text-sm text-nieve-dim">({sectorVias.length} vías)</span>
                </div>
                {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
              {isOpen && (
                <div className="border-t border-gris px-2 py-2">
                  {sector.orientacion && (
                    <p className="mb-2 px-3 text-xs text-nieve-dim">Orientación: {sector.orientacion}</p>
                  )}
                  {sectorVias.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-nieve-dim">Sin vías registradas.</p>
                  ) : (
                    <div className="divide-y divide-gris/30">
                      {sectorVias.map((via, i) => (
                        <RouteCard key={via.id} via={via} index={i + 1} />
                      ))}
                    </div>
                  )}
                  <Link
                    href={`/zonas/${regionSlug}/${zona.slug}/${sector.slug}`}
                    className="mt-2 flex items-center gap-1 px-3 py-2 text-sm text-naranja hover:text-naranja-light"
                  >
                    Ver sector completo
                    <ChevronRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          )
        })}

        {/* Routes without sector */}
        {viasWithoutSector.length > 0 && (
          <div className="mb-2 rounded-lg border border-gris">
            <div className="px-4 py-3">
              <span className="font-heading font-semibold">Vías sin sector</span>
              <span className="ml-2 text-sm text-nieve-dim">({viasWithoutSector.length})</span>
            </div>
            <div className="border-t border-gris px-2 py-2 divide-y divide-gris/30">
              {viasWithoutSector.map((via, i) => (
                <RouteCard key={via.id} via={via} index={i + 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

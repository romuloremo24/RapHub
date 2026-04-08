'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'
import type { Gimnasio } from '@/lib/types'
import { GimnasioCard } from '@/components/ui/GimnasioCard'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const GimnasiosMap = dynamic(
  () => import('@/components/map/GimnasiosMap').then(m => m.GimnasiosMap),
  { ssr: false }
)

interface Props {
  gimnasios: Gimnasio[]
}

export function GimnasiosPageClient({ gimnasios }: Props) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [ciudadFilter, setCiudadFilter] = useState('')
  const [maxPrecio, setMaxPrecio] = useState<number | null>(null)

  const ciudades = useMemo(() => {
    const set = new Set(gimnasios.map(g => g.ciudad))
    return Array.from(set).sort()
  }, [gimnasios])

  const filtered = useMemo(() => {
    return gimnasios.filter(g => {
      if (ciudadFilter && g.ciudad !== ciudadFilter) return false
      if (maxPrecio && g.precio_dia != null && g.precio_dia > maxPrecio) return false
      return true
    })
  }, [gimnasios, ciudadFilter, maxPrecio])

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="mb-4 font-heading text-3xl font-bold">Gimnasios de Escalada</h1>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              value={ciudadFilter}
              onChange={e => setCiudadFilter(e.target.value)}
              className="rounded-lg border border-gris bg-roca-light px-3 py-2 text-sm text-nieve focus:border-naranja focus:outline-none"
            >
              <option value="">Todas las ciudades</option>
              {ciudades.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={maxPrecio ?? ''}
              onChange={e => setMaxPrecio(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-gris bg-roca-light px-3 py-2 text-sm text-nieve focus:border-naranja focus:outline-none"
            >
              <option value="">Cualquier precio</option>
              <option value="5000">Hasta $5.000/día</option>
              <option value="6000">Hasta $6.000/día</option>
              <option value="7000">Hasta $7.000/día</option>
              <option value="8000">Hasta $8.000/día</option>
            </select>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="h-[400px] overflow-hidden rounded-lg border border-gris lg:h-[calc(100vh-16rem)] lg:w-3/5 lg:sticky lg:top-20">
              <GimnasiosMap
                gimnasios={filtered}
                highlightedId={highlightedId ?? undefined}
                onGimnasioHover={setHighlightedId}
              />
            </div>
            <div className="flex-1 space-y-3 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="py-12 text-center text-nieve-dim">No se encontraron gimnasios.</p>
              ) : (
                filtered.map(gym => (
                  <GimnasioCard
                    key={gym.id}
                    gimnasio={gym}
                    highlighted={gym.id === highlightedId}
                    onMouseEnter={() => setHighlightedId(gym.id)}
                    onMouseLeave={() => setHighlightedId(null)}
                  />
                ))
              )}
              <p className="pb-4 text-center text-sm text-gris-light">
                {filtered.length} gimnasio{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

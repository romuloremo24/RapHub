import { createServerComponentClient } from '@/lib/supabase-server'
import { ZonaCard } from '@/components/ui/ZonaCard'
import type { Zona, Region } from '@/lib/types'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface Props {
  params: Promise<{ region: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region: regionSlug } = await params
  const supabase = await createServerComponentClient()
  const { data: reg } = await supabase.from('regiones').select('nombre').eq('slug', regionSlug).single()
  if (!reg) return { title: 'Región no encontrada' }
  return {
    title: `Escalada en ${reg.nombre}`,
    description: `Zonas de escalada en la ${reg.nombre} de Chile. Deportiva, boulder, trad y más.`,
  }
}

export default async function RegionPage({ params }: Props) {
  const { region: regionSlug } = await params
  const supabase = await createServerComponentClient()

  const { data: reg } = await supabase
    .from('regiones')
    .select('*')
    .eq('slug', regionSlug)
    .single()

  if (!reg) notFound()

  const { data: zonas } = await supabase
    .from('zonas_with_coords')
    .select('*')
    .eq('region_id', reg.id)
    .eq('activa', true)
    .order('num_vias', { ascending: false })

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link href="/zonas" className="mb-4 inline-flex items-center gap-1 text-sm text-nieve-dim hover:text-nieve">
        <ChevronLeft size={16} />
        Todas las zonas
      </Link>
      <h1 className="mb-6 font-heading text-3xl font-bold">{reg.nombre}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(zonas as Zona[] ?? []).map(zona => (
          <ZonaCard key={zona.id} zona={zona} regionSlug={regionSlug} />
        ))}
      </div>
      {(!zonas || zonas.length === 0) && (
        <p className="py-12 text-center text-nieve-dim">No hay zonas registradas en esta región aún.</p>
      )}
    </div>
  )
}

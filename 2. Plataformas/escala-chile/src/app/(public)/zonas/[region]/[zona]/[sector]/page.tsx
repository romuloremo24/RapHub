import { createServerComponentClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SectorClient } from './SectorClient'
import type { Sector, Via, Topo } from '@/lib/types'

interface Props {
  params: Promise<{ region: string; zona: string; sector: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { zona: zonaSlug, sector: sectorSlug } = await params
  const supabase = await createServerComponentClient()

  const { data: zona } = await supabase.from('zonas').select('nombre').eq('slug', zonaSlug).single()
  const { data: sector } = await supabase
    .from('sectores')
    .select('nombre')
    .eq('slug', sectorSlug)
    .single()

  if (!zona || !sector) return { title: 'Sector no encontrado' }

  return {
    title: `${sector.nombre} — ${zona.nombre}`,
    description: `Topos y vías del sector ${sector.nombre} en ${zona.nombre}, Chile.`,
  }
}

export default async function SectorPage({ params }: Props) {
  const { region: regionSlug, zona: zonaSlug, sector: sectorSlug } = await params
  const supabase = await createServerComponentClient()

  const { data: zona } = await supabase.from('zonas').select('id, nombre, slug').eq('slug', zonaSlug).single()
  if (!zona) notFound()

  const { data: sector } = await supabase
    .from('sectores')
    .select('*')
    .eq('zona_id', zona.id)
    .eq('slug', sectorSlug)
    .single()
  if (!sector) notFound()

  const [{ data: vias }, { data: topos }] = await Promise.all([
    supabase.from('vias').select('*').eq('sector_id', sector.id).order('grado'),
    supabase.from('topos').select('*').eq('sector_id', sector.id).eq('activo', true).order('orden'),
  ])

  return (
    <SectorClient
      zona={{ nombre: zona.nombre, slug: zona.slug }}
      sector={sector as Sector}
      vias={(vias as Via[]) ?? []}
      topos={(topos as Topo[]) ?? []}
      regionSlug={regionSlug}
    />
  )
}

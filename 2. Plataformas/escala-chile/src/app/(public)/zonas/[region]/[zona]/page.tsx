import { createServerComponentClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ZonaDetailClient } from './ZonaDetailClient'
import type { Zona, Sector, Via } from '@/lib/types'

interface Props {
  params: Promise<{ region: string; zona: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { zona: zonaSlug } = await params
  const supabase = await createServerComponentClient()
  const { data: zona } = await supabase
    .from('zonas_with_coords')
    .select('nombre, descripcion_corta, tipos, num_vias, ciudad_referencia')
    .eq('slug', zonaSlug)
    .single()

  if (!zona) return { title: 'Zona no encontrada' }

  return {
    title: `${zona.nombre} — Escalada ${zona.tipos?.[0] ?? ''} en ${zona.ciudad_referencia ?? 'Chile'}`,
    description: zona.descripcion_corta ?? `${zona.num_vias} vías de escalada en ${zona.nombre}, Chile.`,
  }
}

export default async function ZonaPage({ params }: Props) {
  const { region: regionSlug, zona: zonaSlug } = await params
  const supabase = await createServerComponentClient()

  const { data: zona } = await supabase
    .from('zonas_with_coords')
    .select('*')
    .eq('slug', zonaSlug)
    .single()

  if (!zona) notFound()

  const [{ data: sectores }, { data: vias }] = await Promise.all([
    supabase
      .from('sectores')
      .select('*')
      .eq('zona_id', zona.id)
      .eq('activo', true)
      .order('orden'),
    supabase
      .from('vias')
      .select('*')
      .eq('zona_id', zona.id)
      .order('grado'),
  ])

  return (
    <ZonaDetailClient
      zona={zona as Zona}
      sectores={(sectores as Sector[]) ?? []}
      vias={(vias as Via[]) ?? []}
      regionSlug={regionSlug}
    />
  )
}

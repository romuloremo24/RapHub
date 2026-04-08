import { createServerComponentClient } from '@/lib/supabase-server'
import { ZonasPageClient } from './ZonasPageClient'
import type { Zona, Region } from '@/lib/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Zonas de Escalada en Chile',
  description:
    'Explora todas las zonas de escalada de Chile en un mapa interactivo. Deportiva, boulder, trad y hielo desde la Región Metropolitana hasta Aysén.',
}

export default async function ZonasPage() {
  const supabase = await createServerComponentClient()

  const [{ data: zonas }, { data: regiones }] = await Promise.all([
    supabase.from('zonas_with_coords').select('*').eq('activa', true).order('num_vias', { ascending: false }),
    supabase.from('regiones').select('*').order('numero'),
  ])

  return (
    <ZonasPageClient
      zonas={(zonas as Zona[]) ?? []}
      regiones={(regiones as Region[]) ?? []}
    />
  )
}

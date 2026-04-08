import { createServerComponentClient } from '@/lib/supabase-server'
import { GimnasiosPageClient } from './GimnasiosPageClient'
import type { Gimnasio } from '@/lib/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gimnasios de Escalada en Chile',
  description:
    'Directorio de gimnasios de escalada en Chile. Boulder, lead, top-rope. Encuentra el más cercano con precios y horarios.',
}

export default async function GimnasiosPage() {
  const supabase = await createServerComponentClient()

  const { data: gimnasios } = await supabase
    .from('gimnasios_with_coords')
    .select('*')
    .eq('activo', true)
    .order('nombre')

  return <GimnasiosPageClient gimnasios={(gimnasios as Gimnasio[]) ?? []} />
}

import { createServerComponentClient } from '@/lib/supabase-server'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerComponentClient()
  const baseUrl = 'https://escalachile.cl'

  const [{ data: zonas }, { data: regiones }, { data: gimnasios }] = await Promise.all([
    supabase.from('zonas').select('slug, region_id, updated_at').eq('activa', true),
    supabase.from('regiones').select('id, slug'),
    supabase.from('gimnasios').select('slug, updated_at').eq('activo', true),
  ])

  const regionMap = new Map((regiones ?? []).map(r => [r.id, r.slug]))

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/zonas`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/gimnasios`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ]

  const zonaPages: MetadataRoute.Sitemap = (zonas ?? []).map(z => ({
    url: `${baseUrl}/zonas/${regionMap.get(z.region_id) ?? 'chile'}/${z.slug}`,
    lastModified: z.updated_at ? new Date(z.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...zonaPages]
}

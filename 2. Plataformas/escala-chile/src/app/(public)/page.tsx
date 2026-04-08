import { createServerComponentClient } from '@/lib/supabase-server'
import { StatsCounter } from '@/components/home/StatsCounter'
import { HeroSearch } from '@/components/home/HeroSearch'
import { ZonaCard } from '@/components/ui/ZonaCard'
import { Mountain, Cable, Anchor, Snowflake } from 'lucide-react'
import Link from 'next/link'
import type { Zona, Region } from '@/lib/types'

export default async function HomePage() {
  const supabase = await createServerComponentClient()

  const [
    { count: zonasCount },
    { count: viasCount },
    { count: gimnasiosCount },
    { data: zonasDestacadas },
    { data: regiones },
  ] = await Promise.all([
    supabase.from('zonas').select('*', { count: 'exact', head: true }).eq('activa', true),
    supabase.from('vias').select('*', { count: 'exact', head: true }),
    supabase.from('gimnasios').select('*', { count: 'exact', head: true }).eq('activo', true),
    supabase
      .from('zonas_with_coords')
      .select('*')
      .eq('activa', true)
      .order('num_vias', { ascending: false })
      .limit(6),
    supabase.from('regiones').select('*').order('numero'),
  ])

  const regionMap = new Map((regiones as Region[] ?? []).map(r => [r.id, r]))

  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-roca via-roca/95 to-roca" />
        <div className="relative z-10">
          <h1 className="font-heading text-5xl font-extrabold leading-tight md:text-6xl">
            Toda la escalada de Chile,
            <br />
            <span className="text-naranja">en un solo lugar</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-nieve-dim">
            Zonas, vías, topos interactivos, gimnasios y comunidad. La guía más completa
            de escalada chilena.
          </p>
          <div className="mt-8">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gris bg-roca-light py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
          <StatsCounter end={zonasCount ?? 0} label="Zonas" suffix="+" />
          <StatsCounter end={viasCount ?? 0} label="Vías" suffix="+" />
          <StatsCounter end={gimnasiosCount ?? 0} label="Gimnasios" />
          <StatsCounter end={(regiones as Region[] ?? []).length} label="Regiones" />
        </div>
      </section>

      {/* Zonas Destacadas */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-heading text-2xl font-bold">Zonas Destacadas</h2>
          <Link href="/zonas" className="text-sm text-naranja hover:text-naranja-light">
            Ver todas →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(zonasDestacadas as Zona[] ?? []).map(zona => (
            <ZonaCard
              key={zona.id}
              zona={zona}
              regionSlug={regionMap.get(zona.region_id)?.slug ?? 'chile'}
            />
          ))}
        </div>
      </section>

      {/* Por Tipo */}
      <section className="border-t border-gris bg-roca-light py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-8 text-center font-heading text-2xl font-bold">Explora por tipo</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { tipo: 'deportiva', label: 'Deportiva', icon: Cable, color: 'text-naranja' },
              { tipo: 'boulder', label: 'Boulder', icon: Mountain, color: 'text-blue-500' },
              { tipo: 'trad', label: 'Tradicional', icon: Anchor, color: 'text-verde' },
              { tipo: 'hielo', label: 'Hielo / Mixta', icon: Snowflake, color: 'text-slate-300' },
            ].map(({ tipo, label, icon: Icon, color }) => (
              <Link
                key={tipo}
                href={`/zonas?tipo=${tipo}`}
                className="flex flex-col items-center gap-3 rounded-xl border border-gris bg-roca p-6 transition-all hover:border-naranja/50 hover:bg-gris/20"
              >
                <Icon size={40} className={color} />
                <span className="font-heading font-semibold">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-heading text-3xl font-bold">
            ¿Conoces una zona que no está?
          </h2>
          <p className="mt-3 text-nieve-dim">
            EscalaChile es un proyecto comunitario. Ayúdanos a completar la guía de
            escalada más completa de Chile.
          </p>
          <Link
            href="/zonas"
            className="mt-6 inline-block rounded-lg bg-naranja px-6 py-3 font-medium text-white transition-colors hover:bg-naranja-light"
          >
            Explorar zonas
          </Link>
        </div>
      </section>
    </div>
  )
}

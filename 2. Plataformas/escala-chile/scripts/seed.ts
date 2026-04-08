import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

// ─── Regiones ───
const regiones = [
  { numero: 15, nombre: 'Región de Arica y Parinacota', nombre_corto: 'XV', slug: 'arica-y-parinacota' },
  { numero: 1,  nombre: 'Región de Tarapacá', nombre_corto: 'I', slug: 'tarapaca' },
  { numero: 2,  nombre: 'Región de Antofagasta', nombre_corto: 'II', slug: 'antofagasta' },
  { numero: 3,  nombre: 'Región de Atacama', nombre_corto: 'III', slug: 'atacama' },
  { numero: 4,  nombre: 'Región de Coquimbo', nombre_corto: 'IV', slug: 'coquimbo' },
  { numero: 5,  nombre: 'Región de Valparaíso', nombre_corto: 'V', slug: 'valparaiso' },
  { numero: 13, nombre: 'Región Metropolitana', nombre_corto: 'RM', slug: 'metropolitana' },
  { numero: 6,  nombre: 'Región de O\'Higgins', nombre_corto: 'VI', slug: 'ohiggins' },
  { numero: 7,  nombre: 'Región del Maule', nombre_corto: 'VII', slug: 'maule' },
  { numero: 16, nombre: 'Región de Ñuble', nombre_corto: 'XVI', slug: 'nuble' },
  { numero: 8,  nombre: 'Región del Biobío', nombre_corto: 'VIII', slug: 'biobio' },
  { numero: 9,  nombre: 'Región de La Araucanía', nombre_corto: 'IX', slug: 'araucania' },
  { numero: 14, nombre: 'Región de Los Ríos', nombre_corto: 'XIV', slug: 'los-rios' },
  { numero: 10, nombre: 'Región de Los Lagos', nombre_corto: 'X', slug: 'los-lagos' },
  { numero: 11, nombre: 'Región de Aysén', nombre_corto: 'XI', slug: 'aysen' },
  { numero: 12, nombre: 'Región de Magallanes', nombre_corto: 'XII', slug: 'magallanes' },
]

// ─── Zonas ───
const zonasData = [
  {
    nombre: 'Las Palestras', slug: 'las-palestras', region_slug: 'metropolitana',
    lng: -70.38, lat: -33.60, tipos: ['deportiva'],
    tipo_roca: 'Toba volcánica', altitud: 1450,
    ciudad_referencia: 'Santiago', distancia_ciudad: '60 km sur-este, Cajón del Maipo',
    num_vias: 70, grado_min: '5a', grado_max: '7c',
    temporada_recomendada: 'Sept–Mayo', acceso_dificultad: 'fácil',
    camping: false, agua: false, estrellas: 4.2,
    descripcion_corta: 'El sector más emblemático de Santiago con 70+ rutas en toba volcánica, acceso en 2 min a pie desde el estacionamiento.',
  },
  {
    nombre: 'Torrecillas', slug: 'torrecillas', region_slug: 'metropolitana',
    lng: -70.36, lat: -33.59, tipos: ['multipitch', 'trad', 'deportiva'],
    tipo_roca: 'Toba volcánica', altitud: 1500,
    ciudad_referencia: 'Santiago', distancia_ciudad: '60 km sur-este, Cajón del Maipo',
    num_vias: 30, grado_min: '5b', grado_max: '7a',
    temporada_recomendada: 'Sept–Mayo', acceso_dificultad: 'moderado',
    camping: false, agua: false, estrellas: 4.0,
    descripcion_corta: 'Imponentes torres de toba con multilargos de hasta 350m. No recomendado para principiantes.',
  },
  {
    nombre: 'Los Trapenses', slug: 'los-trapenses', region_slug: 'metropolitana',
    lng: -70.554, lat: -33.349, tipos: ['deportiva'],
    tipo_roca: 'Volcánica', altitud: 980,
    ciudad_referencia: 'Santiago', distancia_ciudad: '20 km noreste, Las Condes',
    num_vias: 27, grado_min: '5b', grado_max: '7b+',
    temporada_recomendada: 'Todo el año', acceso_dificultad: 'fácil',
    camping: false, agua: false, estrellas: 3.5,
    descripcion_corta: '27 rutas en 6 sectores, muy cercano a Santiago. Buena opción para principiantes e intermedios.',
  },
  {
    nombre: 'Jurassic Park', slug: 'jurassic-park', region_slug: 'metropolitana',
    lng: -70.65, lat: -33.25, tipos: ['boulder'],
    tipo_roca: 'Granito', altitud: 700,
    ciudad_referencia: 'Santiago', distancia_ciudad: '35 km norte, Chicureo',
    num_vias: 57, grado_min: 'V1', grado_max: 'V12',
    temporada_recomendada: 'Abril–Octubre', acceso_dificultad: 'fácil',
    camping: false, agua: false, estrellas: 3.8,
    descripcion_corta: '57 problemas de boulder en granito desde V1 hasta V12. El sector de boulder más completo de Santiago.',
  },
  {
    nombre: 'Las Chilcas', slug: 'las-chilcas', region_slug: 'valparaiso',
    lng: -70.72, lat: -32.85, tipos: ['deportiva', 'multipitch', 'trad'],
    tipo_roca: 'Conglomerado', altitud: 620,
    ciudad_referencia: 'Santiago', distancia_ciudad: '80 km norte por Ruta 5',
    num_vias: 120, grado_min: '5b', grado_max: '8c+',
    temporada_recomendada: 'Todo el año', acceso_dificultad: 'fácil',
    camping: true, agua: false, estrellas: 4.5,
    descripcion_corta: 'El sector de escalada deportiva más duro de Chile. 120+ rutas hasta 8c+ en conglomerado.',
  },
  {
    nombre: 'Valle de los Cóndores', slug: 'valle-de-los-condores', region_slug: 'maule',
    lng: -70.68, lat: -35.57, tipos: ['deportiva', 'trad', 'multipitch'],
    tipo_roca: 'Basalto / Volcánica', altitud: 1800,
    ciudad_referencia: 'Talca', distancia_ciudad: '100 km este de Talca',
    num_vias: 450, grado_min: '5a', grado_max: '9a',
    temporada_recomendada: 'Oct–Abril', acceso_dificultad: 'difícil',
    camping: true, agua: true, estrellas: 4.8,
    descripcion_corta: 'El mayor destino de escalada de Chile con 450+ vías en 17 sectores. Primer 9a de Chile.',
  },
  {
    nombre: 'Valle Cochamó', slug: 'valle-cochamo', region_slug: 'los-lagos',
    lng: -72.30, lat: -41.50, tipos: ['trad', 'multipitch'],
    tipo_roca: 'Granito', altitud: 200,
    ciudad_referencia: 'Puerto Varas', distancia_ciudad: '100 km sur de Puerto Varas (4-6h a pie)',
    num_vias: 200, grado_min: '5b', grado_max: '8a',
    temporada_recomendada: 'Dic–Marzo', acceso_dificultad: 'muy difícil',
    camping: true, agua: true, estrellas: 4.9,
    descripcion_corta: '"El Yosemite de Sudamérica". Paredes de granito de hasta 1,000m. Acceso solo a pie (12km, 4-6h).',
  },
  {
    nombre: 'Villa Cerro Castillo', slug: 'villa-cerro-castillo', region_slug: 'aysen',
    lng: -72.18, lat: -46.10, tipos: ['deportiva'],
    tipo_roca: 'Basalto', altitud: 700,
    ciudad_referencia: 'Coyhaique', distancia_ciudad: '95 km sur de Coyhaique, Carretera Austral',
    num_vias: 200, grado_min: '5a', grado_max: '8b',
    temporada_recomendada: 'Nov–Marzo', acceso_dificultad: 'fácil',
    camping: true, agua: true, estrellas: 4.6,
    descripcion_corta: 'El epicentro actual de la escalada en Chile con 200+ rutas en basalto. A pasos del pueblo.',
  },
  {
    nombre: 'Muralla China', slug: 'muralla-china', region_slug: 'aysen',
    lng: -72.06, lat: -45.57, tipos: ['deportiva'],
    tipo_roca: 'Caliza', altitud: 800,
    ciudad_referencia: 'Coyhaique', distancia_ciudad: '15 km de Coyhaique',
    num_vias: 34, grado_min: '6a', grado_max: '8a+',
    temporada_recomendada: 'Oct–Abril', acceso_dificultad: 'fácil',
    camping: false, agua: false, estrellas: 4.3,
    descripcion_corta: 'La única zona de caliza de calidad en Chile. 34 vías comparables a zonas españolas y francesas.',
  },
]

// ─── Gimnasios ───
const gimnasiosData = [
  {
    nombre: 'BlocLab', slug: 'bloclab', ciudad: 'Providencia', region_slug: 'metropolitana',
    lng: -70.6159, lat: -33.4279, direccion: 'Pedro de Valdivia 1985',
    tipos: ['boulder'], area_m2: 600,
    precio_dia: 7500, precio_mensual: 65000,
    web: 'bloclab.cl', instagram: 'bloclab_climbing',
    descripcion: 'El mejor gimnasio de boulder de Santiago. 600m² en dos zonas, Kilter Board y Tension Board.',
    tiene_alquiler: true, tiene_cursos: true,
  },
  {
    nombre: 'Gimnasio El Muro', slug: 'gimnasio-el-muro', ciudad: 'La Reina', region_slug: 'metropolitana',
    lng: -70.5681, lat: -33.4549, direccion: 'Av. Larraín 6228',
    tipos: ['lead', 'boulder', 'top-rope'], altura_max: 13, area_m2: 450,
    precio_dia: 6000, precio_mensual: 55000,
    web: 'gimnasioelmuro.cl', instagram: 'elmuro.cl',
    descripcion: 'El más completo en lead con 13m de altura y 22 líneas de cuerda.',
    tiene_alquiler: true, tiene_cursos: true,
  },
  {
    nombre: 'Bhanga Climbing', slug: 'bhanga-climbing', ciudad: 'Peñalolén', region_slug: 'metropolitana',
    lng: -70.5546, lat: -33.4818, direccion: 'Consistorial 2100, Mall Alto Peñalolén',
    tipos: ['boulder', 'lead'],
    precio_dia: 6500, precio_mensual: 58000,
    web: 'bhanga.cl', instagram: 'bhangaclimbing',
    descripcion: 'El muro de boulder más alto de Chile. Dentro del Mall Alto Peñalolén.',
    tiene_alquiler: true, tiene_cursos: true,
  },
  {
    nombre: 'Hangar Boulder', slug: 'hangar-boulder', ciudad: 'San Miguel', region_slug: 'metropolitana',
    lng: -70.6584, lat: -33.5003, direccion: 'Alcalde Pedro Alarcón 750',
    tipos: ['boulder', 'lead'],
    precio_dia: 6000, precio_mensual: 52000,
    web: 'hangarboulder.cl', instagram: 'hangar.boulder',
    descripcion: 'Excelente muro de boulder y deportiva en San Miguel. Buena relación precio-calidad.',
    tiene_alquiler: true, tiene_cursos: true,
  },
  {
    nombre: 'Casa Boulder', slug: 'casa-boulder', ciudad: 'Providencia', region_slug: 'metropolitana',
    lng: -70.6266, lat: -33.4367, direccion: 'Av. Italia 875',
    tipos: ['boulder'],
    precio_dia: 5500, precio_mensual: 48000,
    web: 'casaboulder.cl', instagram: 'gimnasiocasaboulder',
    tiene_alquiler: true, tiene_cursos: true,
  },
  {
    nombre: 'IronWall', slug: 'ironwall', ciudad: 'Las Condes', region_slug: 'metropolitana',
    lng: -70.5702, lat: -33.4059, direccion: 'Av. Pdte. Riesco 5330, nivel -2',
    tipos: ['boulder'], area_m2: 535,
    precio_dia: 7000, precio_mensual: 62000,
    web: 'ironwall.cl', instagram: 'ironwall.cl',
    tiene_alquiler: true, tiene_cursos: true,
  },
  {
    nombre: 'Monos Climbing', slug: 'monos-climbing', ciudad: 'Maipú', region_slug: 'metropolitana',
    lng: -70.7655, lat: -33.5194, direccion: 'Bailén 2223',
    tipos: ['boulder'],
    precio_dia: 5000, precio_mensual: 45000,
    web: 'monosclimbing.cl',
    tiene_alquiler: false, tiene_cursos: true,
  },
]

// ─── Sample vías for Las Palestras ───
const viasPalestras = [
  { nombre: 'Calentamiento', grado: '5a', tipo: 'deportiva', largo: 15, num_chapas: 6, estrellas: 1 },
  { nombre: 'El Inicio', grado: '5b', tipo: 'deportiva', largo: 18, num_chapas: 7, estrellas: 1 },
  { nombre: 'Primer Paso', grado: '5c', tipo: 'deportiva', largo: 20, num_chapas: 8, estrellas: 2 },
  { nombre: 'La Clásica', grado: '6a', tipo: 'deportiva', largo: 22, num_chapas: 8, estrellas: 3 },
  { nombre: 'Roca Madre', grado: '6a+', tipo: 'deportiva', largo: 25, num_chapas: 9, estrellas: 2 },
  { nombre: 'Dedos Mágicos', grado: '6b', tipo: 'deportiva', largo: 20, num_chapas: 8, estrellas: 3 },
  { nombre: 'Toba Power', grado: '6b+', tipo: 'deportiva', largo: 23, num_chapas: 9, estrellas: 2 },
  { nombre: 'Desplome Central', grado: '6c', tipo: 'deportiva', largo: 18, num_chapas: 7, inclinacion: 'desplomado', estrellas: 3 },
  { nombre: 'El Techo', grado: '6c+', tipo: 'deportiva', largo: 15, num_chapas: 6, inclinacion: 'techo', estrellas: 2 },
  { nombre: 'Proyecto Rojo', grado: '7a', tipo: 'deportiva', largo: 25, num_chapas: 10, estrellas: 3 },
  { nombre: 'Sendero del Cóndor', grado: '7a+', tipo: 'deportiva', largo: 28, num_chapas: 11, estrellas: 3 },
  { nombre: 'Fuego Andino', grado: '7b', tipo: 'deportiva', largo: 22, num_chapas: 9, estrellas: 2 },
  { nombre: 'La Joya', grado: '7b+', tipo: 'deportiva', largo: 20, num_chapas: 8, estrellas: 3 },
  { nombre: 'Filo de Navaja', grado: '7c', tipo: 'deportiva', largo: 25, num_chapas: 10, inclinacion: 'desplomado', estrellas: 3 },
]

async function seed() {
  console.log('Seeding regiones...')
  const { error: regErr } = await supabase.from('regiones').upsert(regiones, { onConflict: 'slug' })
  if (regErr) { console.error('Error seeding regiones:', regErr); return }

  const { data: allRegiones } = await supabase.from('regiones').select('id, slug')
  const regionMap = new Map((allRegiones ?? []).map(r => [r.slug, r.id]))

  console.log('Seeding zonas...')
  for (const z of zonasData) {
    const regionId = regionMap.get(z.region_slug)
    if (!regionId) { console.warn(`Region ${z.region_slug} not found, skipping ${z.nombre}`); continue }

    const { error } = await supabase.rpc('exec_sql', {
      query: `INSERT INTO zonas (nombre, slug, region_id, tipos, geom, tipo_roca, altitud, ciudad_referencia, distancia_ciudad, num_vias, grado_min, grado_max, temporada_recomendada, acceso_dificultad, camping, agua, estrellas, descripcion_corta, activa)
      VALUES ($1, $2, $3, $4, ST_MakePoint($5, $6)::geometry(Point, 4326), $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, TRUE)
      ON CONFLICT (slug) DO UPDATE SET
        num_vias = EXCLUDED.num_vias, estrellas = EXCLUDED.estrellas, updated_at = NOW()`,
      args: [
        z.nombre, z.slug, regionId, z.tipos,
        z.lng, z.lat,
        z.tipo_roca, z.altitud, z.ciudad_referencia, z.distancia_ciudad,
        z.num_vias, z.grado_min, z.grado_max,
        z.temporada_recomendada, z.acceso_dificultad,
        z.camping, z.agua, z.estrellas, z.descripcion_corta,
      ],
    })

    // Fallback: direct SQL if exec_sql RPC doesn't exist
    if (error?.message?.includes('function') || error?.message?.includes('does not exist')) {
      const { error: directErr } = await supabase.from('zonas').upsert({
        nombre: z.nombre,
        slug: z.slug,
        region_id: regionId,
        tipos: z.tipos,
        tipo_roca: z.tipo_roca,
        altitud: z.altitud,
        ciudad_referencia: z.ciudad_referencia,
        distancia_ciudad: z.distancia_ciudad,
        num_vias: z.num_vias,
        grado_min: z.grado_min,
        grado_max: z.grado_max,
        temporada_recomendada: z.temporada_recomendada,
        acceso_dificultad: z.acceso_dificultad,
        camping: z.camping,
        agua: z.agua,
        estrellas: z.estrellas,
        descripcion_corta: z.descripcion_corta,
        activa: true,
      } as Record<string, unknown>, { onConflict: 'slug' })
      if (directErr) console.error(`Error seeding zona ${z.nombre}:`, directErr)
      else {
        // Update geometry separately
        const { data: inserted } = await supabase.from('zonas').select('id').eq('slug', z.slug).single()
        if (inserted) {
          const { error: geomErr } = await supabase.rpc('exec_sql', {
            query: `UPDATE zonas SET geom = ST_MakePoint(${z.lng}, ${z.lat})::geometry(Point, 4326) WHERE id = '${inserted.id}'`
          })
          if (geomErr) {
            console.warn(`Could not set geometry for ${z.nombre}. Run manually: UPDATE zonas SET geom = ST_MakePoint(${z.lng}, ${z.lat})::geometry(Point, 4326) WHERE slug = '${z.slug}';`)
          }
        }
      }
    } else if (error) {
      console.error(`Error seeding zona ${z.nombre}:`, error)
    }
    console.log(`  ✓ ${z.nombre}`)
  }

  // Seed sectores + vias for Las Palestras
  console.log('Seeding sectores y vías...')
  const { data: palestras } = await supabase.from('zonas').select('id').eq('slug', 'las-palestras').single()
  if (palestras) {
    const { data: sector } = await supabase.from('sectores').upsert({
      zona_id: palestras.id,
      nombre: 'Sector Central',
      slug: 'sector-central',
      orientacion: 'Nor-Oeste',
      num_vias: viasPalestras.length,
      orden: 1,
      activo: true,
    }, { onConflict: 'zona_id,slug' }).select('id').single()

    if (sector) {
      for (const v of viasPalestras) {
        await supabase.from('vias').upsert({
          sector_id: sector.id,
          zona_id: palestras.id,
          nombre: v.nombre,
          grado: v.grado,
          tipo: v.tipo,
          largo: v.largo,
          num_chapas: v.num_chapas,
          inclinacion: v.inclinacion ?? null,
          estrellas: v.estrellas,
          estado: 'activa',
        } as Record<string, unknown>, { onConflict: 'id' })
      }
      console.log(`  ✓ ${viasPalestras.length} vías en Las Palestras - Sector Central`)
    }
  }

  // Seed gimnasios
  console.log('Seeding gimnasios...')
  for (const g of gimnasiosData) {
    const regionId = regionMap.get(g.region_slug)
    const { error } = await supabase.from('gimnasios').upsert({
      nombre: g.nombre,
      slug: g.slug,
      ciudad: g.ciudad,
      region_id: regionId,
      direccion: g.direccion,
      tipos: g.tipos,
      area_m2: g.area_m2 ?? null,
      altura_max: g.altura_max ?? null,
      precio_dia: g.precio_dia,
      precio_mensual: g.precio_mensual,
      web: g.web ?? null,
      instagram: g.instagram ?? null,
      descripcion: g.descripcion ?? null,
      tiene_alquiler: g.tiene_alquiler ?? null,
      tiene_cursos: g.tiene_cursos ?? null,
      activo: true,
    } as Record<string, unknown>, { onConflict: 'slug' })
    if (error) console.error(`Error seeding gimnasio ${g.nombre}:`, error)
    else {
      // Update geometry
      const { data: gym } = await supabase.from('gimnasios').select('id').eq('slug', g.slug).single()
      if (gym) {
        const { error: geomErr } = await supabase.rpc('exec_sql', {
          query: `UPDATE gimnasios SET geom = ST_MakePoint(${g.lng}, ${g.lat})::geometry(Point, 4326) WHERE id = '${gym.id}'`
        })
        if (geomErr) {
          console.warn(`Set geometry manually: UPDATE gimnasios SET geom = ST_MakePoint(${g.lng}, ${g.lat})::geometry(Point, 4326) WHERE slug = '${g.slug}';`)
        }
      }
    }
    console.log(`  ✓ ${g.nombre}`)
  }

  console.log('\nSeed complete!')
  console.log('\nIMPORTANT: If PostGIS geometry was not set via RPC, run the following SQL in Supabase SQL Editor:')
  console.log('---')
  for (const z of zonasData) {
    console.log(`UPDATE zonas SET geom = ST_MakePoint(${z.lng}, ${z.lat})::geometry(Point, 4326) WHERE slug = '${z.slug}';`)
  }
  for (const g of gimnasiosData) {
    console.log(`UPDATE gimnasios SET geom = ST_MakePoint(${g.lng}, ${g.lat})::geometry(Point, 4326) WHERE slug = '${g.slug}';`)
  }
  console.log('---')
}

seed().catch(console.error)

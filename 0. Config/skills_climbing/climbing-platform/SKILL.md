---
name: climbing-platform
description: >
  Guía maestra para construir EscalaChile, la plataforma unificada de escalada en Chile.
  Usar este skill SIEMPRE que se trabaje en este proyecto: al crear componentes de mapa,
  páginas de zonas o sectores, cards de rutas, sistema de filtros, homepage, navbar,
  estructura del proyecto, configuración de Next.js o Supabase, schema de base de datos,
  deploy a Cloudflare, o cualquier tarea de frontend/backend relacionada. También usar
  cuando el usuario pregunte "cómo implemento X en EscalaChile", "cómo estructuro Y",
  o "dónde va este componente". Si hay duda, usar este skill.
---

# EscalaChile — Skill de Plataforma

Guía de arquitectura, decisiones técnicas y convenciones para el proyecto EscalaChile.

## Stack técnico

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript | Framework principal |
| Estilos | Tailwind CSS + shadcn/ui | UI components |
| Base de datos | Supabase (PostgreSQL + PostGIS) | Datos + auth + storage |
| Mapas | MapLibre GL JS + react-map-gl | Mapas interactivos |
| Tiles de mapa | OpenFreeMap (tiles.openfreemap.org) | Sin costo, sin API key |
| Topos | Konva.js + react-konva | Canvas interactivo |
| Imágenes | Cloudflare R2 | CDN sin costo de egress |
| Deploy | Cloudflare Pages | Bandwidth ilimitado gratis |

## Estructura de carpetas

```
src/
  app/
    (public)/           # Sin auth requerida
      page.tsx          # Homepage
      zonas/
        page.tsx        # /zonas — mapa + lista
        [region]/[zona]/page.tsx    # detalle zona
        [region]/[zona]/[sector]/page.tsx  # sector + topos
      gimnasios/
        page.tsx        # /gimnasios — mapa + lista
    (auth)/             # Requiere login
      contribuir/       # Agregar vías/zonas
      perfil/           # Perfil del usuario
  components/
    map/                # Componentes MapLibre
    topo/               # Viewer y Editor de topos
    ui/                 # Componentes reutilizables
    layout/             # Navbar, Footer
  lib/
    supabase.ts         # Cliente browser
    supabase-server.ts  # Cliente server (Server Components)
    types.ts            # Tipos TypeScript
    grades.ts           # Conversión de grados
    utils.ts            # Helpers (slugify, formatGrade, etc.)
  hooks/                # Custom hooks (useZonas, useGimnasios...)
```

## Convenciones obligatorias

### TypeScript
- Nunca usar `any`. Definir todos los tipos en `src/lib/types.ts`.
- Generar tipos Supabase: `npx supabase gen types typescript --project-id ID > src/lib/database.types.ts`
- Usar tipos generados de Supabase para operaciones de DB.

### Componentes
- **Server Components por defecto.** Solo agregar `'use client'` donde hay:
  - Estado React (useState, useReducer)
  - Efectos (useEffect)
  - Event handlers del browser
  - Acceso a APIs del browser (geolocalización, etc.)
  - MapLibre o Konva (siempre client-side)
- Componentes del mapa: SIEMPRE `'use client'`
- TopoViewer y TopoEditor: SIEMPRE `'use client'`

### Supabase
```typescript
// Server Components y Route Handlers → supabase-server.ts
import { createServerComponentClient } from '@/lib/supabase-server'
const supabase = createServerComponentClient()

// Client Components → supabase.ts
import { createBrowserClient } from '@/lib/supabase'
const supabase = createBrowserClient()
```

### Coordenadas — CRÍTICO
PostGIS y MapLibre usan `[longitude, latitude]` — el orden opuesto a Google Maps.
```typescript
// ✅ CORRECTO (PostGIS/MapLibre)
const punto = [lng, lat]  // [-70.6, -33.4]

// ❌ INCORRECTO (confusión común)
const punto = [lat, lng]  // [-33.4, -70.6]

// Query PostGIS correcta:
SELECT * FROM zonas
WHERE ST_DWithin(
  geom,
  ST_MakePoint(-70.6, -33.4)::geography,  -- [lng, lat]
  50000  -- metros
)
```

### Slugs
```typescript
import slugify from 'slugify'
const slug = slugify(nombre, { lower: true, strict: true, locale: 'es' })
// "Las Palestras" → "las-palestras"
// "Valle de los Cóndores" → "valle-de-los-condores"
```

## Diseño visual

**Paleta de colores (CSS variables en globals.css):**
```css
:root {
  --color-roca:    #1a1a1a;  /* Fondo principal dark */
  --color-gris:    #3d3d3d;  /* Cards, bordes */
  --color-naranja: #f4622a;  /* Acento primario */
  --color-nieve:   #fafaf8;  /* Texto principal */
  --color-verde:   #2d6a4f;  /* Acento secundario */
}
```

**Tipografía:**
```html
<!-- En app/layout.tsx -->
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
```
- Headings: `font-family: 'Sora'`
- Body: `font-family: 'Inter'`

**Colores de grados:**
```typescript
export const gradeColors = {
  principiante: 'bg-green-600',   // 4a–5c
  intermedio:   'bg-blue-600',    // 6a–6c+
  avanzado:     'bg-orange-500',  // 7a–7c+
  experto:      'bg-red-600',     // 8a–8c+
  elite:        'bg-purple-700',  // 9a+
}
```

## Layouts de páginas principales

### /zonas — Layout 2 columnas
```
┌─────────────────────────────────────────────────┐
│  [FilterBar: región | tipo | grado | temporada] │
├─────────────────────────┬───────────────────────┤
│                         │  ZonaCard ★★★         │
│     ZonasMap            │  ZonaCard ★★★★        │
│    (MapLibre)           │  ZonaCard ★★★         │
│    60% width            │  ZonaCard ★★          │
│                         │  40% width            │
└─────────────────────────┴───────────────────────┘
```
En móvil: mapa 300px + lista debajo.
Hover en card → resaltar punto en mapa. Click en punto → highlight card.

### /zonas/[region]/[zona] — Detalle de zona
```
┌──────────────────────────────────────────────┐
│  Foto panorámica (100vw, 50vh, overlay)      │
│  Nombre zona | Región | Tipos | Grado rango  │
├──────────────────────────────────────────────┤
│  Info: vías | altitud | acceso | temporada   │
├──────────┬───────────────────────────────────┤
│          │  Acordeón de sectores:            │
│  Mapa    │  ▼ Sector "Las Palestras" (35)    │
│  sector  │    [tabla de vías filtrable]      │
│          │  ► Sector "Los Manyos" (20)       │
└──────────┴───────────────────────────────────┘
```

### /gimnasios — igual layout que /zonas
Mismo patrón mapa+lista pero con GimnasioCard.

## Configuración de MapLibre

```tsx
// components/map/ZonasMap.tsx
'use client'
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

const CHILE_BOUNDS = [[-75.6, -55.9], [-66.4, -17.5]]
const CHILE_CENTER = { longitude: -71.0, latitude: -35.5, zoom: 5 }

// Estilo gratuito de OpenFreeMap
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

// Para clusters: usar supercluster o maplibre-gl-js clusters nativo
```

## Configuración de Supabase

```typescript
// lib/supabase.ts (browser)
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'
export const createBrowserClient = () =>
  createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// lib/supabase-server.ts (server)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export const createServerComponentClient = () =>
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookies().get(name)?.value } }
  )
```

## Queries PostGIS frecuentes

```typescript
// Zonas cercanas a un punto (radio en metros)
const { data } = await supabase.rpc('zonas_cercanas', {
  lng: -70.6,
  lat: -33.4,
  radio_metros: 50000
})
// Crear función SQL: CREATE OR REPLACE FUNCTION zonas_cercanas(lng float, lat float, radio_metros float)...

// Todas las zonas con sus coordenadas (para el mapa)
const { data } = await supabase
  .from('zonas')
  .select('id, nombre, slug, tipos, num_vias, estrellas, ST_X(geom) as lng, ST_Y(geom) as lat')
  .eq('activa', true)

// Vías de un sector con filtros
const { data } = await supabase
  .from('vias')
  .select('*')
  .eq('sector_id', sectorId)
  .in('tipo', tiposFiltro)
  .gte('grado', gradoMin)
  .lte('grado', gradoMax)
  .order('grado')
```

## Deploy a Cloudflare Pages

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['tu-bucket.r2.dev'],
  },
  headers: async () => [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ]
  }]
}
```

```bash
# Deploy
npm run build
npx wrangler pages deploy .next/standalone
```

## Archivos de referencia

Lee estos archivos cuando necesites más detalle:
- `references/supabase-schema.sql` — Schema SQL completo con todos los índices
- `references/seed-data.ts` — Datos iniciales de zonas y gimnasios
- `references/grade-conversions.ts` — Tabla completa de conversión de grados
- `references/maplibre-examples.tsx` — Ejemplos de clusters, popups y filtros

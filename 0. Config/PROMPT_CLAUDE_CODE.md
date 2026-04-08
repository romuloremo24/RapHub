# 🧗 EscalaChile — Prompt Maestro para Claude Code

> Copia este prompt completo al inicio de una sesión de Claude Code en VS Code.
> Antes de comenzar cualquier tarea, lee el skill `climbing-platform` y `climbing-data` y todos los necesarios de `1. Config/` (en la raiz del repo).

---

## Contexto del proyecto

Estás construyendo **EscalaChile**, la plataforma unificada de escalada en Chile.
El problema: la información de escalada chilena está dispersa en 20+ fuentes (theCrag, 27crags, Mountain Project, guiaescaladachile.com, chileclimbers.cl, PDFs, grupos de Facebook). Esta plataforma centraliza todo en español, con topos interactivos, mapa de zonas, directorio de gimnasios y comunidad.

**Directorio del proyecto:** donde estés parado al iniciar Claude Code.
**Stack:** Next.js 15 + TypeScript + Tailwind CSS + Supabase (PostgreSQL + PostGIS) + MapLibre GL JS + Konva.js + Cloudflare Pages.
**Principio:** zero-cost MVP. Todo debe funcionar en el tier gratuito.

---

## Lo que debes construir

### Fase 1 — Fundación (empieza aquí)

#### 1.1 Setup del proyecto

```bash
npx create-next-app@latest escala-chile \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*"
cd escala-chile
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs \
  maplibre-gl react-map-gl konva react-konva \
  lucide-react clsx tailwind-merge
```

Crea la estructura de carpetas:
```
src/
  app/                    # Next.js App Router
    (public)/             # Layout público
      page.tsx            # Homepage
      zonas/
        page.tsx          # Listado de zonas con mapa
        [region]/
          page.tsx        # Zonas de una región
          [zona]/
            page.tsx      # Detalle de zona con sectores
            [sector]/
              page.tsx    # Sector con lista de vías y topos
    gimnasios/
      page.tsx            # Mapa + listado de gimnasios
    (auth)/               # Layout con auth
      contribuir/
        page.tsx          # Formulario para agregar vías/zonas
  components/
    map/
      ZonasMap.tsx        # Mapa principal con zonas
      GimnasiosMap.tsx    # Mapa de gimnasios
      MapMarker.tsx       # Marcador personalizado
    topo/
      TopoViewer.tsx      # Visualizador de topo interactivo
      TopoEditor.tsx      # Editor de topo (Konva.js)
    ui/                   # Componentes reutilizables
      GradeTag.tsx        # Badge de grado con color
      ClimbTypeIcon.tsx   # Icono deportiva/boulder/trad/hielo
      FilterBar.tsx       # Barra de filtros
      RouteCard.tsx       # Tarjeta de vía
      ZonaCard.tsx        # Tarjeta de zona
      GimnasioCard.tsx    # Tarjeta de gimnasio
    layout/
      Navbar.tsx
      Footer.tsx
  lib/
    supabase.ts           # Cliente Supabase
    supabase-server.ts    # Cliente Supabase (Server Components)
    types.ts              # Tipos TypeScript del schema
    grades.ts             # Sistema de grados y conversiones
    utils.ts
  hooks/
    useZonas.ts
    useGimnasios.ts
    useTopos.ts
```

#### 1.2 Schema de Supabase (ejecutar en SQL Editor)

```sql
-- Habilitar PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Regiones de Chile
CREATE TABLE regiones (
  id SERIAL PRIMARY KEY,
  numero INTEGER UNIQUE,           -- 1, 2, 3... 15, RM
  nombre TEXT NOT NULL,
  nombre_corto TEXT,               -- "RM", "IV", "XI"
  slug TEXT UNIQUE NOT NULL,
  geom GEOMETRY(POINT, 4326),      -- centro aproximado
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zonas de escalada
CREATE TABLE zonas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  region_id INTEGER REFERENCES regiones(id),
  descripcion TEXT,
  descripcion_corta TEXT,          -- max 150 chars para cards
  tipos TEXT[] NOT NULL,           -- ['deportiva','boulder','trad','hielo']
  geom GEOMETRY(POINT, 4326) NOT NULL,
  altitud INTEGER,                 -- metros sobre el nivel del mar
  distancia_ciudad TEXT,           -- "80 km norte de Santiago"
  ciudad_referencia TEXT,
  tipo_roca TEXT,                  -- "toba volcánica", "granito", etc.
  acceso TEXT,                     -- instrucciones de acceso
  acceso_dificultad TEXT CHECK (acceso_dificultad IN ('fácil','moderado','difícil','muy difícil')),
  estacionamiento BOOLEAN,
  camping BOOLEAN,
  agua BOOLEAN,
  temporada_recomendada TEXT,      -- "todo el año", "oct-abril", etc.
  temporada_inicio INTEGER,        -- mes 1-12
  temporada_fin INTEGER,
  num_vias INTEGER DEFAULT 0,      -- denormalizado para performance
  grado_min TEXT,                  -- "5a" (francés)
  grado_max TEXT,
  estrellas DECIMAL(2,1),          -- 0.0 a 5.0
  num_opiniones INTEGER DEFAULT 0,
  fotos TEXT[],                    -- URLs en Cloudflare R2
  fuentes TEXT[],                  -- ['thecrag','27crags','guiadeescaladachile']
  activa BOOLEAN DEFAULT TRUE,
  verificada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX zonas_geom_idx ON zonas USING GIST(geom);
CREATE INDEX zonas_region_idx ON zonas(region_id);
CREATE INDEX zonas_tipos_idx ON zonas USING GIN(tipos);

-- Sectores dentro de una zona
CREATE TABLE sectores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zona_id UUID REFERENCES zonas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  slug TEXT NOT NULL,
  descripcion TEXT,
  geom GEOMETRY(POINT, 4326),
  orientacion TEXT,                -- "Norte", "Sur-Oeste", etc.
  altura_max INTEGER,              -- metros
  num_vias INTEGER DEFAULT 0,
  orden INTEGER DEFAULT 0,         -- orden de aparición
  activo BOOLEAN DEFAULT TRUE,
  UNIQUE(zona_id, slug)
);

-- Vías de escalada
CREATE TABLE vias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID REFERENCES sectores(id) ON DELETE CASCADE,
  zona_id UUID REFERENCES zonas(id),  -- denormalizado
  nombre TEXT NOT NULL,
  grado TEXT NOT NULL,             -- sistema francés: "6a", "7b+", "8c"
  grado_yds TEXT,                  -- conversión YDS: "5.10a", "5.12c"
  grado_hueco TEXT,                -- sistema Hueco/V: "V0", "V8" (boulder)
  tipo TEXT NOT NULL CHECK (tipo IN ('deportiva','boulder','trad','hielo','mixta','multipitch')),
  largo INTEGER,                   -- metros
  num_chapas INTEGER,
  inclinacion TEXT CHECK (inclinacion IN ('placa','vertical','desplomado','techo','mixto')),
  descripcion TEXT,
  beta TEXT,                       -- descripción de movimientos clave
  historia TEXT,                   -- quién la equipó, cuándo
  primera_ascension TEXT,
  anio_equipado INTEGER,
  estrellas INTEGER CHECK (estrellas BETWEEN 0 AND 3),  -- 0,1,2,3 estrellas
  num_votos_estrellas INTEGER DEFAULT 0,
  num_ascensiones INTEGER DEFAULT 0,
  num_intentos INTEGER DEFAULT 0,
  estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa','deteriorada','cerrada','proyecto')),
  fotos TEXT[],
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX vias_sector_idx ON vias(sector_id);
CREATE INDEX vias_zona_idx ON vias(zona_id);
CREATE INDEX vias_grado_idx ON vias(grado);
CREATE INDEX vias_tipo_idx ON vias(tipo);

-- Topos (foto con rutas dibujadas encima)
CREATE TABLE topos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID REFERENCES sectores(id) ON DELETE CASCADE,
  titulo TEXT,
  foto_url TEXT NOT NULL,          -- URL en Cloudflare R2
  foto_width INTEGER,
  foto_height INTEGER,
  canvas_data JSONB,               -- estado serializado de Konva: {lines, labels}
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relación topo ↔ vías (qué rutas aparecen en qué topo)
CREATE TABLE topo_vias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topo_id UUID REFERENCES topos(id) ON DELETE CASCADE,
  via_id UUID REFERENCES vias(id) ON DELETE CASCADE,
  numero_en_topo INTEGER,          -- número que aparece en la foto
  path_points JSONB,               -- [{x:0.1, y:0.3}, ...] coords relativas (0-1)
  UNIQUE(topo_id, via_id)
);

-- Gimnasios de escalada
CREATE TABLE gimnasios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  ciudad TEXT NOT NULL,
  region_id INTEGER REFERENCES regiones(id),
  direccion TEXT,
  geom GEOMETRY(POINT, 4326),
  tipos TEXT[],                    -- ['boulder','lead','top-rope','auto-belay']
  altura_max INTEGER,              -- metros (para lead)
  area_m2 INTEGER,                 -- metros cuadrados de paredes
  descripcion TEXT,
  horario TEXT,
  precio_dia INTEGER,              -- CLP
  precio_mensual INTEGER,          -- CLP
  tiene_alquiler BOOLEAN,
  tiene_cursos BOOLEAN,
  tiene_muro_exterior BOOLEAN,
  web TEXT,
  instagram TEXT,
  telefono TEXT,
  fotos TEXT[],
  activo BOOLEAN DEFAULT TRUE,
  verificado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX gimnasios_geom_idx ON gimnasios USING GIST(geom);
CREATE INDEX gimnasios_region_idx ON gimnasios(region_id);

-- Row Level Security (activar después de poblar datos iniciales)
ALTER TABLE zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vias ENABLE ROW LEVEL SECURITY;
ALTER TABLE topos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gimnasios ENABLE ROW LEVEL SECURITY;

-- Políticas: lectura pública, escritura solo autenticados
CREATE POLICY "Lectura pública zonas" ON zonas FOR SELECT USING (activa = TRUE);
CREATE POLICY "Lectura pública vias" ON vias FOR SELECT USING (true);
CREATE POLICY "Lectura pública topos" ON topos FOR SELECT USING (activo = TRUE);
CREATE POLICY "Lectura pública gimnasios" ON gimnasios FOR SELECT USING (activo = TRUE);
```

#### 1.3 Variables de entorno

Crea `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
NEXT_PUBLIC_MAPLIBRE_STYLE=https://tiles.openfreemap.org/styles/liberty
```

---

### Fase 2 — Diseño visual

**Identidad visual de EscalaChile:**
- **Paleta:** Carbón profundo (#1a1a1a), Roca gris (#3d3d3d), Naranja escalada (#f4622a), Blanco nieve (#fafaf8), Verde cordillera (#2d6a4f como acento secundario)
- **Tipografía:** `Sora` para headings (geométrica, moderna, audaz) + `Inter` para body. Google Fonts.
- **Estética:** Montañosa, oscura, con textura de roca sutil. Inspirada en equipamiento de escalada (mosquetones, cuerdas). Dark mode por defecto con opción light.
- **Grados:** Siempre en sistema francés como default. Badge de color por dificultad:
  - Verde: 4a–5c (principiante)
  - Azul: 6a–6c+ (intermedio)
  - Naranja: 7a–7c+ (avanzado)
  - Rojo: 8a–8c+ (experto)
  - Morado: 9a+ (élite)

**Componente `GradeTag.tsx`:**
```tsx
// Debe mostrar el grado con color de fondo según dificultad
// y permitir hover para ver conversión a YDS
```

#### Homepage (`app/(public)/page.tsx`)

Debe incluir:
1. **Hero** — Mapa de Chile de fondo con puntos de zonas brillando. Headline: "Toda la escalada de Chile, en un solo lugar". Buscador por zona/ciudad/grado.
2. **Stats** — Número animado de zonas, vías, gimnasios, regiones
3. **Zonas destacadas** — Grid de 6 zonas con foto, región, tipos y grado min/max
4. **Mapa interactivo preview** — Mini-mapa con clusters de zonas
5. **Por tipo** — Sección filtrable: Deportiva | Boulder | Trad | Hielo/Mixta
6. **Gimnasios cercanos** — Si el usuario da ubicación, muestra los más cercanos
7. **Últimas contribuciones** — Feed de vías agregadas recientemente

#### Página de Zonas (`app/(public)/zonas/page.tsx`)

Layout 2 columnas: **mapa izquierda (60%) + lista derecha (40%)** en desktop, apilado en móvil.

Mapa:
- Cluster de puntos por región
- Al hacer zoom, clusters se expanden en puntos individuales
- Click en punto → popup con nombre, tipos, num_vias, link al detalle
- Color de punto según tipo dominante (naranja=deportiva, azul=boulder, verde=trad, blanco=hielo)
- Panel lateral con filtros: región, tipo, grado mín/máx, temporada, acceso

Lista:
- `ZonaCard` con foto, nombre, región, tipos (iconos), grado min–max, estrellas, num_vias
- Ordenar por: popularidad, grado, región, nombre
- Al hover en card → resalta punto en el mapa

#### Página de Zona (`app/(public)/zonas/[region]/[zona]/page.tsx`)

Layout:
1. **Header** — Foto panorámica full-width con overlay oscuro. Nombre, región, tipos, grado rango.
2. **Info rápida** — Cards: 🧗 N vías | 🏔️ Altitud | 🚗 Acceso | 📅 Temporada | 🪨 Roca
3. **Mapa del sector** — Mapa centrado en la zona con todos los sectores marcados
4. **Sectores con acordeón** — Cada sector expandible muestra sus vías
5. **Lista de vías** — Tabla filtrable por tipo/grado con columnas: #, Nombre, Grado, Tipo, Largo, ★

#### Página de Sector con Topos

1. **Galería de topos** — Thumbnails de fotos del sector
2. **Topo interactivo** — Al seleccionar foto:
   - Imagen carga en canvas
   - Las líneas de cada ruta se muestran en colores distintos
   - Hover sobre línea → resalta ruta y muestra popup con nombre + grado
   - Click sobre línea → navega al detalle de la vía
3. **Lista de vías del sector** — Sincronizada con el topo (hover en lista ↔ hover en topo)

**Implementación del TopoViewer con Konva:**
```tsx
// Ver instrucciones detalladas en el skill `climbing-data`
// canvas_data en Supabase tiene formato:
// { lines: [{ viaId, points: [{x,y}], color, label }] }
// Los puntos son coordenadas RELATIVAS a la imagen (0 a 1)
// Al renderizar: point.x * imageWidth, point.y * imageHeight
```

#### Página de Gimnasios (`app/gimnasios/page.tsx`)

Layout 2 columnas (igual que zonas):
- **Mapa** con iconos de gimnasio (diferente al de zonas)
- **Lista** con: GimnasioCard (nombre, ciudad, tipos de pared, precio/día, horario)
- **Filtros:** ciudad, tipo de pared, precio máximo
- **"Cerca de mí"** — botón que usa geolocalización del browser

---

### Fase 3 — Datos iniciales (seed)

Crea `scripts/seed-data.ts` con los datos de las zonas más importantes.
**Prioridad de datos a ingresar primero:**

1. **Región Metropolitana** (mayor volumen de escaladores):
   - Las Palestras (-33.60, -70.38) — 70+ vías deportiva, toba volcánica
   - Torrecillas (-33.59, -70.36) — multipitch hasta 350m
   - Los Trapenses (-33.349, -70.554) — 27 rutas, 6 sectores
   - Jurassic Park (Chicureo) — 57 problemas boulder V1-V12

2. **Región de Valparaíso:**
   - Las Chilcas (-32.85, -70.72) — 100+ vías hasta 8c+

3. **Región del Maule:**
   - Valle de los Cóndores (-35.57, -70.68) — 450 vías, 17 sectores

4. **Región de Los Lagos:**
   - Cochamó (-41.50, -72.30) — trad/big wall, 200+ vías

5. **Región de Aysén:**
   - Villa Cerro Castillo (-46.10, -72.18) — 200+ vías basalto
   - Muralla China (-45.57, -72.06) — 34 vías caliza

Formato del seed:
```typescript
// Usar Supabase client con service role key
// Insertar: regiones → zonas → sectores → vías
// Coordenadas en formato [lng, lat] para PostGIS
```

**Datos de gimnasios a ingresar (Santiago):**
- BlocLab: Pedro de Valdivia 1985, Providencia (-33.4279, -70.6159)
- Casa Boulder: Av. Italia 875, Providencia (-33.4367, -70.6266)
- El Muro: Av. Larraín 6228, La Reina (-33.4549, -70.5681)
- Bhanga Climbing: Mall Alto Peñalolén, Consistorial 2100 (-33.4818, -70.5546)
- Hangar Boulder: Alcalde Pedro Alarcón 750, San Miguel (-33.5003, -70.6584)
- IronWall: Av. Pdte. Riesco 5330, Las Condes (-33.4059, -70.5702)
- Monos Climbing: Bailén 2223, Maipú (-33.5194, -70.7655)

---

### Fase 4 — Sistema de grados

Crea `src/lib/grades.ts` con:

```typescript
// Sistema de conversión de grados bidireccional
// Francés ↔ YDS ↔ Hueco (boulder) ↔ UIAA
// Chile usa principalmente sistema francés

const gradeTable = {
  // francés: { yds, uiaa, color, nivel }
  '5a':  { yds: '5.8',  uiaa: 'V',   color: 'green',  nivel: 'principiante' },
  '5b':  { yds: '5.9',  uiaa: 'V+',  color: 'green',  nivel: 'principiante' },
  '6a':  { yds: '5.10a',uiaa: 'VI',  color: 'blue',   nivel: 'intermedio' },
  // ... todos los grados hasta 9c
}

// Función para boulder (sistema Hueco/V)
const boulderGrades = {
  'VB': { frances: '4a-4c', nivel: 'principiante' },
  'V0': { frances: '5a-5b', nivel: 'principiante' },
  // ... hasta V17
}
```

---

### Fase 5 — SEO y performance

Cada página debe tener:
```typescript
// Metadata dinámica con generateMetadata()
export async function generateMetadata({ params }) {
  // title: "Las Palestras - Escalada deportiva en Cajón del Maipo | EscalaChile"
  // description: "70+ vías de escalada deportiva en toba volcánica..."
  // openGraph con foto panorámica de la zona
  // JSON-LD estructurado (Place, SportsActivity)
}
```

Páginas estáticas (SSG) para zonas con `generateStaticParams()`.

---

## Reglas de desarrollo

1. **TypeScript estricto** — Nunca usar `any`. Todos los tipos en `src/lib/types.ts`.
2. **Server Components por defecto** — Solo usar `'use client'` donde se necesite interactividad (mapa, topo editor, filtros).
3. **Supabase en Server Components** — Usar `supabase-server.ts` para data fetching en páginas. Usar el cliente browser solo para auth y real-time.
4. **Imágenes optimizadas** — Usar `next/image` siempre. Fotos en Cloudflare R2, servidas por su CDN.
5. **Coordenadas** — SIEMPRE en formato [longitude, latitude] para PostGIS/MapLibre. Nunca [lat, lng].
6. **Grados** — Sistema francés como default en toda la UI. Mostrar conversión YDS en tooltip.
7. **Slugs** — Generados automáticamente desde el nombre: `"Las Palestras"` → `"las-palestras"`. Usar `slugify` package.
8. **Seguridad** — Ver skill `web-security`. RLS activado en Supabase, variables de entorno en `.env.local`, nunca en código.
9. **Offline-friendly** — Los topos deben cargar con Service Worker para uso sin señal en el crag.
10. **Español primero** — Toda la UI en español. Nombres técnicos de escalada en español (vía, sector, zona, grado, largo, chapa).

---

## Comandos útiles

```bash
# Desarrollo
npm run dev

# Verificar tipos TypeScript
npx tsc --noEmit

# Generar tipos desde Supabase (después de crear tablas)
npx supabase gen types typescript --project-id TU_PROJECT_ID > src/lib/database.types.ts

# Build para producción
npm run build

# Deploy a Cloudflare Pages (instalar wrangler primero)
npx wrangler pages deploy .next
```

---

## Orden de implementación recomendado

Sigue este orden exacto para tener algo funcional lo antes posible:

1. `npm run setup` — Crear proyecto Next.js e instalar dependencias
2. Crear tablas en Supabase SQL Editor
3. Crear `src/lib/supabase.ts` y `src/lib/types.ts`
4. Crear `src/lib/grades.ts` — Sistema de grados
5. Crear componentes UI base: `GradeTag`, `ClimbTypeIcon`, `RouteCard`, `ZonaCard`
6. Crear `ZonasMap.tsx` con MapLibre + OpenFreeMap
7. Crear página `/zonas` con mapa + lista (layout 2 columnas)
8. Ejecutar seed con datos de las 5 zonas prioritarias
9. Crear página `/zonas/[region]/[zona]` con detalle
10. Crear `TopoViewer.tsx` con Konva.js
11. Crear página `/gimnasios` con mapa + lista
12. Ejecutar seed con datos de gimnasios de Santiago
13. Homepage con hero, stats y zonas destacadas
14. SEO: `generateMetadata()` en todas las páginas
15. Deploy a Cloudflare Pages

---

## Fuentes de datos de referencia

Para poblar la base de datos, consultar estas fuentes (ya investigadas):
- **theCrag Chile:** https://www.thecrag.com/en/climbing/chile (HTML estructurado, ~2000+ vías)
- **Guía de Escalada Chile (PDF):** https://www.guiaescaladachile.com/ (300+ vías zona central, PDF gratuito)
- **Mountain Project Chile:** https://www.mountainproject.com/area/106320140/chile (~487 vías)
- **Malku.cl:** https://www.malku.cl/guia-de-zonas-y-sectores-de-escalada-deportiva-en-roca-de-chile/ (guía de zonas)
- **Blog AndesGear:** https://blog.andesgear.cl (sectores populares documentados)
- **ChileClimbers:** https://www.chileclimbers.cl (lista de gimnasios 2017, actualizar manualmente)
- **IndoorClimbing.com:** https://indoorclimbing.com/chile.html (directorio gimnasios)

---

## Si tienes dudas sobre X

- **Mapa no carga:** Verificar que `maplibre-gl` esté instalado y que el estilo de OpenFreeMap sea accesible
- **PostGIS query:** `SELECT * FROM zonas WHERE ST_DWithin(geom, ST_MakePoint(-70.6, -33.4)::geography, 50000)` — busca en 50km radio
- **Topo editor:** Ver skill `climbing-data` sección "Editor de Topos"
- **Deploy a Cloudflare:** Agregar `output: 'standalone'` en `next.config.js` para Cloudflare Pages
- **Tipos Supabase:** Generar con `npx supabase gen types typescript` después de crear las tablas

---

*Este prompt fue generado con investigación exhaustiva de fuentes chilenas e internacionales de escalada. Versión 1.0 — Marzo 2026.*

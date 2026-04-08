# CLAUDE.md — Proyecto Vesta

## Descripción del Proyecto
Plataforma web agregadora de propiedades inmobiliarias chilenas. Recopila
arriendos y ventas de Portal Inmobiliario, TocToc, Yapo.cl y MercadoLibre
Inmuebles en una sola interfaz con mapa, filtros y comparación de precios.

## Stack Tecnológico
- **Monorepo**: Turborepo con pnpm workspaces
- **Frontend**: Next.js 15 App Router, TypeScript, Tailwind CSS v4, shadcn/ui
- **Mapas**: MapLibre GL JS v5 (OSM tiles, upgrade a PMTiles cuando sea viable)
- **Backend**: Next.js API Routes (Route Handlers)
- **Scraping**: Crawlee (CheerioCrawler + HttpCrawler) para TocToc, API oficial para MercadoLibre
- **Base de datos**: Supabase PostgreSQL + PostGIS + pg_trgm
- **Cache/Queue**: Upstash Redis (BullMQ broker + cache)
- **Auth**: Supabase Auth
- **Deploy**: Vercel (web) + Railway (scraper) + GitHub Actions (cron)

## Estructura del Monorepo
```
vesta/
├── apps/
│   ├── web/               # Next.js 15 App
│   │   ├── src/app/       # App Router (pages, API routes)
│   │   ├── src/components/ # React components
│   │   └── src/lib/       # Utils, Supabase client
│   └── scraper/           # Crawlee + BullMQ service
│       ├── src/crawlers/  # One crawler per portal
│       ├── src/normalizers/ # Data normalization
│       └── src/lib/       # Supabase, UF conversion
├── packages/
│   ├── shared/            # TypeScript types + constants
│   └── db/                # SQL migrations + seed data
├── .github/workflows/     # Scraping cron
└── turbo.json
```

## Convenciones
- TypeScript estricto, no `any`
- Archivos en kebab-case, componentes en PascalCase
- Server Components por defecto, "use client" solo cuando necesario
- Imports con `@/` alias
- Validar inputs con Zod en API routes

## Base de Datos
- PostgreSQL + PostGIS (SRID 4326) + pg_trgm
- Precios en CLP y UF siempre
- FTS con diccionario 'spanish'
- Deduplicación: content_hash (intra-fuente) + fingerprint (cross-fuente)

## Variables de Entorno
Ver `.env.example` en la raíz del proyecto.

## Desarrollo Local
```bash
cd "G:\My Drive\RapHub\4. Plataformas\Comparación_Inmuebles"
pnpm install
pnpm dev:web       # Next.js en localhost:3000
pnpm dev:scraper   # Scraper en modo watch
```

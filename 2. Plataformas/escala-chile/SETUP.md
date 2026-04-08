# EscalaChile — Setup

## 1. Crear proyecto Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta (gratis)
2. Click "New Project" — elige un nombre y region (South America si disponible)
3. Espera a que se cree el proyecto (1-2 min)
4. Ve a **Settings > API** y copia:
   - **Project URL** (ej: `https://abc123.supabase.co`)
   - **anon public key**
   - **service_role key** (oculta por defecto, click "Reveal")

## 2. Configurar variables de entorno

Crea `.env.local` en la raiz del proyecto (copia de `.env.local.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
NEXT_PUBLIC_MAPLIBRE_STYLE=https://tiles.openfreemap.org/styles/liberty
```

## 3. Ejecutar schema SQL

1. En Supabase, ve a **SQL Editor**
2. Abre el archivo `supabase-schema.sql` de este proyecto
3. Copia TODO el contenido y pegalo en el SQL Editor
4. Click **Run** — deberia ejecutar sin errores

Esto crea:
- Extension PostGIS
- 7 tablas (regiones, zonas, sectores, vias, topos, topo_vias, gimnasios)
- Views para coordenadas (zonas_with_coords, gimnasios_with_coords)
- Funcion RPC zonas_cercanas
- Indices y politicas RLS

## 4. Instalar dependencias

```bash
npm install
```

## 5. Ejecutar seed de datos

```bash
npm run seed
```

Esto inserta:
- 16 regiones de Chile
- 9 zonas prioritarias de escalada
- 14 vias de ejemplo en Las Palestras
- 7 gimnasios de Santiago

**IMPORTANTE:** El seed inserta datos pero puede no poder setear las geometrias PostGIS via la API REST. Si las zonas no aparecen en el mapa, ejecuta el SQL que el script imprime al final en el SQL Editor de Supabase.

## 6. Correr en desarrollo

```bash
npm run dev
```

Abre http://localhost:3000

## 7. Build de produccion

```bash
npm run build
```

## Troubleshooting

- **Mapa no carga:** Verifica que `NEXT_PUBLIC_MAPLIBRE_STYLE` este configurado
- **Datos vacios:** Revisa que ejecutaste el schema SQL Y el seed
- **Zonas sin ubicacion en mapa:** Ejecuta las queries UPDATE de geometria manualmente
- **Error PostGIS:** Asegurate de que la extension PostGIS este habilitada en Supabase

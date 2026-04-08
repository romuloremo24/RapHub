-- EscalaChile — Schema SQL completo
-- Ejecutar en Supabase SQL Editor en orden

-- 1. Habilitar PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Regiones de Chile
CREATE TABLE regiones (
  id SERIAL PRIMARY KEY,
  numero INTEGER UNIQUE,
  nombre TEXT NOT NULL,
  nombre_corto TEXT,
  slug TEXT UNIQUE NOT NULL,
  geom GEOMETRY(POINT, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Zonas de escalada
CREATE TABLE zonas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  region_id INTEGER REFERENCES regiones(id),
  descripcion TEXT,
  descripcion_corta TEXT,
  tipos TEXT[] NOT NULL,
  geom GEOMETRY(POINT, 4326) NOT NULL,
  altitud INTEGER,
  distancia_ciudad TEXT,
  ciudad_referencia TEXT,
  tipo_roca TEXT,
  acceso TEXT,
  acceso_dificultad TEXT CHECK (acceso_dificultad IN ('fácil','moderado','difícil','muy difícil')),
  estacionamiento BOOLEAN,
  camping BOOLEAN,
  agua BOOLEAN,
  temporada_recomendada TEXT,
  temporada_inicio INTEGER,
  temporada_fin INTEGER,
  num_vias INTEGER DEFAULT 0,
  grado_min TEXT,
  grado_max TEXT,
  estrellas DECIMAL(2,1),
  num_opiniones INTEGER DEFAULT 0,
  fotos TEXT[],
  fuentes TEXT[],
  activa BOOLEAN DEFAULT TRUE,
  verificada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX zonas_geom_idx ON zonas USING GIST(geom);
CREATE INDEX zonas_region_idx ON zonas(region_id);
CREATE INDEX zonas_tipos_idx ON zonas USING GIN(tipos);

-- 4. Sectores dentro de una zona
CREATE TABLE sectores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zona_id UUID REFERENCES zonas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  slug TEXT NOT NULL,
  descripcion TEXT,
  geom GEOMETRY(POINT, 4326),
  orientacion TEXT,
  altura_max INTEGER,
  num_vias INTEGER DEFAULT 0,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  UNIQUE(zona_id, slug)
);

-- 5. Vías de escalada
CREATE TABLE vias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID REFERENCES sectores(id) ON DELETE CASCADE,
  zona_id UUID REFERENCES zonas(id),
  nombre TEXT NOT NULL,
  grado TEXT NOT NULL,
  grado_yds TEXT,
  grado_hueco TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('deportiva','boulder','trad','hielo','mixta','multipitch')),
  largo INTEGER,
  num_chapas INTEGER,
  inclinacion TEXT CHECK (inclinacion IN ('placa','vertical','desplomado','techo','mixto')),
  descripcion TEXT,
  beta TEXT,
  historia TEXT,
  primera_ascension TEXT,
  anio_equipado INTEGER,
  estrellas INTEGER CHECK (estrellas BETWEEN 0 AND 3),
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

-- 6. Topos
CREATE TABLE topos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID REFERENCES sectores(id) ON DELETE CASCADE,
  titulo TEXT,
  foto_url TEXT NOT NULL,
  foto_width INTEGER,
  foto_height INTEGER,
  canvas_data JSONB,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Relación topo ↔ vías
CREATE TABLE topo_vias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topo_id UUID REFERENCES topos(id) ON DELETE CASCADE,
  via_id UUID REFERENCES vias(id) ON DELETE CASCADE,
  numero_en_topo INTEGER,
  path_points JSONB,
  UNIQUE(topo_id, via_id)
);

-- 8. Gimnasios de escalada
CREATE TABLE gimnasios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  ciudad TEXT NOT NULL,
  region_id INTEGER REFERENCES regiones(id),
  direccion TEXT,
  geom GEOMETRY(POINT, 4326),
  tipos TEXT[],
  altura_max INTEGER,
  area_m2 INTEGER,
  descripcion TEXT,
  horario TEXT,
  precio_dia INTEGER,
  precio_mensual INTEGER,
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

-- 9. Views para extraer coordenadas (PostgREST no soporta ST_X/ST_Y directo)
CREATE OR REPLACE VIEW zonas_with_coords AS
SELECT *, ST_X(geom::geometry) AS lng, ST_Y(geom::geometry) AS lat
FROM zonas;

CREATE OR REPLACE VIEW gimnasios_with_coords AS
SELECT *, ST_X(geom::geometry) AS lng, ST_Y(geom::geometry) AS lat
FROM gimnasios;

CREATE OR REPLACE VIEW sectores_with_coords AS
SELECT *, ST_X(geom::geometry) AS lng, ST_Y(geom::geometry) AS lat
FROM sectores;

-- 10. Función RPC para búsqueda por proximidad
CREATE OR REPLACE FUNCTION zonas_cercanas(p_lng float, p_lat float, radio_metros float)
RETURNS TABLE (
  id UUID, nombre TEXT, slug TEXT, region_id INTEGER, descripcion TEXT,
  descripcion_corta TEXT, tipos TEXT[], altitud INTEGER, distancia_ciudad TEXT,
  ciudad_referencia TEXT, tipo_roca TEXT, acceso TEXT, acceso_dificultad TEXT,
  estacionamiento BOOLEAN, camping BOOLEAN, agua BOOLEAN,
  temporada_recomendada TEXT, temporada_inicio INTEGER, temporada_fin INTEGER,
  num_vias INTEGER, grado_min TEXT, grado_max TEXT, estrellas DECIMAL(2,1),
  num_opiniones INTEGER, fotos TEXT[], fuentes TEXT[],
  activa BOOLEAN, verificada BOOLEAN,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  geom GEOMETRY, lng FLOAT, lat FLOAT
) AS $$
  SELECT z.*, ST_X(z.geom::geometry) AS lng, ST_Y(z.geom::geometry) AS lat
  FROM zonas z
  WHERE ST_DWithin(z.geom, ST_MakePoint(p_lng, p_lat)::geography, radio_metros)
    AND z.activa = TRUE
  ORDER BY z.geom <-> ST_MakePoint(p_lng, p_lat)::geometry;
$$ LANGUAGE sql;

-- 11. Row Level Security
ALTER TABLE zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectores ENABLE ROW LEVEL SECURITY;
ALTER TABLE vias ENABLE ROW LEVEL SECURITY;
ALTER TABLE topos ENABLE ROW LEVEL SECURITY;
ALTER TABLE topo_vias ENABLE ROW LEVEL SECURITY;
ALTER TABLE gimnasios ENABLE ROW LEVEL SECURITY;
ALTER TABLE regiones ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública
CREATE POLICY "Lectura pública regiones" ON regiones FOR SELECT USING (true);
CREATE POLICY "Lectura pública zonas" ON zonas FOR SELECT USING (activa = TRUE);
CREATE POLICY "Lectura pública sectores" ON sectores FOR SELECT USING (activo = TRUE);
CREATE POLICY "Lectura pública vias" ON vias FOR SELECT USING (true);
CREATE POLICY "Lectura pública topos" ON topos FOR SELECT USING (activo = TRUE);
CREATE POLICY "Lectura pública topo_vias" ON topo_vias FOR SELECT USING (true);
CREATE POLICY "Lectura pública gimnasios" ON gimnasios FOR SELECT USING (activo = TRUE);

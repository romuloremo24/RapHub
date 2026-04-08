-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Regions of Chile (16)
CREATE TABLE regions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  boundary GEOMETRY(MultiPolygon, 4326),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_regions_boundary ON regions USING GIST (boundary);
CREATE INDEX idx_regions_slug ON regions (slug);

-- Communes of Chile (346)
CREATE TABLE communes (
  id SERIAL PRIMARY KEY,
  region_id INTEGER NOT NULL REFERENCES regions(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  boundary GEOMETRY(MultiPolygon, 4326),
  centroid GEOMETRY(Point, 4326),
  avg_price_uf_m2 DECIMAL(10,2),
  listing_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_communes_boundary ON communes USING GIST (boundary);
CREATE INDEX idx_communes_region ON communes (region_id);
CREATE INDEX idx_communes_slug ON communes (slug);
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  price_clp BIGINT,
  price_uf DECIMAL(12,2),
  currency TEXT DEFAULT 'CLP' CHECK (currency IN ('CLP', 'UF', 'USD')),
  price_per_m2_uf DECIMAL(10,2),
  operation TEXT NOT NULL CHECK (operation IN ('arriendo', 'venta')),
  property_type TEXT NOT NULL CHECK (property_type IN (
    'departamento', 'casa', 'terreno', 'parcela',
    'oficina', 'local-comercial', 'bodega', 'estacionamiento'
  )),
  bedrooms SMALLINT,
  bathrooms SMALLINT,
  parking_spots SMALLINT,
  total_area_m2 DECIMAL(10,2),
  built_area_m2 DECIMAL(10,2),
  floor_number SMALLINT,
  floor_count SMALLINT,
  year_built SMALLINT,
  is_furnished BOOLEAN,
  has_common_expenses BOOLEAN,
  common_expenses_clp INTEGER,
  address TEXT,
  commune_id INTEGER REFERENCES communes(id),
  sector TEXT,
  location GEOMETRY(Point, 4326),
  images TEXT[],
  image_count SMALLINT DEFAULT 0,
  primary_source TEXT NOT NULL CHECK (primary_source IN (
    'portalinmobiliario', 'mercadolibre', 'toctoc', 'yapo'
  )),
  primary_source_url TEXT NOT NULL,
  primary_external_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  source_count SMALLINT DEFAULT 1,
  search_vector TSVECTOR,
  is_active BOOLEAN DEFAULT true,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Search indexes
CREATE INDEX idx_properties_location ON properties USING GIST (location);
CREATE INDEX idx_properties_search ON properties USING GIN (search_vector);
CREATE INDEX idx_properties_trgm_title ON properties USING GIN (title gin_trgm_ops);

-- Filter indexes
CREATE INDEX idx_properties_operation ON properties (operation);
CREATE INDEX idx_properties_type ON properties (property_type);
CREATE INDEX idx_properties_price_uf ON properties (price_uf);
CREATE INDEX idx_properties_price_clp ON properties (price_clp);
CREATE INDEX idx_properties_commune ON properties (commune_id);
CREATE INDEX idx_properties_bedrooms ON properties (bedrooms);
CREATE INDEX idx_properties_area ON properties (built_area_m2);
CREATE INDEX idx_properties_active ON properties (is_active) WHERE is_active = true;

-- Dedup indexes
CREATE INDEX idx_properties_hash ON properties (content_hash);
CREATE INDEX idx_properties_fingerprint ON properties (fingerprint);
CREATE INDEX idx_properties_source ON properties (primary_source, primary_external_id);

-- Composite index for frequent searches
CREATE INDEX idx_properties_search_combo
  ON properties (operation, property_type, commune_id, price_uf)
  WHERE is_active = true;

-- Full-text search trigger (Spanish)
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.sector, '')), 'B') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.address, '')), 'B') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_search_vector
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();
-- Cross-portal tracking
CREATE TABLE property_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN (
    'portalinmobiliario', 'mercadolibre', 'toctoc', 'yapo'
  )),
  external_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_price_clp BIGINT,
  source_price_uf DECIMAL(12,2),
  last_checked_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source, external_id)
);
CREATE INDEX idx_psources_property ON property_sources (property_id);

-- Price history
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  price_clp BIGINT,
  price_uf DECIMAL(12,2),
  recorded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_price_history_property ON price_history (property_id, recorded_at DESC);

-- Property images
CREATE TABLE property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  storage_path TEXT,
  position SMALLINT DEFAULT 0,
  width SMALLINT,
  height SMALLINT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_images_property ON property_images (property_id, position);
-- Users (freemium model)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  plan_expires_at TIMESTAMPTZ,
  max_saved_searches INTEGER DEFAULT 3,
  max_favorites INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Saved searches / alerts
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('instant', 'daily', 'weekly')),
  is_active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMPTZ,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_saved_searches_user ON saved_searches (user_id);
CREATE INDEX idx_saved_searches_active ON saved_searches (is_active) WHERE is_active = true;

-- Favorites
CREATE TABLE favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, property_id)
);
CREATE TABLE scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  job_type TEXT DEFAULT 'full' CHECK (job_type IN ('full', 'incremental', 'check')),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed'
  )),
  listings_found INTEGER DEFAULT 0,
  listings_new INTEGER DEFAULT 0,
  listings_updated INTEGER DEFAULT 0,
  listings_deactivated INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_jobs_source_status ON scraping_jobs (source, status);
-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Properties: public read, service_role write
CREATE POLICY "Properties are viewable by everyone"
  ON properties FOR SELECT USING (true);

-- Users: own profile only
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid() = id);

-- Saved searches: own user only
CREATE POLICY "Users can manage own searches"
  ON saved_searches FOR ALL USING (auth.uid() = user_id);

-- Favorites: own user only
CREATE POLICY "Users can manage own favorites"
  ON favorites FOR ALL USING (auth.uid() = user_id);
-- Add explicit lat/lng columns for easy filtering with Supabase JS
-- The geometry(Point) column remains for spatial indexes and advanced queries
ALTER TABLE properties ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE INDEX idx_properties_lat_lng ON properties (latitude, longitude) WHERE latitude IS NOT NULL;

-- Backfill from existing geometry column
UPDATE properties
SET latitude = ST_Y(location::geometry),
    longitude = ST_X(location::geometry)
WHERE location IS NOT NULL AND latitude IS NULL;

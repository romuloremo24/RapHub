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

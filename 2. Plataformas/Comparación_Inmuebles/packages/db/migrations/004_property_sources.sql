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

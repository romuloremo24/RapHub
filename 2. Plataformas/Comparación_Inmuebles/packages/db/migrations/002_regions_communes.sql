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

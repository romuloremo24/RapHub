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

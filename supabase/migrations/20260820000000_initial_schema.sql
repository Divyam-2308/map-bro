-- ============================================================================
-- MAP-BRO PROTOTYPE: Supabase Postgres + PostGIS Database Schema
-- Hackathon Project: "Build What Moves India"
--
-- PURPOSE & SCOPE:
-- High-performance, open-access land records & zoning lookup engine.
-- Prototype uses 100% synthetic/mock data to comply with data privacy ethics.
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

-- Why uuid-ossp / pgcrypto?
-- UUIDv4 identifiers avoid auto-incrementing ID enumeration attacks, prevent
-- key collisions during distributed multi-state ETL, and enable offline ID generation.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Why postgis?
-- Industry standard for geospatial computing. Adds 2D/3D geometry data types,
-- spatial indexing (GiST R-Tree), coordinate transformations (WGS 84 SRID 4326),
-- spatial relationship predicates (ST_Intersects, ST_Contains), and GeoJSON converters.
CREATE EXTENSION IF NOT EXISTS "postgis";


-- ============================================================================
-- 2. RELATIONAL HIERARCHY TABLES (Mirroring Indian LGD Governance)
-- ============================================================================

-- 2.1 States
-- Top-level administrative division (e.g., Gujarat, Maharashtra).
CREATE TABLE IF NOT EXISTS states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE -- Standard 2-letter ISO code (e.g., 'GJ', 'MH', 'RJ')
);

-- 2.2 Districts
-- Child of state.
-- Why composite UNIQUE(state_id, name)? Prevents duplicate district names within
-- the same state while allowing identical names across different states.
CREATE TABLE IF NOT EXISTS districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    CONSTRAINT uq_districts_state_name UNIQUE (state_id, name)
);

-- 2.3 Talukas (Sub-districts / Tehsils)
-- Administrative sub-unit under a district.
CREATE TABLE IF NOT EXISTS talukas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    CONSTRAINT uq_talukas_district_name UNIQUE (district_id, name)
);

-- 2.4 Villages (Revenue Units)
-- Base unit for cadastral records.
-- Why MultiPolygon? Real-world village boundaries frequently contain disjoint
-- exclaves, enclaves, or non-contiguous revenue tracts.
-- Why SRID 4326? Standard WGS 84 GPS coordinate system (longitude, latitude)
-- directly consumable by map renderers (Leaflet, Mapbox GL JS, MapLibre).
CREATE TABLE IF NOT EXISTS villages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taluka_id UUID NOT NULL REFERENCES talukas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lgd_code TEXT, -- Official Local Government Directory census/revenue code
    geom GEOMETRY(MultiPolygon, 4326),
    CONSTRAINT uq_villages_taluka_name UNIQUE (taluka_id, name)
);

-- 2.5 Zones (Development Plans 'DP' / Town Planning Schemes 'TP')
-- Represents urban planning and zoning overlays that intersect land parcels.
-- Why MultiPolygon? Planning zones can span non-contiguous development sectors.
-- Why is_mock? Flags prototype/synthetic entries to prevent mixing with real records.
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id UUID NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
    zone_type TEXT NOT NULL CHECK (zone_type IN ('DP', 'TP')),
    zone_name TEXT,
    scheme_no TEXT,     -- e.g., 'TP-14', 'DP-Sector-8'
    authority TEXT,     -- e.g., 'AUDA', 'PMRDA', 'DDA'
    geom GEOMETRY(MultiPolygon, 4326),
    source_url TEXT,
    is_mock BOOLEAN NOT NULL DEFAULT true
);

-- 2.6 Land Parcels (Cadastral Survey Plots)
-- Core spatial entity representing discrete land boundaries.
-- Why Polygon? Individual survey numbers are discrete contiguous plots.
-- Why ON DELETE SET NULL on zone_id? A land parcel exists legally in revenue
-- records even if an urban planning scheme is revoked or revised.
CREATE TABLE IF NOT EXISTS land_parcels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id UUID NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    survey_no TEXT NOT NULL,
    area_sqm NUMERIC,
    land_use TEXT,      -- e.g., 'Agricultural', 'Residential (R1)', 'Commercial'
    geom GEOMETRY(Polygon, 4326),
    source TEXT,
    is_mock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.7 Owners (Ownership Ledger / 7/12 Extract)
-- Relates owners to land parcels. Supports multiple owners per parcel.
-- Why separate from land_parcels? Enables 1:N joint ownership structures
-- (co-owners, leaseholders, corporate holdings) without duplicating spatial data.
CREATE TABLE IF NOT EXISTS owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
    owner_name TEXT NOT NULL,
    ownership_type TEXT, -- e.g., 'Individual Freehold', 'Joint Ownership', 'Leasehold'
    is_mock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 Data Sources Registry
-- Reference registry documenting official state land record portals for future
-- production integration (not used as active live feeds during prototype).
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state TEXT,
    source_name TEXT,
    url TEXT,
    data_type TEXT,
    notes TEXT
);


-- ============================================================================
-- 3. SPATIAL & RELATIONAL INDEXING STRATEGY
-- ============================================================================

-- Why GiST (Generalized Search Tree) Indexes on GEOMETRY columns?
-- Standard B-Trees only index 1D ordered data. Spatial operations (bounding box
-- intersections, point-in-polygon queries) require 2D R-Tree search trees.
-- GiST indexes accelerate ST_Intersects, ST_Contains, and bounding box searches to O(log N).
CREATE INDEX IF NOT EXISTS idx_land_parcels_geom ON land_parcels USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_zones_geom ON zones USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_villages_geom ON villages USING GIST (geom);

-- Why B-Tree Indexes on Foreign Keys?
-- Eliminates sequential table scans when querying records by parent entity
-- (e.g., finding all parcels within a selected village).
CREATE INDEX IF NOT EXISTS idx_land_parcels_village_id ON land_parcels (village_id);
CREATE INDEX IF NOT EXISTS idx_districts_state_id ON districts (state_id);
CREATE INDEX IF NOT EXISTS idx_talukas_district_id ON talukas (district_id);
CREATE INDEX IF NOT EXISTS idx_villages_taluka_id ON villages (taluka_id);
CREATE INDEX IF NOT EXISTS idx_zones_village_id ON zones (village_id);
CREATE INDEX IF NOT EXISTS idx_owners_parcel_id ON owners (parcel_id);


-- ============================================================================
-- 4. SERVER-SIDE GEOJSON ASSEMBLY RPC FUNCTION
-- ============================================================================

-- Why assemble GeoJSON in PostgreSQL?
-- 1. Minimizes network transfer by streaming a single compressed FeatureCollection JSON.
-- 2. Eliminates N+1 queries by joining parcels, planning zones, and owners in a single DB pass.
-- 3. Directly consumable by Mapbox GL JS, MapLibre, and Leaflet via `map.addSource('parcels', { data })`.
CREATE OR REPLACE FUNCTION get_parcels_geojson(village_uuid UUID)
RETURNS JSON
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(
      json_agg(
        json_build_object(
          'type', 'Feature',
          'id', lp.id,
          'geometry', ST_AsGeoJSON(lp.geom)::json,
          'properties', json_build_object(
            'id', lp.id,
            'survey_no', lp.survey_no,
            'area_sqm', lp.area_sqm,
            'land_use', lp.land_use,
            'zone_type', z.zone_type,
            'zone_name', z.zone_name,
            'owner_name', o.owner_name,
            'is_mock', lp.is_mock
          )
        )
      ),
      '[]'::json
    )
  )
  FROM land_parcels lp
  LEFT JOIN zones z ON lp.zone_id = z.id
  LEFT JOIN (
    -- Deterministic join for owner name per parcel
    SELECT DISTINCT ON (parcel_id) parcel_id, owner_name
    FROM owners
    ORDER BY parcel_id, created_at ASC
  ) o ON lp.id = o.parcel_id
  WHERE lp.village_id = village_uuid;
$$;

-- Grant execution permissions to anon/authenticated client roles for Supabase RPC
GRANT EXECUTE ON FUNCTION get_parcels_geojson(UUID) TO anon, authenticated, service_role;


-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) & PUBLIC READ-ONLY POLICIES
-- ============================================================================

-- Why RLS with explicit read-only policies?
-- 1. Public prototype requires seamless, unauthenticated SELECT access for fast map rendering.
-- 2. Prevents unauthorized INSERT, UPDATE, or DELETE operations by omitting write policies for the public role.
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE talukas ENABLE ROW LEVEL SECURITY;
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-only access for states" ON states;
CREATE POLICY "Allow public read-only access for states" ON states FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read-only access for districts" ON districts;
CREATE POLICY "Allow public read-only access for districts" ON districts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read-only access for talukas" ON talukas;
CREATE POLICY "Allow public read-only access for talukas" ON talukas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read-only access for villages" ON villages;
CREATE POLICY "Allow public read-only access for villages" ON villages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read-only access for zones" ON zones;
CREATE POLICY "Allow public read-only access for zones" ON zones FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read-only access for land_parcels" ON land_parcels;
CREATE POLICY "Allow public read-only access for land_parcels" ON land_parcels FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read-only access for owners" ON owners;
CREATE POLICY "Allow public read-only access for owners" ON owners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read-only access for data_sources" ON data_sources;
CREATE POLICY "Allow public read-only access for data_sources" ON data_sources FOR SELECT USING (true);

-- ============================================================================
-- MAP-BRO PROTOTYPE: Complete All-in-One Schema & Seed Script
-- Hackathon Project: "Build What Moves India"
-- Target: Supabase Postgres + PostGIS
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
CREATE TABLE IF NOT EXISTS states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE
);

-- 2.2 Districts
CREATE TABLE IF NOT EXISTS districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    CONSTRAINT uq_districts_state_name UNIQUE (state_id, name)
);

-- 2.3 Talukas (Sub-districts / Tehsils)
CREATE TABLE IF NOT EXISTS talukas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    CONSTRAINT uq_talukas_district_name UNIQUE (district_id, name)
);

-- 2.4 Villages (Revenue Units)
-- Why MultiPolygon? Real-world village boundaries frequently contain disjoint
-- exclaves, enclaves, or non-contiguous revenue tracts.
CREATE TABLE IF NOT EXISTS villages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taluka_id UUID NOT NULL REFERENCES talukas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lgd_code TEXT,
    geom GEOMETRY(MultiPolygon, 4326),
    CONSTRAINT uq_villages_taluka_name UNIQUE (taluka_id, name)
);

-- 2.5 Zones (Development Plans 'DP' / Town Planning Schemes 'TP')
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id UUID NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
    zone_type TEXT NOT NULL CHECK (zone_type IN ('DP', 'TP')),
    zone_name TEXT,
    scheme_no TEXT,
    authority TEXT,
    geom GEOMETRY(MultiPolygon, 4326),
    source_url TEXT,
    is_mock BOOLEAN NOT NULL DEFAULT true
);

-- 2.6 Land Parcels (Cadastral Survey Plots)
-- Why Polygon? Individual survey numbers are discrete contiguous plots.
-- Why ON DELETE SET NULL on zone_id? A land parcel exists legally in revenue
-- records even if an urban planning scheme is revoked or revised.
CREATE TABLE IF NOT EXISTS land_parcels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    village_id UUID NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    survey_no TEXT NOT NULL,
    area_sqm NUMERIC,
    land_use TEXT,
    geom GEOMETRY(Polygon, 4326),
    source TEXT,
    is_mock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.7 Owners (Ownership Ledger / 7/12 Extract)
-- Relates owners to land parcels. Supports multiple owners per parcel.
CREATE TABLE IF NOT EXISTS owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
    owner_name TEXT NOT NULL,
    ownership_type TEXT,
    is_mock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 Data Sources Registry
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

-- GiST Indexes for Spatial Operations (ST_Intersects, ST_Contains, Bounding Box &&)
CREATE INDEX IF NOT EXISTS idx_land_parcels_geom ON land_parcels USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_zones_geom ON zones USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_villages_geom ON villages USING GIST (geom);

-- B-Tree Indexes on Foreign Keys (Eliminating sequential table scans on joins)
CREATE INDEX IF NOT EXISTS idx_land_parcels_village_id ON land_parcels (village_id);
CREATE INDEX IF NOT EXISTS idx_districts_state_id ON districts (state_id);
CREATE INDEX IF NOT EXISTS idx_talukas_district_id ON talukas (district_id);
CREATE INDEX IF NOT EXISTS idx_villages_taluka_id ON villages (taluka_id);
CREATE INDEX IF NOT EXISTS idx_zones_village_id ON zones (village_id);
CREATE INDEX IF NOT EXISTS idx_owners_parcel_id ON owners (parcel_id);


-- ============================================================================
-- 4. SERVER-SIDE GEOJSON ASSEMBLY RPC FUNCTION
-- ============================================================================

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
    SELECT DISTINCT ON (parcel_id) parcel_id, owner_name
    FROM owners
    ORDER BY parcel_id, created_at ASC
  ) o ON lp.id = o.parcel_id
  WHERE lp.village_id = village_uuid;
$$;

GRANT EXECUTE ON FUNCTION get_parcels_geojson(UUID) TO anon, authenticated, service_role;


-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) & PUBLIC READ-ONLY POLICIES
-- ============================================================================

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


-- ============================================================================
-- 6. SEED DATA (MOCK DEMO DATA)
-- ============================================================================

-- States
INSERT INTO states (id, name, code)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'Gujarat', 'GJ'),
    ('b2222222-2222-2222-2222-222222222222', 'Maharashtra', 'MH')
ON CONFLICT (name) DO NOTHING;

-- Districts
INSERT INTO districts (id, state_id, name, code)
VALUES
    ('a2222222-2222-2222-2222-222222222221', 'a1111111-1111-1111-1111-111111111111', 'Ahmedabad', 'AHM'),
    ('b3333333-3333-3333-3333-333333333331', 'b2222222-2222-2222-2222-222222222222', 'Pune', 'PUN')
ON CONFLICT (state_id, name) DO NOTHING;

-- Talukas
INSERT INTO talukas (id, district_id, name, code)
VALUES
    ('a3333333-3333-3333-3333-333333333331', 'a2222222-2222-2222-2222-222222222221', 'Daskroi', 'DSK'),
    ('b4444444-4444-4444-4444-444444444441', 'b3333333-3333-3333-3333-333333333331', 'Haveli', 'HVL')
ON CONFLICT (district_id, name) DO NOTHING;

-- Villages
INSERT INTO villages (id, taluka_id, name, lgd_code, geom)
VALUES
    (
        'a4444444-4444-4444-4444-444444444441',
        'a3333333-3333-3333-3333-333333333331',
        'Sanand Rural (Demo)',
        '511001',
        ST_GeomFromText('MULTIPOLYGON(((72.3700 22.9800, 72.3950 22.9800, 72.3950 23.0050, 72.3700 23.0050, 72.3700 22.9800)))', 4326)
    ),
    (
        'a4444444-4444-4444-4444-444444444442',
        'a3333333-3333-3333-3333-333333333331',
        'Bavla Rural (Demo)',
        '511002',
        ST_GeomFromText('MULTIPOLYGON(((72.3500 22.8200, 72.3750 22.8200, 72.3750 22.8450, 72.3500 22.8450, 72.3500 22.8200)))', 4326)
    ),
    (
        'b5555555-5555-5555-5555-555555555551',
        'b4444444-4444-4444-4444-444444444441',
        'Wagholi (Demo)',
        '556001',
        ST_GeomFromText('MULTIPOLYGON(((73.9700 18.5700, 73.9950 18.5700, 73.9950 18.5950, 73.9700 18.5950, 73.9700 18.5700)))', 4326)
    ),
    (
        'b5555555-5555-5555-5555-555555555552',
        'b4444444-4444-4444-4444-444444444441',
        'Pirangut (Demo)',
        '556002',
        ST_GeomFromText('MULTIPOLYGON(((73.6700 18.5000, 73.6950 18.5000, 73.6950 18.5250, 73.6700 18.5250, 73.6700 18.5000)))', 4326)
    )
ON CONFLICT (taluka_id, name) DO NOTHING;

-- Zones
INSERT INTO zones (id, village_id, zone_type, zone_name, scheme_no, authority, geom, source_url, is_mock)
VALUES
    (
        'a6666666-6666-6666-6666-666666666661',
        'a4444444-4444-4444-4444-444444444441',
        'TP',
        'Sanand Growth Center TP Scheme',
        'TP-14',
        'AUDA (Ahmedabad Urban Development Authority)',
        ST_GeomFromText('MULTIPOLYGON(((72.3720 22.9820, 72.3920 22.9820, 72.3920 23.0020, 72.3720 23.0020, 72.3720 22.9820)))', 4326),
        'https://auda.org.in/mock-scheme-14',
        true
    ),
    (
        'b6666666-6666-6666-6666-666666666661',
        'b5555555-5555-5555-5555-555555555551',
        'DP',
        'Pune Metro Region Development Plan Sector 8',
        'DP-PMRDA-08',
        'PMRDA (Pune Metropolitan Region Development Authority)',
        ST_GeomFromText('MULTIPOLYGON(((73.9720 18.5720, 73.9920 18.5720, 73.9920 18.5920, 73.9720 18.5920, 73.9720 18.5720)))', 4326),
        'https://pmrda.gov.in/mock-dp-08',
        true
    )
ON CONFLICT DO NOTHING;

-- Land Parcels
INSERT INTO land_parcels (id, village_id, zone_id, survey_no, area_sqm, land_use, geom, source, is_mock)
VALUES
    -- Village: Sanand Rural (Demo)
    (
        'c1111111-1111-1111-1111-111111111101',
        'a4444444-4444-4444-4444-444444444441',
        'a6666666-6666-6666-6666-666666666661',
        'MOCK-GJ-SND-101/A',
        2450.75,
        'Agricultural',
        ST_GeomFromText('POLYGON((72.3750 22.9850, 72.3780 22.9850, 72.3780 22.9880, 72.3750 22.9880, 72.3750 22.9850))', 4326),
        'Mock AnyRoR Dataset',
        true
    ),
    (
        'c1111111-1111-1111-1111-111111111102',
        'a4444444-4444-4444-4444-444444444441',
        'a6666666-6666-6666-6666-666666666661',
        'MOCK-GJ-SND-102/B',
        1820.50,
        'Residential (R1)',
        ST_GeomFromText('POLYGON((72.3785 22.9850, 72.3815 22.9850, 72.3815 22.9880, 72.3785 22.9880, 72.3785 22.9850))', 4326),
        'Mock AnyRoR Dataset',
        true
    ),
    (
        'c1111111-1111-1111-1111-111111111103',
        'a4444444-4444-4444-4444-444444444441',
        NULL,
        'MOCK-GJ-SND-103',
        3100.00,
        'Commercial',
        ST_GeomFromText('POLYGON((72.3820 22.9850, 72.3855 22.9850, 72.3855 22.9880, 72.3820 22.9880, 72.3820 22.9850))', 4326),
        'Mock AnyRoR Dataset',
        true
    ),

    -- Village: Bavla Rural (Demo)
    (
        'c1111111-1111-1111-1111-111111111104',
        'a4444444-4444-4444-4444-444444444442',
        NULL,
        'MOCK-GJ-BVL-201/1',
        4500.00,
        'Industrial (GIDC)',
        ST_GeomFromText('POLYGON((72.3550 22.8250, 72.3600 22.8250, 72.3600 22.8300, 72.3550 22.8300, 72.3550 22.8250))', 4326),
        'Mock AnyRoR Dataset',
        true
    ),
    (
        'c1111111-1111-1111-1111-111111111105',
        'a4444444-4444-4444-4444-444444444442',
        NULL,
        'MOCK-GJ-BVL-202/2',
        1980.20,
        'Agricultural',
        ST_GeomFromText('POLYGON((72.3610 22.8250, 72.3650 22.8250, 72.3650 22.8300, 72.3610 22.8300, 72.3610 22.8250))', 4326),
        'Mock AnyRoR Dataset',
        true
    ),

    -- Village: Wagholi (Demo)
    (
        'c1111111-1111-1111-1111-111111111106',
        'b5555555-5555-5555-5555-555555555551',
        'b6666666-6666-6666-6666-666666666661',
        'MOCK-MH-WGH-301/1',
        3200.00,
        'Residential (R2)',
        ST_GeomFromText('POLYGON((73.9750 18.5750, 73.9800 18.5750, 73.9800 18.5800, 73.9750 18.5800, 73.9750 18.5750))', 4326),
        'Mock Mahabhulekh Dataset',
        true
    ),
    (
        'c1111111-1111-1111-1111-111111111107',
        'b5555555-5555-5555-5555-555555555551',
        'b6666666-6666-6666-6666-666666666661',
        'MOCK-MH-WGH-302/2',
        2150.50,
        'Commercial',
        ST_GeomFromText('POLYGON((73.9805 18.5750, 73.9850 18.5750, 73.9850 18.5800, 73.9805 18.5800, 73.9805 18.5750))', 4326),
        'Mock Mahabhulekh Dataset',
        true
    ),
    (
        'c1111111-1111-1111-1111-111111111108',
        'b5555555-5555-5555-5555-555555555551',
        NULL,
        'MOCK-MH-WGH-303',
        1400.00,
        'Agricultural',
        ST_GeomFromText('POLYGON((73.9855 18.5750, 73.9900 18.5750, 73.9900 18.5800, 73.9855 18.5800, 73.9855 18.5750))', 4326),
        'Mock Mahabhulekh Dataset',
        true
    ),

    -- Village: Pirangut (Demo)
    (
        'c1111111-1111-1111-1111-111111111109',
        'b5555555-5555-5555-5555-555555555552',
        NULL,
        'MOCK-MH-PRG-401/1',
        5200.00,
        'Industrial',
        ST_GeomFromText('POLYGON((73.6750 18.5050, 73.6800 18.5050, 73.6800 18.5120, 73.6750 18.5120, 73.6750 18.5050))', 4326),
        'Mock Mahabhulekh Dataset',
        true
    ),
    (
        'c1111111-1111-1111-1111-111111111110',
        'b5555555-5555-5555-5555-555555555552',
        NULL,
        'MOCK-MH-PRG-402/2',
        2800.00,
        'Agricultural',
        ST_GeomFromText('POLYGON((73.6810 18.5050, 73.6860 18.5050, 73.6860 18.5120, 73.6810 18.5120, 73.6810 18.5050))', 4326),
        'Mock Mahabhulekh Dataset',
        true
    )
ON CONFLICT DO NOTHING;

-- Owners
INSERT INTO owners (id, parcel_id, owner_name, ownership_type, is_mock)
VALUES
    ('d1111111-1111-1111-1111-111111111101', 'c1111111-1111-1111-1111-111111111101', 'Demo Owner 1 (Patel)', 'Individual Freehold', true),
    ('d1111111-1111-1111-1111-111111111102', 'c1111111-1111-1111-1111-111111111102', 'Demo Owner 2 (Shah)', 'Joint Ownership', true),
    ('d1111111-1111-1111-1111-111111111103', 'c1111111-1111-1111-1111-111111111103', 'Demo Owner 3 (Desai Commercial Holdings)', 'Corporate Entity', true),
    ('d1111111-1111-1111-1111-111111111104', 'c1111111-1111-1111-1111-111111111104', 'Demo Owner 4 (Gujarat Agro Corp Demo)', 'Leasehold', true),
    ('d1111111-1111-1111-1111-111111111105', 'c1111111-1111-1111-1111-111111111105', 'Demo Owner 5 (Mehta)', 'Individual Freehold', true),
    ('d1111111-1111-1111-1111-111111111106', 'c1111111-1111-1111-1111-111111111106', 'Demo Owner 6 (Joshi)', 'Individual Freehold', true),
    ('d1111111-1111-1111-1111-111111111107', 'c1111111-1111-1111-1111-111111111107', 'Demo Owner 7 (Kulkarni Ventures Demo)', 'Partnership Firm', true),
    ('d1111111-1111-1111-1111-111111111108', 'c1111111-1111-1111-1111-111111111108', 'Demo Owner 8 (Shinde)', 'Individual Freehold', true),
    ('d1111111-1111-1111-1111-111111111109', 'c1111111-1111-1111-1111-111111111109', 'Demo Owner 9 (Sahyadri Logistics Demo)', 'Corporate Entity', true),
    ('d1111111-1111-1111-1111-111111111110', 'c1111111-1111-1111-1111-111111111110', 'Demo Owner 10 (Pawar)', 'Individual Freehold', true)
ON CONFLICT DO NOTHING;

-- Data Sources (Production Reference)
INSERT INTO data_sources (id, state, source_name, url, data_type, notes)
VALUES
    (
        'e1111111-1111-1111-1111-111111111101',
        'Gujarat',
        'AnyRoR (Any Records at Anywhere)',
        'https://anyror.gujarat.gov.in',
        '7/12 & 8A Land Records, RoR, E-Dhara',
        'Official Gujarat Revenue Department portal providing digital records of rights (7/12, 8A) and village form mutation ledger.'
    ),
    (
        'e1111111-1111-1111-1111-111111111102',
        'Maharashtra',
        'Mahabhulekh (Bhumi Abhilekh)',
        'https://bhulekh.mahabhumi.gov.in',
        '7/12 Extract, 8A, Property Card (Malmatta Patrak)',
        'Maharashtra land record portal providing digitally signed 7/12 extracts, property cards for urban areas, and mutation status.'
    ),
    (
        'e1111111-1111-1111-1111-111111111103',
        'Rajasthan',
        'Apna Khata / Bhu Naksha Rajasthan',
        'https://apnakhata.rajasthan.gov.in',
        'Cadastral Maps, Jamabandi, Khasra Details',
        'Digitized cadastral parcel maps and land revenue records (Jamabandi/Khasra) for Rajasthan state.'
    ),
    (
        'e1111111-1111-1111-1111-111111111104',
        'All-India',
        'Bhuvan / ISRO Geospatial Platform',
        'https://bhuvan.nrsc.gov.in',
        'Satellite Imagery, LULC 1:50k/1:10k, Thematic Layers',
        'National geospatial portal by ISRO/NRSC providing high-resolution multi-temporal satellite imagery, land use land cover, and GIS layers.'
    ),
    (
        'e1111111-1111-1111-1111-111111111105',
        'All-India',
        'National Generic Document Registration System (NGDRS)',
        'https://ngdrs.gov.in',
        'Deed Registration, Circle Rates, Stamp Duty Valuation',
        'One-Nation One-Software initiative by Department of Land Resources (DoLR) for deed registration and automated circle rate calculations.'
    )
ON CONFLICT DO NOTHING;

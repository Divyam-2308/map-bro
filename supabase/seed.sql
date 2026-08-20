-- ============================================================================
-- MAP-BRO PROTOTYPE: Demo & Seed Data
-- Hackathon: Build What Moves India
-- Context: DEMO/PROTOTYPE ONLY. All owner/parcel data is synthetic/mock.
-- ============================================================================

-- 1. States
INSERT INTO states (id, name, code)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'Gujarat', 'GJ'),
    ('b2222222-2222-2222-2222-222222222222', 'Maharashtra', 'MH')
ON CONFLICT (name) DO NOTHING;

-- 2. Districts
INSERT INTO districts (id, state_id, name, code)
VALUES
    ('a2222222-2222-2222-2222-222222222221', 'a1111111-1111-1111-1111-111111111111', 'Ahmedabad', 'AHM'),
    ('b3333333-3333-3333-3333-333333333331', 'b2222222-2222-2222-2222-222222222222', 'Pune', 'PUN')
ON CONFLICT (state_id, name) DO NOTHING;

-- 3. Talukas
INSERT INTO talukas (id, district_id, name, code)
VALUES
    ('a3333333-3333-3333-3333-333333333331', 'a2222222-2222-2222-2222-222222222221', 'Daskroi', 'DSK'),
    ('b4444444-4444-4444-4444-444444444441', 'b3333333-3333-3333-3333-333333333331', 'Haveli', 'HVL')
ON CONFLICT (district_id, name) DO NOTHING;

-- 4. Villages (MultiPolygon boundaries in SRID 4326)
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

-- 5. Zones (DP/TP)
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

-- 6. Land Parcels (Polygon in SRID 4326)
INSERT INTO land_parcels (id, village_id, zone_id, survey_no, area_sqm, land_use, geom, source, is_mock)
VALUES
    -- Village 1: Sanand Rural (Demo)
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

    -- Village 2: Bavla Rural (Demo)
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

    -- Village 3: Wagholi (Demo)
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

    -- Village 4: Pirangut (Demo)
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

-- 7. Owners (1 mock owner per parcel)
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

-- 8. Data Sources (Production reference documentation)
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

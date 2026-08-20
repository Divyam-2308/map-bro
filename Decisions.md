# Architecture & Technical Decisions Log (`Decisions.md`)

> **Project**: map-bro (Prototype / Hackathon: *Build What Moves India*)  
> **Core Purpose**: High-performance, open-access cadastral land records & zoning lookup engine.  
> **Philosophy**: Every decision in this document logs the **"why"** behind architectural choices, database structures, spatial libraries, performance optimizations, and security configurations.

---

## Table of Contents
1. [System Architecture & Technology Choices](#1-system-architecture--technology-choices)
2. [Database Extensions (`postgis`, `pgcrypto`, `uuid-ossp`)](#2-database-extensions)
3. [Domain Hierarchy & Relational Schema Design](#3-domain-hierarchy--relational-schema-design)
4. [Spatial Modeling & Geometry Choices (SRID 4326, Polygons vs MultiPolygons)](#4-spatial-modeling--geometry-choices)
5. [Indexing Strategy (GiST vs B-Tree)](#5-indexing-strategy)
6. [Data Pipeline & GeoJSON Assembly (`get_parcels_geojson` RPC)](#6-data-pipeline--geojson-assembly)
7. [Row Level Security (RLS) & Access Control](#7-row-level-security-rls--access-control)
8. [Synthetic Data Strategy & Legal / Ethical Compliance](#8-synthetic-data-strategy--legal--ethical-compliance)
9. [Production Integration Roadmap (`data_sources`)](#9-production-integration-roadmap)

---

## 1. System Architecture & Technology Choices

### Why PostgreSQL + Supabase?
* **Why not MongoDB or DynamoDB?**  
  Cadastral maps and land ownership records are fundamentally relational and hierarchical (State &rarr; District &rarr; Taluka &rarr; Village &rarr; Parcel &rarr; Owner). Document stores lack native, performant spatial joins and relational integrity constraints across multi-tier administrative levels.
* **Why Supabase over a raw cloud VM with Postgres?**  
  1. **Instant PostGIS Support**: Provides pre-compiled, production-ready PostGIS binaries out-of-the-box.
  2. **Auto-Generated REST & RPC APIs**: Exposes database functions (like `get_parcels_geojson`) directly to frontend map libraries (Mapbox GL JS, Leaflet, OpenLayers) without needing an intermediate boilerplate backend.
  3. **Granular Row-Level Security (RLS)**: Enforces access control at the database kernel level rather than relying entirely on application code.

---

## 2. Database Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
```

### Why `postgis`?
* **Problem**: Storing GIS boundary coordinates as plain JSON/Text or lat/long floats makes spatial operations (e.g., *"Which land parcel does this GPS coordinate fall into?"* or *"Does this parcel intersect the Town Planning zone?"*) require full table scans and expensive CPU calculations in Javascript.
* **Decision**: Use PostGIS geometries. PostGIS adds spatial data types (`Polygon`, `MultiPolygon`), spatial predicates (`ST_Contains`, `ST_Intersects`, `ST_Within`), and native GeoJSON serialization (`ST_AsGeoJSON`).

### Why `uuid-ossp` / `pgcrypto` + UUIDv4?
* **Problem**: Auto-incrementing integer IDs (`1, 2, 3...`) leak total record counts, enable scraping via sequential enumeration attacks, and make merging databases across different states/districts prone to primary key collisions.
* **Decision**: Use 128-bit Universally Unique Identifiers (UUIDv4 via `gen_random_uuid()`). This allows decentralized, conflict-free data generation across state-level ingest workers.

---

## 3. Domain Hierarchy & Relational Schema Design

The schema directly reflects the **Local Government Directory (LGD)** governance hierarchy in India:

```
states (e.g., Gujarat, Maharashtra)
  └── districts (e.g., Ahmedabad, Pune)
       └── talukas / tehsils (e.g., Daskroi, Haveli)
            └── villages / revenue units (e.g., Sanand Rural, Wagholi)
                 ├── zones (Town Planning Schemes 'TP' / Development Plans 'DP')
                 └── land_parcels (Cadastral Survey Numbers, Land Use, Area)
                      └── owners (Ownership Ledger / 7/12 Extract Records)
```

### Key Relational Decisions:

1. **Composite Uniqueness on `(parent_id, name)`**:
   * *Why?* In India, village and taluka names are frequently repeated across different districts (e.g., multiple villages named "Rampur" or "Pipali"). Enforcing global name uniqueness would break data ingestion. Uniqueness must be scoped strictly within the parent administrative unit (`UNIQUE(taluka_id, name)`).
2. **`ON DELETE CASCADE` for Administrative Hierarchy**:
   * *Why?* If a taluka or village boundary is deprecated or deleted during administrative re-organization, all child records (which cannot exist without parent territorial authority) are cleaned up automatically.
3. **`ON DELETE SET NULL` for `land_parcels.zone_id`**:
   * *Why?* A land parcel exists physically and legally in revenue records regardless of whether an urban development scheme (DP/TP) is active, drafted, or revoked. Deleting a zone scheme should never delete the underlying land parcel.

---

## 4. Spatial Modeling & Geometry Choices

### Why SRID 4326 (WGS 84)?
* **Why not EPSG:3857 (Web Mercator) or UTM Projected Zones?**  
  * **EPSG 4326** is the universal standard for GPS, GeoJSON (RFC 7946), Mapbox, Leaflet, and standard geo APIs. Coordinates are stored as `(longitude, latitude)` in decimal degrees.
  * Web-mapping clients consume EPSG 4326 coordinates directly without needing on-the-fly client-side reprojection overhead.

### Why `MultiPolygon` for `villages` & `zones` vs `Polygon` for `land_parcels`?
* **Villages & Planning Zones (`MultiPolygon`)**: Real administrative territories and urban development schemes often consist of non-contiguous geographical pockets, exclaves, waterbody exclusions, or island areas. `MultiPolygon` accommodates both single contiguous shapes and multi-part geometries without schema errors.
* **Land Parcels (`Polygon`)**: An individual cadastral survey plot is defined in revenue maps as a single contiguous closed polygon.

---

## 5. Indexing Strategy

```sql
-- Spatial GiST Index
CREATE INDEX idx_land_parcels_geom ON land_parcels USING GIST (geom);
CREATE INDEX idx_zones_geom ON zones USING GIST (geom);
CREATE INDEX idx_villages_geom ON villages USING GIST (geom);

-- Relational Foreign Key B-Tree Indexes
CREATE INDEX idx_land_parcels_village_id ON land_parcels (village_id);
```

### Why GiST (Generalized Search Tree) for Spatial Columns?
* Standard B-Trees only sort 1-dimensional scalar data (e.g. `<, =, >`). Spatial geometries are 2-dimensional bounding boxes $(X_{min}, Y_{min}, X_{max}, Y_{max})$.
* **GiST indexes create an R-Tree hierarchy**. When querying *"find parcels near coordinate $(X, Y)$"*, PostGIS uses the GiST index to eliminate entire geographic quadrants in $O(\log N)$ time, preventing slow sequential table scans over thousands of polygons.

### Why B-Tree Index on `land_parcels(village_id)`?
* The most frequent UI lookup is loading all parcels when a user zooms into or selects a specific village. Without an index on `village_id`, PostgreSQL must scan every parcel in the entire database.

---

## 6. Data Pipeline & GeoJSON Assembly (`get_parcels_geojson` RPC)

```sql
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
```

### Why assemble GeoJSON in the database instead of the frontend / API server?
1. **Network Payload Minimization**: Instead of sending multiple relational rows with separate geometry arrays, foreign keys, and owner tables, the database emits a single compressed, RFC 7946-compliant `FeatureCollection` payload ready for instant `map.addSource('parcels', { type: 'geojson', data })`.
2. **Zero N+1 Query Overhead**: Joins between `land_parcels`, `zones`, and `owners` happen inside Postgres memory in a single execution plan.
3. **`STABLE` Keyword Optimization**: Marks the function so the PostgreSQL query planner can cache and optimize repeated sub-plan evaluations within transaction blocks.

---

## 7. Row Level Security (RLS) & Access Control

```sql
ALTER TABLE land_parcels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access for land_parcels" 
ON land_parcels FOR SELECT USING (true);
```

### Why Enable RLS with Open Public Read-Only (`SELECT`) Access?
* **Open Public Prototype**: Citizens, planners, and investors need instant lookup capability without mandatory login walls.
* **Immunity against Public Write / Modification**: By only defining a `FOR SELECT` policy and omitting `INSERT`, `UPDATE`, or `DELETE` policies for the `anon` / `public` role, the database kernel strictly forbids unauthorized writes from client-side API requests.

---

## 8. Synthetic Data Strategy & Legal / Ethical Compliance

### Context: Hackathon (*Build What Moves India*)
* **Ethical Mandate**: Real land records and 7/12 extracts contain personally identifiable information (PII) and sensitive property ownership details subject to state privacy frameworks and portal terms of service.
* **Implementation Decisions**:
  1. **Explicit `is_mock = true` Flag**: Every spatial and ownership table carries a boolean `is_mock` flag default to `true`.
  2. **Clear Mock Nomenclature**: Survey numbers use unmistakable synthetic prefixes (`MOCK-GJ-SND-101/A`, `MOCK-MH-WGH-301/1`), and owners are named generically (`Demo Owner 1 (Patel)`, `Demo Owner 6 (Joshi)`).
  3. **Representative Geospatial Coordinates**: Polygons are placed in realistic approximate lat/long coordinates of real geographic talukas (e.g. Sanand, Ahmedabad @ `~22.98° N, 72.38° E` and Wagholi, Pune @ `~18.58° N, 73.98° E`) to validate map rendering and spatial queries without replicating real private cadastral boundaries.

---

## 9. Production Integration Roadmap (`data_sources`)

The `data_sources` table serves as an architectural registry documenting state-by-state integration endpoints for future production deployment:

| Portal / Authority | State | Record Types | Production Role |
| :--- | :--- | :--- | :--- |
| **AnyRoR (E-Dhara)** | Gujarat | 7/12, 8A, Village Forms | Official Record of Rights (RoR) sync |
| **Mahabhulekh** | Maharashtra | 7/12, 8A, Property Cards | Cadastral extract & mutation tracking |
| **Bhu Naksha / Apna Khata** | Rajasthan | Digitized Cadastral Maps | Spatial vector polygon extraction |
| **Bhuvan (ISRO/NRSC)** | All-India | Satellite Basemaps, LULC | Land Use Land Cover & satellite temporal layers |
| **NGDRS (DoLR)** | All-India | Deed Registration, Circle Rates | Property valuation & stamp duty assessment |

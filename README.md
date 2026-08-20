# 🗺️ map-bro

> **Hackathon Project**: *Build What Moves India*  
> **Mission**: Fast, open-access cadastral land records, zoning schemes (DP/TP), and spatial property boundary lookup engine.  
> **Disclaimer**: Prototype demo only. All owner names and parcel geometries are 100% synthetic/mock data (`is_mock = true`).

---

## 👥 Team Setup & Invitations

If you are a co-developer joining this project:
1. **GitHub**: Accept the repository collaborator invitation.
2. **Supabase**: Accept the project member invitation sent to your email. You will have full access to the live database, Table Editor, SQL Editor, and API logs in the Supabase Dashboard.

---

## ⚡ Quickstart Guide (Local Development Setup)

### 1. Clone the Repository
```bash
git clone https://github.com/<your-org-or-user>/map-bro.git
cd map-bro
```

### 2. Configure Environment Variables
Copy the template `.env.example` to `.env.local`:
```bash
# Windows PowerShell:
Copy-Item .env.example .env.local

# Linux / macOS / Git Bash:
cp .env.example .env.local
```

Open `.env.local` and verify your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
```

### 3. Python Environment Setup (Optional / Geospatial Tools)
If you are developing backend processing scripts or geospatial ETL pipelines:
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment:
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## 🏛️ Database Hierarchy & Architecture

The database is built on **PostgreSQL + PostGIS** hosted on Supabase, strictly mirroring India's **Local Government Directory (LGD)** governance model:

```
states (Gujarat 'GJ', Maharashtra 'MH')
 └── districts (Ahmedabad, Pune)
      └── talukas (Daskroi, Haveli)
           └── villages (Sanand Rural, Bavla Rural, Wagholi, Pirangut)
                ├── zones (TP Schemes, Development Plans)
                └── land_parcels (Survey numbers, Polygon geometries)
                     └── owners (Ownership ledger records)
+ data_sources (Registry of real state portals: AnyRoR, Mahabhulekh, etc.)
```

---

## 🛰️ How to Query the Map Data (API & RPC)

### Fetch GeoJSON via PostGIS Stored Procedure (`get_parcels_geojson`)

The database includes a server-side RPC function that aggregates parcels, zoning layers, and owner details into a single RFC 7946 GeoJSON `FeatureCollection`:

#### JavaScript / TypeScript Client:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Fetch GeoJSON for Sanand Rural (Demo Village UUID)
const { data: geojson, error } = await supabase.rpc('get_parcels_geojson', {
  village_uuid: 'a4444444-4444-4444-4444-444444444441'
});

// Directly pass to Mapbox / Leaflet / MapLibre:
// map.getSource('parcels').setData(geojson);
```

#### Python Client:
```python
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

response = supabase.rpc('get_parcels_geojson', {
    'village_uuid': 'a4444444-4444-4444-4444-444444444441'
}).execute()

print("GeoJSON Output:", response.data)
```

---

## 📁 Repository Structure

```
map-bro/
├── .env.example               # Template environment variables (safe to commit)
├── .env.local                 # Local environment keys (git-ignored)
├── .gitignore                  # Git rules protecting secrets and build artifacts
├── Decisions.md               # Technical Architecture Decision Record (ADR)
├── execution_of_flow.md       # Detailed system call graph and execution flow
├── requirements.txt           # Python dependencies for GIS and Supabase
├── README.md                  # Project overview and team onboarding guide
└── supabase/
    ├── config.toml            # Supabase local project configuration
    ├── schema_and_seed.sql    # Standalone all-in-one SQL setup script
    ├── seed.sql               # Mock demo data (GJ & MH parcels, owners)
    └── migrations/
        └── 20260820000000_initial_schema.sql  # Schema DDL, GiST indexes, RLS
```

---

## 📖 Key Documentation Links

* [Decisions.md](file:///d:/map-bro/Decisions.md) — Comprehensive technical rationale explaining why each database engine, extension, geometry type, index, and RLS policy was chosen.
* [execution_of_flow.md](file:///d:/map-bro/execution_of_flow.md) — Step-by-step execution order, entry points, and internal function call traces.
* [schema_and_seed.sql](file:///d:/map-bro/supabase/schema_and_seed.sql) — Consolidated SQL script for initializing new database instances in 1 click.

---

## 🔒 Security & Row Level Security (RLS)

* **Row Level Security (RLS)** is enabled across all tables.
* Public anonymous access is granted strictly for read-only (`SELECT`) queries.
* Mutations (`INSERT`, `UPDATE`, `DELETE`) are blocked for public roles to maintain prototype data integrity.
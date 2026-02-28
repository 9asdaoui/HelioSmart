# HelioSmart Backend - Solar Estimation System

## Overview

This backend implements the complete solar estimation logic from the Laravel EstimationController, providing comprehensive calculations, external API integrations, and full CRUD management for solar components.

## Architecture

### Services Layer (New)

All business logic has been extracted into services for better organization and testability:

#### 1. **PVWatts Service** (`app/services/pvwatts_service.py`)
- Integrates with NREL PVWatts API v8
- Provides monthly solar production estimates
- Returns annual production, capacity factor, and solar radiation data
- **Requires**: `PVWATTS_API_KEY` environment variable

#### 2. **Estimation Calculation Service** (`app/services/calculation_service.py`)
- `get_solar_average()`: Fetches solar irradiance from NASA POWER API
- `get_wind_and_snow_complexity()`: Gets wind speed and elevation data
- `select_best_fit_panel()`: Chooses optimal panel based on usable area and energy needs  
- `estimate_structure_cost()`: Calculates mounting structure costs (supports, rails, clamps, foundations)
- `calculate_usage_and_cost()`: Computes annual/monthly energy usage with seasonal patterns
- `calculate_total_system_loss()`: Determines system losses from voltage drops and component efficiencies

#### 3. **Inverter Service** (`app/services/inverter_service.py`)
- `select_best_inverter_combo()`: Finds optimal inverter configuration for given panel array
- `calculate_stringing()`: Designs string configuration per inverter considering MPPT voltage ranges
- Supports single and mixed inverter configurations
- Validates string lengths against temperature-adjusted Voc

#### 4. **Wiring Service** (`app/services/wiring_service.py`)
- `generate_wiring_specs()`: Creates DC/AC wiring specifications with voltage drop calculations
- `generate_bom()`: Produces Bill of Materials with costs (wire, MC4 connectors, fuses, junction boxes)
- `recommend_wire_size()`: Suggests wire gauge based on current
- `calculate_voltage_drop()`: Computes voltage drop percentages

#### 5. **Placeholder API Services** (`app/services/placeholder_apis.py`)

**Usable Area Detection Service**:
- Returns placeholder data until actual service is deployed
- Provides: `usable_area_m2`, `roof_polygon`, `usable_polygon`, `obstacles`, `roof_mask_image`
- Flag `_placeholder: true` indicates mock data
- Can switch to real API by calling `call_actual_api()` method

**Panel Placement Service**:
- Returns placeholder panel grid and positions
- Calculates estimated panel count based on usable area
- Provides: `panel_grid`, `panel_positions`, `panel_grid_image`, `visualization_image`
- Flag `_placeholder: true` indicates mock data

## Estimation Creation Flow

### Endpoint: `POST /api/v1/estimations/create-project`

#### Complete Workflow (Matches Laravel Logic):

1. **Validate Input** - Extract and validate all form parameters
2. **Calculate Electricity Rates** - Query utility rates or use default
3. **Get Solar Production Factor** - Call NASA POWER API for irradiance data
4. **Calculate Usage & Cost** - Apply seasonal patterns (balanced/summer/winter)
5. **Determine System Sizing** - Calculate required system capacity (kW)
6. **Save Roof Image** - Convert base64 to file, store in `storage/roof_images/`
7. **Call Usable Area Detection API** - Detect roof polygon and usable area (or use placeholder)
8. **Select Best-Fit Panel** - Choose optimal panel matching constraints
9. **Call Panel Placement API** - Generate panel layout (or use placeholder)
10. **Estimate Mounting Structure Cost** - Calculate supports, rails, clamps, foundations
11. **Select Inverter Combo** - Find best inverter configuration with auto-stringing
12. **Calculate Wiring** - Generate DC/AC wiring specs and BOM
13. **Calculate System Losses** - Use actual voltage drops and component efficiencies
14. **Call PVWatts API** - Get final monthly production estimates
15. **Save Estimation** - Store complete data in PostgreSQL

#### Request Parameters:

```python
{
    "latitude": float (required),
    "longitude": float (required),
    "customer_name": str (optional),
    "email": str (optional),
    "street": str (optional),
    "city": str (optional),
    "state": str (optional),
    "zip_code": str (optional),
    "country": str (optional),
    "satellite_image": str (base64, optional),
    "monthly_bill": float (optional),
    "usage_pattern": str ("balanced"/"summer"/"winter", default: "balanced"),
    "provider": int (utility_id, optional),
    "roof_type": str ("flat"/"tilted", optional),
    "roof_tilt": str/float (degrees or "low"/"medium"/"steep"),
    "building_stories": int (default: 1),
    "coverage_percentage": float (default: 80)
}
```

#### Response:

```json
{
    "success": true,
    "estimation_id": 123,
    "message": "Solar estimation completed successfully",
    "data": {
        "system_capacity": 5.2,
        "panel_count": 13,
        "annual_production": 8320.5,
        "estimated_savings": 12480.75
    }
}
```

## CRUD Endpoints

### Panels (`/api/v1/panels`)
- `POST /` - Create panel
- `GET /` - List panels (filter by status, brand)
- `GET /{id}` - Get panel details
- `PUT /{id}` - Update panel
- `DELETE /{id}` - Delete panel

### Inverters (`/api/v1/inverters`)
- `POST /` - Create inverter
- `GET /` - List inverters (filter by status, brand, power range)
- `GET /{id}` - Get inverter details
- `PUT /{id}` - Update inverter
- `DELETE /{id}` - Delete inverter

### Utilities (`/api/v1/utilities`)
- `POST /` - Create utility
- `GET /` - List utilities
- `GET /{id}` - Get utility details
- `PUT /{id}` - Update utility
- `DELETE /{id}` - Delete utility

### Solar Configurations (`/api/v1/solar-configurations`)
- `POST /` - Create configuration  
- `GET /` - List configurations
- `GET /{key}` - Get configuration by key
- `PUT /{key}` - Update configuration
- `DELETE /{key}` - Delete configuration

### Estimations (`/api/v1/estimations`)
- `GET /` - List estimations (filter by status)
- `GET /{id}` - Get estimation details
- `PUT /{id}` - Update estimation
- `DELETE /{id}` - Soft delete estimation

## External APIs Used

### 1. NREL PVWatts API v8
- **Purpose**: Solar energy production estimation
- **URL**: `https://developer.nrel.gov/api/pvwatts/v8.json`
- **API Key**: Required (set `PVWATTS_API_KEY` in `.env`)
- **Documentation**: https://developer.nrel.gov/docs/solar/pvwatts/v8/

### 2. NASA POWER API
- **Purpose**: Solar irradiance and wind speed data
- **URL**: `https://power.larc.nasa.gov/api/`
- **API Key**: Not required (free access)
- **Data**: ALLSKY_SFC_SW_DWN (solar), WS10M (wind speed)  

### 3. Open-Elevation API
- **Purpose**: Elevation data for snow load calculations
- **URL**: `https://api.open-elevation.com/api/v1/lookup`
- **API Key**: Not required

### 4. Usable Area Detection API (Placeholder)
- **Purpose**: Detect roof polygon and calculate usable area
- **URL**: Configurable (default: `http://192.168.1.22/usable_area_detection`)
- **Status**: **PLACEHOLDER** - Returns mock data until service is deployed
- **Expected Inputs**: image file, roof_type, meters_per_pixel, prompts
- **Expected Outputs**: roof_polygon, usable_polygon, usable_area_m2, obstacles, masks

### 5. Solar Panel Placement API (Placeholder)
- **Purpose**: Generate panel grid layout and 3D visualization
- **URL**: Configurable (default: `http://192.168.1.22/solar_panel_placement`)
- **Status**: **PLACEHOLDER** - Returns mock data until service is deployed
- **Expected Inputs**: image, roof data, panel specs, location, spacing
- **Expected Outputs**: panel_grid, panel_positions, grid_image, visualization_image

## Environment Variables

```env
# Required
PVWATTS_API_KEY=your_nrel_api_key_here

# Optional - API Endpoints (when available)
USABLE_AREA_API_URL=http://localhost:5000/usable_area_detection
PANEL_PLACEMENT_API_URL=http://localhost:5000/solar_panel_placement

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/heliosmart

# App Settings
APP_NAME=HelioSmart
APP_VERSION=1.0.0
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Installation & Setup

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your PVWATTS_API_KEY
```

### 3. Run Database Migrations
```bash
alembic upgrade head
```

### 4. Start Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Access API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Database Schema

Key tables:
- `estimations` - Main estimation records with all calculation results
- `panels` - Solar panel catalog
- `inverters` - Inverter catalog with MPPT specs
- `utilities` - Electricity providers with rate ranges
- `utility_rate_ranges` - Tiered pricing for utilities
- `solar_configs` - System-wide configuration key-value pairs

## Calculation Methods

### Panel Selection Algorithm
1. Fetch all active panels sorted by score
2. For each panel, calculate:
   - Panel area (width × height in m²)
   - Max panel count (usable_area ÷ panel_area)
   - Min panel count (system_kW × 1000 ÷ panel_wattage)
3. Select first panel where min_count ≤ max_count

### Inverter Selection Algorithm
1. Calculate total DC power needed
2. Try single inverter configurations (1-10 units)
3. For each configuration:
   - Distribute panels across inverters
   - Calculate stringing per inverter (MPPT voltage window)
   - Validate DC/AC ratio ≤ 1.35
4. Score by: price (50%) + efficiency (50%) + quantity penalty
5. Select lowest score configuration

### Stringing Algorithm
1. Adjust Voc for minimum temperature (-10°C default)
2. Calculate valid panels-per-string range:
   - Min: ceil(MPPT_min_V ÷ Vmpp)
   - Max: floor(MPPT_max_V ÷ Voc_cold)
3. Find optimal configuration using all panels
4. Distribute strings across MPPT ports
5. Handle remainder panels if they form valid string

### System Loss Calculation
```
PR = η_temperature × η_soiling × η_mismatch × η_dc × η_inverter × η_ac × η_other
Losses% = 100 - (PR × 100)
```

Where:
- `η_dc = 1 - (dc_voltage_drop% / 100)`
- `η_ac = 1 - (ac_voltage_drop% / 100)`
- Other factors from solar_configs table

## Testing

### Unit Tests (Coming Soon)
```bash
pytest tests/unit/
```

### Integration Tests (Coming Soon)
```bash
pytest tests/integration/
```

### Test with Placeholder APIs
The system works fully with placeholder APIs enabled. All calculations are real except:
1. Usable area detection (returns 50 m² mock area)
2. Panel placement (returns grid based on estimated count)

## Production Deployment

### Prerequisites for Full Functionality
1. ✅ PVWatts API key obtained from NREL
2. ⏳ Usable Area Detection service deployed (placeholder active)
3. ⏳ Panel Placement service deployed (placeholder active)
4. ✅ Database seeded with panels, inverters, utilities, configs

### Deployment Checklist
- [ ] Set `PVWATTS_API_KEY` in production environment
- [ ] Configure actual API URLs for usable area and panel placement
- [ ] Update `solar_configs` table with region-specific values
- [ ] Seed initial panels, inverters, and utilities catalogs
- [ ] Set up file storage for roof images
- [ ] Configure CORS for production frontend domain
- [ ] Enable SSL/TLS for API endpoints
- [ ] Set up logging and monitoring

## API Documentation

Full API documentation available at `/docs` after starting the server.

## Support & Contact

For questions about the estimation logic or API integration, refer to:
- Original Laravel implementation: `Estimation/Http/Controllers/EstimationController.php`
- PVWatts API docs: https://developer.nrel.gov/docs/solar/pvwatts/
- This README and inline code documentation

"""
Comprehensive Estimation Creation Endpoint
Implements the complete estimation logic from Laravel EstimationController
"""
import logging
import base64
import os
import json
import math
import httpx
from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models import Estimation, Panel, Inverter, SolarConfiguration, Utility
from app.services.pvwatts_service import PVWattsService
from app.services.calculation_service import EstimationCalculationService
from app.services.inverter_service import InverterService
from app.services.wiring_service import WiringService
from app.services.placeholder_apis import UsableAreaDetectionService, PanelPlacementService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/estimations/create-project")
async def create_project(
    latitude: float = Form(...),
    longitude: float = Form(...),
    street: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    zip_code: Optional[str] = Form(None),
    country: Optional[str] = Form(None),
    search_query: Optional[str] = Form(None),
    satellite_image: Optional[str] = Form(None),
    scale_meters_per_pixel: Optional[float] = Form(None),
    zoom_level: Optional[int] = Form(None),
    monthly_bill: Optional[float] = Form(None),
    usage_pattern: Optional[str] = Form("balanced"),
    provider: Optional[str] = Form(None),
    roof_type: Optional[str] = Form(None),
    roof_tilt: Optional[str] = Form(None),
    building_stories: Optional[int] = Form(1),
    customer_name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    coverage_percentage: Optional[float] = Form(80),
    db: Session = Depends(get_db),
):
    """
    Create a new solar estimation project with complete calculations
    
    This endpoint implements the full logic from Laravel's createProject method:
    1. Validate input and extract parameters
    2. Calculate electricity rates from utility
    3. Get solar production factor from NASA POWER API
    4. Calculate usage and cost  
    5. Determine system sizing
    6. Save roof image
    7. Call usable area detection API (or placeholder)
    8. Select best-fit panel
    9. Call panel placement API (or placeholder)
    10. Estimate mounting structure cost
    11. Select inverter combo and calculate stringing
    12. Calculate wiring requirements and BOM
    13. Calculate accurate system losses
    14. Call PVWatts API for solar estimation
    15. Save complete estimation to database
    """
    try:
        # Initialize services
        pvwatts_service = PVWattsService()
        calc_service = EstimationCalculationService(db)
        inverter_service = InverterService(db)
        wiring_service = WiringService(db)
        usable_area_service = UsableAreaDetectionService()
        panel_placement_service = PanelPlacementService()

        logger.info(f"Starting estimation creation for lat={latitude}, lon={longitude}")

        # ========= 2. Extract validated data and calculate rates =========
        utility = None
        electricity_rate = _get_config_value(db, "electricity_rate", 1.5)
        monthly_bill_val = monthly_bill or 0

        if provider:
            utility = db.query(Utility).filter(Utility.id == provider).first()
            if utility and monthly_bill_val > 0:
                # Calculate estimated monthly kWh usage from monthly bill
                first_rate_range = db.query(utility.rateRanges).order_by("min").first() if hasattr(utility, "rateRanges") else None
                if first_rate_range:
                    estimated_usage_kwh = monthly_bill_val / first_rate_range.rate
                    # Find appropriate rate range
                    # (simplified version - full implementation would query rate ranges)
                    electricity_rate = first_rate_range.rate

        # ========= 3. Calculate solar production factor and usage =========
        solar_irradiance_avg = await calc_service.get_solar_average(latitude, longitude)
        performance_ratio = 0.86
        solar_production_factor = (
            solar_irradiance_avg * 365 * performance_ratio
            if solar_irradiance_avg
            else _get_config_value(db, "solar_production_factor", 1600)
        )

        usage_data = calc_service.calculate_usage_and_cost(
            electricity_rate, monthly_bill_val, usage_pattern or "balanced"
        )
        annual_usage = usage_data["annualUsage"]
        annual_cost = usage_data["annualCost"]
        monthly_usage = usage_data["monthlyUsage"]
        monthly_cost = usage_data["monthlyCost"]

        # ========= 4. Calculate system sizing =========
        coverage_target = coverage_percentage / 100 if coverage_percentage else 0.8
        system_capacity = (annual_usage * coverage_target) / solar_production_factor

        building_floors = building_stories or 1

        # ========= 5. Extract roof and address data =========
        roof_tilt_deg = None
        if roof_tilt:
            if roof_tilt.replace(".", "").isdigit():
                roof_tilt_deg = float(roof_tilt)
            else:
                # Handle string values
                roof_tilt_map = {"low": 10, "medium": 22, "steep": 37, "very steep": 50}
                roof_tilt_deg = roof_tilt_map.get(roof_tilt.lower(), 20)

        # ========= 6. Set default tilt, azimuth, and losses =========
        tilt = roof_tilt_deg or _get_config_value(db, "optimal_tilt_angle", 20)
        azimuth = _get_config_value(db, "default_azimuth", 180)
        losses = _get_config_value(db, "default_losses_percent", 14)

        # ========= 8. Process and save the roof image =========
        roof_image_path = None
        
        # Check if we have a valid satellite image (not placeholder)
        placeholder_prefix = "data:image/png;base64,cGxhY2Vob2xkZXI"  # base64 of 'placeholder'
        has_valid_image = satellite_image and not satellite_image.startswith(placeholder_prefix)
        
        if has_valid_image:
            roof_image_path = _save_roof_image(satellite_image, 1)  # User ID would come from auth
        
        # If no valid image, fetch from Google Static Maps API
        if not roof_image_path and latitude and longitude:
            logger.info(f"Fetching satellite image from Google Maps for {latitude}, {longitude}")
            fetched_image = await _fetch_satellite_image(
                latitude, longitude, 
                zoom=zoom_level or 20,
                size="640x640"
            )
            if fetched_image:
                roof_image_path = _save_roof_image(fetched_image, 1)
                logger.info(f"Saved fetched satellite image: {roof_image_path}")

        # ========= 9. Call usable area detection API =========
        usable_area_result = None
        if roof_image_path:
            usable_area_options = {
                "meters_per_pixel": scale_meters_per_pixel,
                "roof_type": roof_type,
                "center_lat": latitude,
                "center_lng": longitude,
            }
            usable_area_options = {k: v for k, v in usable_area_options.items() if v is not None}

            try:
                # Try actual API first, falls back to placeholder on failure
                usable_area_result = await usable_area_service.detect_usable_area(
                    roof_image_path, usable_area_options
                )
            except Exception as e:
                logger.warning(f"Usable area detection failed: {str(e)}")
                usable_area_result = None

        # ========= 10. Select best-fit panel =========
        best_fit_panel = None
        if usable_area_result and usable_area_result.get("usable_area_m2", 0) > 0:
            best_fit_panel = calc_service.select_best_fit_panel(
                usable_area_result["usable_area_m2"],
                annual_usage,
                solar_production_factor,
                coverage_target,
            )

        # ========= 11. Use best-fit panel values for estimation =========
        if best_fit_panel:
            panel = best_fit_panel["panel"]
            panel_count = best_fit_panel["panel_count"]
            annual_production = best_fit_panel["total_annual_production_kwh"]
            panel_id = panel.id
        else:
            # Fallback to default panel
            default_panel_id = _get_config_value(db, "panel_id", 21)
            panel = db.query(Panel).filter(Panel.id == default_panel_id).first()

            if not panel:
                panel = db.query(Panel).filter(Panel.status == "active").first()

            if panel:
                panel_count = (
                    math.ceil((system_capacity * 1000) / panel.panel_rated_power)
                    if panel.panel_rated_power > 0
                    else math.ceil(system_capacity * _get_config_value(db, "panels_per_kw", 2.5))
                )
                annual_production = system_capacity * solar_production_factor
                panel_id = panel.id
                logger.info(f"Using fallback panel: {panel.name}, count={panel_count}")
            else:
                panel = None
                panel_count = None
                panel_id = None
                annual_production = None
                logger.warning("No panel available")

        # ========= 12. Call solar panel placement API =========
        panel_placement_result = None
        panel_grid_image = None
        visualization_image = None
        panel_grid = None
        panel_positions = None

        if panel and roof_image_path and usable_area_result:
            # Calculate panel spacing
            winter_solstice_angle = 90 - abs(latitude + 23.44)
            tilt_rad = math.radians(tilt)

            panel_length = panel.height_mm / 1000.0 if panel.height_mm else 2.0
            panel_width = panel.width_mm / 1000.0 if panel.width_mm else 1.0

            hp = panel_length * math.sin(tilt_rad)
            hl = panel_width * math.sin(tilt_rad)

            tan_winter = math.tan(math.radians(winter_solstice_angle))
            if tan_winter == 0:
                spacing_portrait = 0.3
                spacing_landscape = 0.3
            else:
                spacing_portrait = hp / tan_winter if math.isfinite(hp / tan_winter) else 0.3
                spacing_landscape = hl / tan_winter if math.isfinite(hl / tan_winter) else 0.3

            panel_spacing = {"portrait": spacing_portrait, "landscape": spacing_landscape}

            panel_dict = {
                "width": panel_width,
                "height": panel_length,
                "power": panel.panel_rated_power or 400,
            }

            try:
                panel_placement_result = await panel_placement_service.place_panels(
                    roof_image_path,
                    usable_area_result,
                    panel_dict,
                    latitude,
                    longitude,
                    azimuth,
                    tilt,
                    solar_production_factor,
                    panel_spacing,
                    panel_count,
                )

                if panel_placement_result:
                    panel_grid_image = panel_placement_result.get("panel_grid_image")
                    visualization_image = panel_placement_result.get("visualization_image")
                    panel_grid = json.dumps(panel_placement_result.get("panel_grid")) if panel_placement_result.get("panel_grid") else None
                    panel_positions = json.dumps(panel_placement_result.get("panel_positions")) if panel_placement_result.get("panel_positions") else None
            except Exception as e:
                logger.warning(f"Panel placement failed: {str(e)}")

        # ========= 12b. Estimate mounting structure cost =========
        mounting_structure_cost = None
        if panel and panel_count:
            panel_arr = {
                "width": panel.width_mm / 1000.0 if panel.width_mm else 1.0,
                "height": panel.height_mm / 1000.0 if panel.height_mm else 2.0,
                "power": panel.panel_rated_power or 400,
            }
            mounting_structure_cost = calc_service.estimate_structure_cost(
                panel_arr, panel_count, "rooftop", roof_type or "flat", "portrait"
            )

        # ========= 12c. Inverter and stringing selection =========
        inverter_design = None
        inverter_combos = []
        stringing_details = []

        if panel and panel_count:
            inverter_design = inverter_service.select_best_inverter_combo(panel.id, panel_count)

            if "error" in inverter_design:
                logger.warning(f"Inverter selection failed: {inverter_design['message']}")
                inverter_design = {"combo": [], "error": inverter_design["error"]}
            elif inverter_design.get("combo"):
                for combo in inverter_design["combo"]:
                    inverter_combos.append(
                        {
                            "model": combo.get("model", ""),
                            "qty": combo.get("qty", 1),
                            "stringing": combo.get("stringing", {}),
                        }
                    )
                    if combo.get("stringing"):
                        stringing_details.append(
                            {
                                "inverter_model": combo.get("model", ""),
                                "inverter_qty": combo.get("qty", 1),
                                "stringing_config": combo.get("stringing"),
                            }
                        )

        # ========= 12d. Calculate wiring requirements =========
        wiring_calculation = None
        if panel and panel_count and stringing_details and inverter_design.get("combo"):
            try:
                panel_specs = {
                    "vmp": panel.maximum_operating_voltage_vmpp or 30,
                    "imp": panel.maximum_operating_current_impp or (panel.panel_rated_power / (panel.maximum_operating_voltage_vmpp or 30)),
                    "voc": panel.open_circuit_voltage or 37,
                    "isc": panel.short_circuit_current or ((panel.maximum_operating_current_impp or 10) * 1.2),
                }

                wiring_specs = wiring_service.generate_wiring_specs(
                    inverter_design, panel_specs, building_floors
                )
                wiring_bom = wiring_service.generate_bom(wiring_specs)

                wiring_calculation = {
                    "wiring_specs": wiring_specs,
                    "bill_of_materials": wiring_bom["bom"],
                    "total_cost_mad": wiring_bom["total_cost_mad"],
                }
            except Exception as e:
                logger.error(f"Wiring calculation failed: {str(e)}")
                wiring_calculation = {"error": str(e)}

        # ========= 6e. Calculate system losses using actual component data =========
        if panel and wiring_calculation and "error" not in wiring_calculation:
            dc_voltage_drops = []
            ac_voltage_drops = []

            for spec in wiring_calculation.get("wiring_specs", []):
                if spec.get("type") == "dc" and "voltage_drop_percent" in spec:
                    dc_voltage_drops.append(spec["voltage_drop_percent"])
                elif spec.get("type") == "ac" and "voltage_drop_percent" in spec:
                    ac_voltage_drops.append(spec["voltage_drop_percent"])

            dc_voltage_drop = max(dc_voltage_drops) if dc_voltage_drops else 1.0
            ac_voltage_drop = max(ac_voltage_drops) if ac_voltage_drops else 1.0

            # Get inverter efficiency
            eta_inverter = 0.95
            if inverter_design and inverter_design.get("combo"):
                efficiencies = []
                for combo in inverter_design["combo"]:
                    inv_model_name = combo.get("model")
                    if inv_model_name:
                        inv = db.query(Inverter).filter(Inverter.name == inv_model_name).first()
                        if inv and inv.efficiency_max:
                            efficiencies.append(inv.efficiency_max)
                if efficiencies:
                    eta_inverter = sum(efficiencies) / len(efficiencies) / 100.0

            losses = calc_service.calculate_total_system_loss(
                dc_voltage_drop, eta_inverter, ac_voltage_drop
            )

        # ========= 7. Call PVWatts API for solar estimation =========
        pvwatts_data = await pvwatts_service.get_estimate(
            latitude, longitude, system_capacity, tilt, azimuth, losses
        )

        # ========= 13. Prepare data for DB and monthly breakdown =========
        dc_monthly = {}
        poa_monthly = {}
        solrad_monthly = {}
        ac_monthly = {}

        if pvwatts_data and "monthlyData" in pvwatts_data:
            for month, data in pvwatts_data["monthlyData"].items():
                dc_monthly[month] = data.get("dc_monthly", 0)
                poa_monthly[month] = data.get("poa_monthly", 0)
                solrad_monthly[month] = data.get("solrad_monthly", 0)
                ac_monthly[month] = data.get("ac_monthly", 0)

        # Extract environmental complexity
        wind_snow_data = await calc_service.get_wind_and_snow_complexity(latitude, longitude)

        # ========= 15. Save estimation to DB =========
        estimation_data = {
            "latitude": latitude,
            "longitude": longitude,
            "street": street,
            "city": city,
            "state": state,
            "zip_code": zip_code,
            "country": country,
            "roof_image_path": roof_image_path,
            "customer_name": customer_name,
            "email": email,
            "annual_usage_kwh": annual_usage,
            "annual_cost": annual_cost,
            "monthly_usage": json.dumps(monthly_usage) if monthly_usage else None,
            "monthly_cost": json.dumps(monthly_cost) if monthly_cost else None,
            "utility_company": utility.name if utility else None,
            "utility_id": utility.id if utility else None,
            "coverage_percentage": coverage_percentage,
            "energy_usage_type": usage_pattern,
            "system_capacity": system_capacity,
            "tilt": tilt,
            "azimuth": azimuth,
            "losses": losses,
            "building_floors": building_floors,
            "roof_type": roof_type,
            "roof_tilt": roof_tilt_deg,
            "dc_monthly": json.dumps(dc_monthly) if dc_monthly else None,
            "poa_monthly": json.dumps(poa_monthly) if poa_monthly else None,
            "solrad_monthly": json.dumps(solrad_monthly) if solrad_monthly else None,
            "ac_monthly": json.dumps(ac_monthly) if ac_monthly else None,
            "energy_annual": annual_production or pvwatts_data.get("annualProduction", 0),
            "capacity_factor": pvwatts_data.get("capacityFactor"),
            "solrad_annual": pvwatts_data.get("solradAnnual"),
            "status": "completed",
            "panel_id": panel_id,
            "panel_count": panel_count,
            "solar_irradiance_avg": solar_irradiance_avg,
            "performance_ratio": performance_ratio,
            "solar_production_factor": solar_production_factor,
            "inverter_design": json.dumps(inverter_design) if inverter_design else None,
            "inverter_combos": json.dumps(inverter_combos) if inverter_combos else None,
            "stringing_details": json.dumps(stringing_details) if stringing_details else None,
        }

        # Calculate estimated roof area from panel count (used when SAM is unavailable)
        # Average panel is ~2m² and needs ~2.5m² with spacing
        estimated_roof_area_m2 = panel_count * 2.5 if panel_count else 50.0  # Default 50m²
        
        # Add usable area data - always set usable_area_m2 for visualization
        if usable_area_result:
            estimation_data.update(
                {
                    "roof_polygon": json.dumps(usable_area_result.get("roof_polygon")) if usable_area_result.get("roof_polygon") else None,
                    "usable_polygon": json.dumps(usable_area_result.get("usable_polygon")) if usable_area_result.get("usable_polygon") else None,
                    "usable_area": usable_area_result.get("usable_area"),
                    "usable_area_m2": usable_area_result.get("usable_area_m2"),
                    "roof_mask_image": usable_area_result.get("roof_mask_image"),
                    "overlay_image": usable_area_result.get("overlay_image"),
                    "sam_masks": json.dumps(usable_area_result.get("sam_masks")) if usable_area_result.get("sam_masks") else None,
                    "roof_mask_index": usable_area_result.get("roof_mask_index"),
                    "facade_reduction_ratio": usable_area_result.get("facade_reduction_ratio"),
                    "roof_type_detected": usable_area_result.get("roof_type"),
                    "facade_filtering_applied": usable_area_result.get("facade_filtering_applied", False),
                    "meters_per_pixel": usable_area_result.get("meters_per_pixel"),
                }
            )
        else:
            # SAM unavailable - use estimated values
            estimation_data.update({
                "usable_area_m2": estimated_roof_area_m2,
            })

        # Add panel placement data if available
        if panel_placement_result:
            estimation_data.update(
                {
                    "panel_grid_image": panel_grid_image,
                    "visualization_image": visualization_image,
                    "panel_grid": panel_grid,
                    "panel_positions": panel_positions,
                }
            )

        # Create and save estimation
        estimation = Estimation(**estimation_data)
        db.add(estimation)
        db.commit()
        db.refresh(estimation)

        logger.info(f"Estimation saved successfully: id={estimation.id}")

        # Prepare visualization data for frontend transparency - ALWAYS return this
        # Even in placeholder mode, we provide map center and basic info so Step 7 can show
        sam_mode = "placeholder"
        if usable_area_result:
            if usable_area_result.get("_fallback"):
                sam_mode = "fallback"
            elif usable_area_result.get("_sam_service"):
                sam_mode = "production"
        
        visualization_data = {
            "roof_polygon": usable_area_result.get("roof_polygon") if usable_area_result else None,
            "usable_polygon": usable_area_result.get("usable_polygon") if usable_area_result else None,
            "obstacles": usable_area_result.get("obstacles", []) if usable_area_result else [],
            "usable_area_m2": usable_area_result.get("usable_area_m2") if usable_area_result else estimation.usable_area_m2,
            "satellite_image": satellite_image if satellite_image and not satellite_image.startswith("data:image/png;base64,cGxhY2Vob2xkZXI") else None,
            "scale_meters_per_pixel": scale_meters_per_pixel,
            "center_lat": latitude,
            "center_lng": longitude,
            "sam_mode": sam_mode,
            "sam_warning": usable_area_result.get("_warning") if usable_area_result else "SAM service unavailable - using estimated roof area",
            "roof_mask_image": usable_area_result.get("roof_mask_image") if usable_area_result else None,
            "overlay_image": usable_area_result.get("overlay_image") if usable_area_result else None,
        }
        
        logger.info(f"Visualization data prepared: sam_mode={sam_mode}, center=({latitude}, {longitude})")

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "estimation_id": estimation.id,
                "message": "Solar estimation completed successfully",
                "data": {
                    "system_capacity": system_capacity,
                    "panel_count": panel_count,
                    "annual_production": annual_production,
                    "estimated_savings": annual_usage * electricity_rate,
                },
                "visualization": visualization_data,
            }
        )

    except Exception as e:
        logger.error(f"Error in createProject: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/estimations/{estimation_id}/visualization")
async def get_visualization(estimation_id: int, db: Session = Depends(get_db)):
    """
    Get polygon visualization data for an estimation
    
    Returns roof polygons, usable area polygons, obstacles, and satellite image
    for frontend transparency display
    """
    try:
        estimation = db.query(Estimation).filter(Estimation.id == estimation_id).first()
        
        if not estimation:
            raise HTTPException(status_code=404, detail="Estimation not found")
        
        # Parse JSON fields
        roof_polygon = json.loads(estimation.roof_polygon) if estimation.roof_polygon else None
        usable_polygon = json.loads(estimation.usable_polygon) if estimation.usable_polygon else None
        sam_masks = json.loads(estimation.sam_masks) if estimation.sam_masks else None
        
        # Determine SAM mode from available data
        sam_mode = "placeholder"
        if roof_polygon and usable_polygon:
            # Check if this looks like real SAM data (complex polygons) vs simple fallback
            if len(roof_polygon) > 4:  # More than simple rectangle
                sam_mode = "production"
            else:
                sam_mode = "fallback"
        
        visualization_data = {
            "roof_polygon": roof_polygon,
            "usable_polygon": usable_polygon,
            "obstacles": [],  # TODO: Parse from obstacles field when available
            "usable_area_m2": estimation.usable_area_m2,
            "satellite_image": estimation.roof_image_path,  # Path or base64 data
            "scale_meters_per_pixel": estimation.scale_meters_per_pixel or estimation.meters_per_pixel,
            "center_lat": estimation.latitude,
            "center_lng": estimation.longitude,
            "sam_mode": sam_mode,
            "roof_mask_image": estimation.roof_mask_image,
            "overlay_image": estimation.overlay_image,
            "sam_masks": sam_masks,
        }
        
        return JSONResponse(content={
            "success": True,
            "visualization": visualization_data
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting visualization data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving visualization: {str(e)}")


def _get_config_value(db: Session, key: str, default):
    """Get configuration value from database or return default"""
    config = db.query(SolarConfiguration).filter(SolarConfiguration.key == key).first()
    if config:
        try:
            return float(config.value)
        except (ValueError, TypeError):
            return default
    return default


async def _fetch_satellite_image(latitude: float, longitude: float, zoom: int = 20, size: str = "640x640") -> Optional[str]:
    """
    Fetch satellite image from Google Static Maps API
    Returns base64 data URL or None if failed
    """
    from app.core.config import settings
    
    try:
        api_key = settings.GOOGLE_MAPS_API_KEY
        if not api_key:
            logger.warning("Google Maps API key not configured")
            return None
        
        # Google Static Maps API URL
        url = f"https://maps.googleapis.com/maps/api/staticmap"
        params = {
            "center": f"{latitude},{longitude}",
            "zoom": zoom,
            "size": size,
            "maptype": "satellite",
            "key": api_key
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            # Convert to base64 data URL
            image_data = base64.b64encode(response.content).decode('utf-8')
            data_url = f"data:image/png;base64,{image_data}"
            
            logger.info(f"Fetched satellite image for {latitude}, {longitude}")
            return data_url
            
    except Exception as e:
        logger.error(f"Error fetching satellite image: {str(e)}")
        return None


def _save_roof_image(data_url: str, user_id: int) -> Optional[str]:
    """Save roof image from data URL to storage"""
    try:
        # Extract base64 encoded image data
        parts = data_url.split(";base64,")
        if len(parts) < 2:
            logger.error("Invalid image data URL format")
            return None

        image_data = base64.b64decode(parts[1])

        # Create filename and path
        filename = f"roof_{user_id}_{int(datetime.now().timestamp())}.png"
        directory = "storage/roof_images"

        os.makedirs(directory, exist_ok=True)
        filepath = os.path.join(directory, filename)

        with open(filepath, "wb") as f:
            f.write(image_data)

        logger.info(f"Roof image saved: {filepath}")
        return filepath

    except Exception as e:
        logger.error(f"Error saving roof image: {str(e)}")
        return None

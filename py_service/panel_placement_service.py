"""
Panel Placement Service
Places solar panels optimally within detected usable roof areas
Considers panel dimensions, tilt, azimuth, and spacing requirements
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from shapely.geometry import Polygon, Point, box
from shapely.affinity import rotate, translate
import math

# Constants for row spacing calculations
MIN_ROW_SPACING_FACTOR = 0.3  # Minimum spacing between rows as factor of panel height


class PanelSpec(BaseModel):
    """Panel specifications"""
    width_mm: float = Field(..., description="Panel width in millimeters")
    height_mm: float = Field(..., description="Panel height in millimeters")
    rated_power_w: float = Field(default=400, description="Panel rated power in watts")


class PlacementRequest(BaseModel):
    """Request for panel placement calculation"""
    usable_polygon: List[List[float]] = Field(..., description="Usable area polygon in pixel coordinates")
    panel_spec: PanelSpec
    target_panel_count: int = Field(..., description="Target number of panels to place")
    tilt_degrees: float = Field(default=20, description="Panel tilt angle in degrees")
    azimuth_degrees: float = Field(default=180, description="Panel azimuth (0=North, 180=South)")
    scale_meters_per_pixel: float = Field(default=0.3, description="Conversion from pixels to meters")
    image_width: int = Field(default=640, description="Image width in pixels")
    image_height: int = Field(default=480, description="Image height in pixels")
    center_lat: float = Field(default=0, description="Center latitude for geo-referencing")
    center_lng: float = Field(default=0, description="Center longitude for geo-referencing")
    min_edge_margin_m: float = Field(default=0.3, description="Minimum margin from polygon edges in meters")
    row_spacing_mode: str = Field(default="auto", description="'auto', 'tight', or 'shade-free'")
    orientation: str = Field(default="portrait", description="'portrait' or 'landscape'")


class PanelPosition(BaseModel):
    """Individual panel position"""
    id: int
    center_x: float  # Pixel coordinates
    center_y: float
    corners: List[List[float]]  # 4 corners in pixel coordinates [[x,y], ...]
    geo_center: List[float]  # [lng, lat]
    geo_corners: List[List[float]]  # 4 corners in geo coordinates
    row: int
    column: int


class PlacementResponse(BaseModel):
    """Response with panel placement results"""
    success: bool
    panels_placed: int
    target_panel_count: int
    panel_positions: List[PanelPosition]
    coverage_percentage: float
    total_panel_area_m2: float
    usable_area_m2: float
    row_count: int
    panels_per_row: List[int]
    row_spacing_m: float
    panel_footprint_m2: float
    effective_panel_footprint_m2: float  # After tilt projection
    message: str
    warnings: List[str]


def calculate_panel_footprint(panel_spec: PanelSpec, tilt_degrees: float, orientation: str) -> Tuple[float, float]:
    """
    Calculate the effective panel footprint on the roof surface
    
    When panels are tilted, their vertical projection changes:
    - Horizontal dimension stays the same
    - Vertical dimension is reduced by cos(tilt)
    
    Args:
        panel_spec: Panel dimensions
        tilt_degrees: Panel tilt angle
        orientation: 'portrait' or 'landscape'
        
    Returns:
        (width_m, height_m) - Effective footprint dimensions in meters
    """
    # Convert mm to meters
    width_m = panel_spec.width_mm / 1000.0
    height_m = panel_spec.height_mm / 1000.0
    
    # Swap for landscape
    if orientation.lower() == 'landscape':
        width_m, height_m = height_m, width_m
    
    # Calculate tilt effect on projected height
    tilt_rad = math.radians(tilt_degrees)
    projected_height = height_m * math.cos(tilt_rad)
    
    return width_m, projected_height


def calculate_row_spacing(panel_height_m: float, tilt_degrees: float, latitude: float, mode: str = "auto") -> float:
    """
    Calculate optimal row spacing to minimize shading
    
    Uses the sun angle at winter solstice to ensure no shading at solar noon
    
    Args:
        panel_height_m: Panel height in meters
        tilt_degrees: Panel tilt angle
        latitude: Site latitude for sun angle calculation
        mode: 'auto' (optimal), 'tight' (minimum), 'shade-free' (maximum)
        
    Returns:
        Row spacing in meters
    """
    tilt_rad = math.radians(tilt_degrees)
    
    # Calculate panel's shadow length factor
    # Shadow = panel_height * sin(tilt) / tan(sun_altitude)
    
    if mode == "tight":
        # Minimum spacing - just enough for access
        return panel_height_m * MIN_ROW_SPACING_FACTOR
    
    # Calculate worst-case sun altitude (winter solstice at solar noon)
    # Sun altitude = 90 - latitude + 23.45 (declination)
    # At winter solstice, declination = -23.45
    winter_sun_alt = 90 - abs(latitude) - 23.45
    winter_sun_alt = max(winter_sun_alt, 15)  # Minimum 15 degrees
    
    sun_alt_rad = math.radians(winter_sun_alt)
    
    # Shadow length from tilted panel
    shadow_length = panel_height_m * math.sin(tilt_rad) / math.tan(sun_alt_rad)
    
    # Add projected panel height
    projected_height = panel_height_m * math.cos(tilt_rad)
    
    if mode == "shade-free":
        # Full shadow clearance
        return shadow_length + projected_height * 0.2
    
    # Auto mode - balance between density and shading
    # Use 70% of shade-free spacing
    return shadow_length * 0.7 + projected_height * 0.1


def pixel_to_geo(pixel_x: float, pixel_y: float, center_lat: float, center_lng: float, 
                 scale_mpp: float, img_width: int, img_height: int) -> List[float]:
    """
    Convert pixel coordinates to geographic coordinates
    
    Args:
        pixel_x, pixel_y: Pixel coordinates
        center_lat, center_lng: Image center in geographic coordinates
        scale_mpp: Scale in meters per pixel
        img_width, img_height: Image dimensions
        
    Returns:
        [longitude, latitude]
    """
    center_x = img_width / 2
    center_y = img_height / 2
    
    # Offset from center in pixels
    dx_pixels = pixel_x - center_x
    dy_pixels = center_y - pixel_y  # Flip Y axis
    
    # Convert to meters
    dx_meters = dx_pixels * scale_mpp
    dy_meters = dy_pixels * scale_mpp
    
    # Convert meters to degrees
    lat_offset = dy_meters / 111111.0
    lng_offset = dx_meters / (111111.0 * math.cos(math.radians(center_lat)))
    
    geo_lat = center_lat + lat_offset
    geo_lng = center_lng + lng_offset
    
    return [geo_lng, geo_lat]


def get_rotated_panel_corners(center_x: float, center_y: float, 
                              width_px: float, height_px: float, 
                              azimuth_degrees: float) -> List[List[float]]:
    """
    Get the 4 corners of a rotated panel rectangle
    
    Args:
        center_x, center_y: Panel center in pixels
        width_px, height_px: Panel dimensions in pixels
        azimuth_degrees: Panel azimuth (rotation)
        
    Returns:
        List of 4 corner coordinates [[x,y], ...]
    """
    # Create rectangle centered at origin
    half_w = width_px / 2
    half_h = height_px / 2
    
    corners = [
        [-half_w, -half_h],
        [half_w, -half_h],
        [half_w, half_h],
        [-half_w, half_h]
    ]
    
    # Rotate by azimuth (convert to radians, adjust for coordinate system)
    # Azimuth 0 = North = up = -Y axis
    # Azimuth 180 = South = down = +Y axis
    rotation_rad = math.radians(azimuth_degrees - 180)  # Adjust so 180 means no rotation
    
    cos_r = math.cos(rotation_rad)
    sin_r = math.sin(rotation_rad)
    
    rotated_corners = []
    for x, y in corners:
        rx = x * cos_r - y * sin_r + center_x
        ry = x * sin_r + y * cos_r + center_y
        rotated_corners.append([rx, ry])
    
    return rotated_corners


def place_panels_in_polygon(request: PlacementRequest) -> PlacementResponse:
    """
    Main algorithm to place panels within usable polygon
    
    Strategy:
    1. Create a bounding box for the polygon
    2. Calculate panel footprint with tilt consideration
    3. Create a grid of potential panel positions
    4. Filter positions that fit entirely within the polygon (with margin)
    5. Return up to target_panel_count positions
    """
    warnings = []
    
    # Validate polygon
    if len(request.usable_polygon) < 3:
        return PlacementResponse(
            success=False,
            panels_placed=0,
            target_panel_count=request.target_panel_count,
            panel_positions=[],
            coverage_percentage=0,
            total_panel_area_m2=0,
            usable_area_m2=0,
            row_count=0,
            panels_per_row=[],
            row_spacing_m=0,
            panel_footprint_m2=0,
            effective_panel_footprint_m2=0,
            message="Invalid polygon: need at least 3 points",
            warnings=[]
        )
    
    # Create Shapely polygon
    try:
        usable_poly = Polygon(request.usable_polygon)
        if not usable_poly.is_valid:
            usable_poly = usable_poly.buffer(0)  # Fix invalid polygons
    except Exception as e:
        return PlacementResponse(
            success=False,
            panels_placed=0,
            target_panel_count=request.target_panel_count,
            panel_positions=[],
            coverage_percentage=0,
            total_panel_area_m2=0,
            usable_area_m2=0,
            row_count=0,
            panels_per_row=[],
            row_spacing_m=0,
            panel_footprint_m2=0,
            effective_panel_footprint_m2=0,
            message=f"Invalid polygon: {str(e)}",
            warnings=[]
        )
    
    # Calculate usable area in m²
    usable_area_pixels = usable_poly.area
    usable_area_m2 = usable_area_pixels * (request.scale_meters_per_pixel ** 2)
    
    # Calculate panel footprint
    panel_width_m, panel_height_m = calculate_panel_footprint(
        request.panel_spec, request.tilt_degrees, request.orientation
    )
    
    # Convert to pixels
    panel_width_px = panel_width_m / request.scale_meters_per_pixel
    panel_height_px = panel_height_m / request.scale_meters_per_pixel
    
    # Calculate actual panel area (before tilt projection)
    actual_width_m = request.panel_spec.width_mm / 1000.0
    actual_height_m = request.panel_spec.height_mm / 1000.0
    if request.orientation.lower() == 'landscape':
        actual_width_m, actual_height_m = actual_height_m, actual_width_m
    panel_footprint_m2 = actual_width_m * actual_height_m
    effective_panel_footprint_m2 = panel_width_m * panel_height_m
    
    # Calculate row spacing
    row_spacing_m = calculate_row_spacing(
        panel_height_m, 
        request.tilt_degrees, 
        request.center_lat,
        request.row_spacing_mode
    )
    row_spacing_px = row_spacing_m / request.scale_meters_per_pixel
    
    # Add inter-panel gap within row (typically 2-5cm)
    panel_gap_m = 0.02  # 2cm gap between panels
    panel_gap_px = panel_gap_m / request.scale_meters_per_pixel
    
    # Get polygon bounding box
    minx, miny, maxx, maxy = usable_poly.bounds
    
    # Apply edge margin
    margin_px = request.min_edge_margin_m / request.scale_meters_per_pixel
    minx += margin_px
    miny += margin_px
    maxx -= margin_px
    maxy -= margin_px
    
    # Create shrunk polygon for placement checking
    try:
        shrunk_poly = usable_poly.buffer(-margin_px)
        if shrunk_poly.is_empty or not shrunk_poly.is_valid:
            shrunk_poly = usable_poly
            warnings.append("Could not apply edge margin - polygon too small")
    except:
        shrunk_poly = usable_poly
        warnings.append("Could not apply edge margin")
    
    # Generate potential panel positions
    panel_positions: List[PanelPosition] = []
    panel_id = 1
    row_num = 0
    panels_per_row = []
    
    # Start from top of bounding box, work down
    current_y = miny + panel_height_px / 2
    
    while current_y < maxy - panel_height_px / 2:
        row_panels = 0
        col_num = 0
        
        # Start from left, work right
        current_x = minx + panel_width_px / 2
        
        while current_x < maxx - panel_width_px / 2:
            # Check if we've reached target count
            if len(panel_positions) >= request.target_panel_count:
                break
            
            # Get panel corners
            corners = get_rotated_panel_corners(
                current_x, current_y, panel_width_px, panel_height_px, request.azimuth_degrees
            )
            
            # Create panel polygon for intersection check
            panel_poly = Polygon(corners)
            
            # Check if panel fits entirely within shrunk polygon
            if shrunk_poly.contains(panel_poly):
                # Calculate geo coordinates
                geo_center = pixel_to_geo(
                    current_x, current_y,
                    request.center_lat, request.center_lng,
                    request.scale_meters_per_pixel,
                    request.image_width, request.image_height
                )
                
                geo_corners = [
                    pixel_to_geo(
                        c[0], c[1],
                        request.center_lat, request.center_lng,
                        request.scale_meters_per_pixel,
                        request.image_width, request.image_height
                    )
                    for c in corners
                ]
                
                panel_positions.append(PanelPosition(
                    id=panel_id,
                    center_x=current_x,
                    center_y=current_y,
                    corners=corners,
                    geo_center=geo_center,
                    geo_corners=geo_corners,
                    row=row_num,
                    column=col_num
                ))
                
                panel_id += 1
                row_panels += 1
                col_num += 1
            
            # Move to next column position
            current_x += panel_width_px + panel_gap_px
        
        # Record panels in this row
        if row_panels > 0:
            panels_per_row.append(row_panels)
            row_num += 1
        
        # Move to next row
        current_y += panel_height_px + row_spacing_px
        
        # Check if we've reached target count
        if len(panel_positions) >= request.target_panel_count:
            break
    
    # Calculate coverage
    total_panel_area_m2 = len(panel_positions) * panel_footprint_m2
    coverage_percentage = (total_panel_area_m2 / usable_area_m2 * 100) if usable_area_m2 > 0 else 0
    
    # Generate message
    if len(panel_positions) >= request.target_panel_count:
        message = f"Successfully placed all {request.target_panel_count} panels"
    elif len(panel_positions) > 0:
        message = f"Placed {len(panel_positions)} of {request.target_panel_count} panels (limited by usable area)"
        warnings.append(f"Could only fit {len(panel_positions)} panels in available area")
    else:
        message = "Could not place any panels - area too small or invalid polygon"
    
    return PlacementResponse(
        success=len(panel_positions) > 0,
        panels_placed=len(panel_positions),
        target_panel_count=request.target_panel_count,
        panel_positions=panel_positions,
        coverage_percentage=round(coverage_percentage, 1),
        total_panel_area_m2=round(total_panel_area_m2, 2),
        usable_area_m2=round(usable_area_m2, 2),
        row_count=row_num,
        panels_per_row=panels_per_row,
        row_spacing_m=round(row_spacing_m, 3),
        panel_footprint_m2=round(panel_footprint_m2, 3),
        effective_panel_footprint_m2=round(effective_panel_footprint_m2, 3),
        message=message,
        warnings=warnings
    )


# ============ FastAPI Endpoints ============

app = FastAPI(
    title="Panel Placement API",
    description="API for optimal solar panel placement within detected roof areas",
    version="1.0.0"
)


@app.post("/place_panels", response_model=PlacementResponse)
async def place_panels(request: PlacementRequest):
    """
    Calculate optimal panel placement within usable roof area
    
    Takes the usable polygon from SAM detection and places panels
    according to specifications, tilt, azimuth, and spacing requirements.
    """
    try:
        result = place_panels_in_polygon(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error placing panels: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "panel-placement"}


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "service": "Panel Placement API",
        "description": "Calculates optimal solar panel placement within detected roof areas",
        "endpoints": {
            "POST /place_panels": "Calculate panel placement",
            "GET /health": "Health check",
            "GET /docs": "Interactive API documentation"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8890)

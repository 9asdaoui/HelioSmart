"""
Placeholder API Services
Provides placeholder responses for APIs that are not yet implemented
"""
import logging
from typing import Dict, Optional
import base64
import httpx
import os
import json
from app.core.config import settings

logger = logging.getLogger(__name__)


class UsableAreaDetectionService:
    """
    Placeholder service for usable area detection API
    Returns mock data until the actual service is implemented
    """

    async def detect_usable_area(self, image_path: str, options: Dict = None) -> Optional[Dict]:
        """
        Call the usable area detection API - now using Python SAM service

        Args:
            image_path: Path to the roof image
            options: Optional parameters for the API (meters_per_pixel, roof_type, etc.)

        Returns:
            Dict with usable area data or None if failed
        """
        try:
            # Try calling the actual Python SAM service
            sam_service_url = f"{settings.PY_SERVICE_URL}/analyze_roof"
            
            # Call the actual API with proper parameters
            result = await self.call_actual_api(image_path, options or {}, sam_service_url)
            
            if result:
                logger.info(f"Successfully called Python SAM service. Fallback mode: {result.get('_fallback', False)}")
                return result
            else:
                logger.warning("Python SAM service returned None, using placeholder")
                return self._get_placeholder_response(options)

        except Exception as e:
            logger.error(f"Usable area detection error: {str(e)}")
            return self._get_placeholder_response(options)
    
    def _get_placeholder_response(self, options: Dict = None) -> Dict:
        """
        Generate placeholder response when SAM service is unavailable
        
        Args:
            options: Optional parameters
            
        Returns:
            Placeholder data dict
        """
        logger.warning("Using PLACEHOLDER for usable area detection API")
        return {
            "usable_area": 1000.0,  # pixels²
            "usable_area_m2": 50.0,  # m²
            "roof_area": 1200.0,
            "roof_polygon": [[0, 0], [100, 0], [100, 100], [0, 100]],
            "usable_polygon": [[10, 10], [90, 10], [90, 90], [10, 90]],
            "obstacles": [],
            "roof_mask_image": None,
            "overlay_image": None,
            "sam_masks": None,
            "roof_mask_index": 0,
            "facade_reduction_ratio": 0.83,
            "roof_type": options.get("roof_type", "flat") if options else "flat",
            "facade_filtering_applied": False,
            "meters_per_pixel": options.get("meters_per_pixel", 0.3) if options else 0.3,
            "_placeholder": True,
        }

    async def call_actual_api(self, image_path: str, options: Dict, endpoint_url: str) -> Optional[Dict]:
        """
        Call the actual Python SAM service for roof segmentation

        Args:
            image_path: Path to the roof image
            options: API options (meters_per_pixel, center_lat, center_lng, etc.)
            endpoint_url: API endpoint URL (http://localhost:8889/analyze_roof)

        Returns:
            Transformed API response matching backend expected format, or None if failed
        """
        try:
            if not os.path.exists(image_path):
                raise ValueError(f"Image file does not exist: {image_path}")

            # Prepare multipart form data for Python SAM service
            with open(image_path, "rb") as f:
                files = {"image": (os.path.basename(image_path), f, "image/png")}
                
                # Extract required parameters from options
                # Python SAM service expects: center_lat, center_lng, scale_meters_per_pixel
                data = {
                    "center_lat": options.get("center_lat", 0.0),
                    "center_lng": options.get("center_lng", 0.0),
                    "scale_meters_per_pixel": options.get("meters_per_pixel", 0.3),
                }
                
                # Add roof_points if provided (user-placed points from Step 5)
                if options.get("roof_points"):
                    import json
                    data["roof_points"] = json.dumps(options.get("roof_points"))
                    logger.info(f"Passing {len(options.get('roof_points'))} roof points to SAM service")

                async with httpx.AsyncClient(timeout=180.0) as client:  # 3 minutes for SAM processing
                    response = await client.post(endpoint_url, files=files, data=data)
                    response.raise_for_status()
                    sam_result = response.json()

            # Transform Python SAM service response to backend expected format
            return self._transform_sam_response(sam_result, options)

        except httpx.HTTPError as e:
            logger.warning(f"Python SAM service HTTP error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Python SAM service call failed: {str(e)}")
            return None
    
    def _transform_sam_response(self, sam_result: Dict, options: Dict) -> Dict:
        """
        Transform Python SAM service response to match backend expected format
        
        Args:
            sam_result: Response from Python SAM service
            options: Original options dict
            
        Returns:
            Transformed response dict
        """
        # Extract usable roof areas
        usable_areas = sam_result.get("usable_roof_area", [])
        obstacles = sam_result.get("obstacles", [])
        
        # Combine all usable roof polygons into one (take the largest)
        # or use the first one if multiple
        roof_polygon = None
        usable_polygon = None
        usable_area_pixels = 0.0
        usable_area_m2 = 0.0
        
        if usable_areas:
            # Use the largest usable area
            largest_area = max(usable_areas, key=lambda x: x.get("area_m2", 0))
            roof_polygon = largest_area.get("polygon", [])
            usable_polygon = roof_polygon  # For now, treat them the same
            usable_area_pixels = largest_area.get("area_pixels", 0.0)
            usable_area_m2 = largest_area.get("area_m2", 0.0)
        
        # Extract image dimensions from SAM result
        image_info = sam_result.get("image_info", {})
        image_dims = image_info.get("dimensions", {})
        image_width = image_dims.get("width", 640)
        image_height = image_dims.get("height", 480)
        
        # Build response in expected format
        transformed = {
            "usable_area": usable_area_pixels,
            "usable_area_m2": usable_area_m2,
            "roof_area": sam_result.get("total_usable_area_pixels", usable_area_pixels),
            "roof_polygon": roof_polygon,
            "usable_polygon": usable_polygon,
            "obstacles": [obs.get("polygon", []) for obs in obstacles],
            "roof_mask_image": None,  # Python service doesn't return this yet
            "overlay_image": None,  # Python service doesn't return this yet
            "sam_masks": None,  # Could be populated from usable_areas if needed
            "roof_mask_index": 0,
            "facade_reduction_ratio": 0.83,  # Default value
            "roof_type": options.get("roof_type", "flat"),
            "facade_filtering_applied": False,
            "meters_per_pixel": sam_result.get("georeferencing", {}).get("scale_meters_per_pixel", 
                                                                          options.get("meters_per_pixel", 0.3)),
            "image_width": image_width,
            "image_height": image_height,
            "_sam_service": True,  # Flag to indicate this came from SAM service
            "_fallback": sam_result.get("_fallback", False),  # Pass through fallback flag
        }
        
        # Add warning if present
        if "_warning" in sam_result:
            transformed["_warning"] = sam_result["_warning"]
        
        return transformed


class PanelPlacementService:
    """
    Placeholder service for solar panel placement API
    Returns mock data until the actual service is implemented
    """

    async def place_panels(
        self,
        image_path: str,
        usable_area_result: Dict,
        panel: Dict,
        lat: float,
        lon: float,
        roof_azimuth: float,
        roof_tilt: float,
        annual_irradiance: float,
        panel_spacing: Dict = None,
        panel_count: Optional[int] = None,
    ) -> Optional[Dict]:
        """
        Call the solar panel placement API (PLACEHOLDER)

        Args:
            image_path: Path to the roof image
            usable_area_result: Result from usable area detection
            panel: Panel specifications
            lat: Latitude
            lon: Longitude
            roof_azimuth: Roof azimuth angle
            roof_tilt: Roof tilt angle
            annual_irradiance: Annual solar irradiance
            panel_spacing: Panel spacing dict with portrait/landscape
            panel_count: Optional panel count

        Returns:
            Dict with panel placement data or None if failed
        """
        try:
            # Try calling the actual Python panel placement service
            panel_placement_url = f"{settings.PY_SERVICE_URL}/place_panels"
            
            result = await self.call_actual_api(
                image_path,
                usable_area_result,
                panel,
                lat,
                lon,
                roof_azimuth,
                roof_tilt,
                annual_irradiance,
                panel_placement_url,
                panel_spacing,
                panel_count,
            )
            
            if result and result.get("success"):
                logger.info(f"Successfully called panel placement service. Panels placed: {result.get('panels_placed')}")
                return self._transform_placement_response(result, panel, annual_irradiance)
            else:
                logger.warning("Panel placement service returned unsuccessful result, using placeholder")
                return self._get_placeholder_response(usable_area_result, panel, panel_count, annual_irradiance)

        except Exception as e:
            logger.error(f"Panel placement error: {str(e)}")
            return self._get_placeholder_response(usable_area_result, panel, panel_count, annual_irradiance)
    
    def _get_placeholder_response(
        self, 
        usable_area_result: Dict, 
        panel: Dict, 
        panel_count: Optional[int], 
        annual_irradiance: float
    ) -> Dict:
        """Generate placeholder response when service is unavailable"""
        logger.warning("Using PLACEHOLDER for panel placement API")
        
        # Calculate estimated panel count if not provided
        if panel_count is None:
            usable_area_m2 = usable_area_result.get("usable_area_m2", 50.0)
            panel_area_m2 = (panel.get("width", 1.0) * panel.get("height", 2.0))
            panel_count = int(usable_area_m2 / panel_area_m2 * 0.8)  # 80% efficiency

        return {
            "panel_count": panel_count,
            "panel_grid": {"rows": 5, "cols": 4, "total": panel_count},
            "panel_positions": [
                {"x": i * 2, "y": j * 3, "rotation": 0}
                for i in range(4)
                for j in range(5)
            ],
            "panel_grid_image": None,
            "visualization_image": None,
            "coverage_percentage": 80.0,
            "estimated_annual_production_kwh": panel_count
            * panel.get("power", 400)
            / 1000
            * annual_irradiance,
            "_placeholder": True,
        }
    
    def _transform_placement_response(
        self, 
        result: Dict, 
        panel: Dict, 
        annual_irradiance: float
    ) -> Dict:
        """Transform panel placement API response to backend expected format"""
        panels_placed = result.get("panels_placed", 0)
        panel_positions = result.get("panel_positions", [])
        
        # Organize into grid structure
        rows = result.get("row_count", 1)
        panels_per_row = result.get("panels_per_row", [panels_placed])
        cols = max(panels_per_row) if panels_per_row else 1
        
        return {
            "panel_count": panels_placed,
            "panel_grid": {
                "rows": rows,
                "cols": cols,
                "total": panels_placed,
                "panels_per_row": panels_per_row,
            },
            "panel_positions": panel_positions,
            "panel_grid_image": None,  # Could be generated if needed
            "visualization_image": None,  # Could be generated if needed
            "coverage_percentage": result.get("coverage_percentage", 0),
            "row_spacing_m": result.get("row_spacing_m", 0.3),
            "usable_area_m2": result.get("usable_area_m2", 0),
            "total_panel_area_m2": result.get("total_panel_area_m2", 0),
            "estimated_annual_production_kwh": panels_placed
            * panel.get("power", 400)
            / 1000
            * annual_irradiance,
            "warnings": result.get("warnings", []),
            "_placeholder": False,
        }

    async def call_actual_api(
        self,
        image_path: str,
        usable_area_result: Dict,
        panel: Dict,
        lat: float,
        lon: float,
        roof_azimuth: float,
        roof_tilt: float,
        annual_irradiance: float,
        endpoint_url: str,
        panel_spacing: Dict = None,
        panel_count: Optional[int] = None,
    ) -> Optional[Dict]:
        """
        Call the actual panel placement API

        Args:
            (same as place_panels)
            endpoint_url: API endpoint URL

        Returns:
            API response or None if failed
        """
        try:
            # Get usable polygon from SAM detection result
            usable_polygon = usable_area_result.get("usable_polygon", [])
            if not usable_polygon or len(usable_polygon) < 3:
                logger.warning("No valid usable polygon for panel placement")
                return None
            
            # Get scale from SAM result
            meters_per_pixel = usable_area_result.get("meters_per_pixel", 0.3)
            
            # Calculate target panel count if not provided
            if panel_count is None:
                usable_area_m2 = usable_area_result.get("usable_area_m2", 50.0)
                panel_area_m2 = (panel.get("width", 1.0) * panel.get("height", 2.0))
                panel_count = int(usable_area_m2 / panel_area_m2 * 0.8)  # 80% fill factor
            
            # Prepare JSON request body matching PlacementRequest model
            # Get actual image dimensions from SAM result
            image_width = usable_area_result.get("image_width", 640)
            image_height = usable_area_result.get("image_height", 480)
            
            # Log key values for debugging panel sizing
            logger.info(f"📐 Panel placement params: scale={meters_per_pixel:.4f} m/px, "
                       f"panel={panel.get('width', 1.0):.2f}x{panel.get('height', 2.0):.2f}m, "
                       f"image={image_width}x{image_height}")
            
            request_data = {
                "usable_polygon": usable_polygon,
                "panel_spec": {
                    "width_mm": panel.get("width", 1.0) * 1000,  # Convert m to mm
                    "height_mm": panel.get("height", 2.0) * 1000,  # Convert m to mm
                    "rated_power_w": panel.get("power", 400),
                },
                "target_panel_count": panel_count,
                "tilt_degrees": roof_tilt,
                "azimuth_degrees": roof_azimuth,
                "scale_meters_per_pixel": meters_per_pixel,
                "image_width": image_width,
                "image_height": image_height,
                "center_lat": lat,
                "center_lng": lon,
                "min_edge_margin_m": 0.2,  # Reduced margin for more panel area
                "row_spacing_mode": "tight",  # Dense packing for maximum panels
                "orientation": "portrait",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    endpoint_url, 
                    json=request_data, 
                    timeout=60.0
                )
                response.raise_for_status()
                return response.json()

        except Exception as e:
            logger.warning(f"Panel placement API failed: {str(e)}")
            return None

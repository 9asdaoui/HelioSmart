"""
FastAPI Service for Roof Segmentation and Obstacle Detection
This service follows the same workflow as segment.ipynb but without rectangle selection.
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
import torch
import cv2
import json
import io
from PIL import Image
import tempfile
import os
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from shapely.geometry import Polygon
from segment_anything import sam_model_registry, SamPredictor, SamAutomaticMaskGenerator

app = FastAPI(title="Roof Segmentation & Panel Placement API", description="API for detecting usable roof areas and placing solar panels")

# Global variables for model loading
sam_model = None
predictor = None
mask_generator = None
model_loaded = False
model_error = None

# Model configuration
SAM_CHECKPOINT = "sam_vit_h_4b8939.pth"
MODEL_TYPE = "vit_h"
MODEL_DOWNLOAD_URL = "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth"

class RoofAnalysisRequest(BaseModel):
    center_lat: float
    center_lng: float
    scale_meters_per_pixel: float

class PolygonResponse(BaseModel):
    id: str
    polygon: List[List[float]]
    area_pixels: float
    area_m2: float
    coordinates: List[List[float]]  # Georeferenced coordinates

class ObstacleResponse(PolygonResponse):
    predicted_iou: float
    stability_score: float
    type: str

class RoofAnalysisResponse(BaseModel):
    image_info: Dict[str, Any]
    georeferencing: Dict[str, float]
    usable_roof_area: List[PolygonResponse]
    obstacles: List[ObstacleResponse]
    total_usable_area_pixels: float
    total_usable_area_m2: float
    total_obstacle_area_pixels: float
    total_obstacle_area_m2: float
    summary: Dict[str, float]

def load_sam_model():
    """
    Load SAM model once at startup with comprehensive error handling
    
    Returns:
        bool: True if model loaded successfully, False otherwise
    """
    global sam_model, predictor, mask_generator, model_loaded, model_error
    
    try:
        # Check if model file exists
        if not os.path.exists(SAM_CHECKPOINT):
            error_msg = (
                f"❌ SAM model file not found: {SAM_CHECKPOINT}\n"
                f"\n📥 To download the model:\n"
                f"1. Download from: {MODEL_DOWNLOAD_URL}\n"
                f"2. Place it in: {os.path.abspath('.')}\n"
                f"3. Or run: wget {MODEL_DOWNLOAD_URL}\n"
                f"\n⚠️  Service will run in FALLBACK mode (placeholder data only)"
            )
            print(error_msg)
            model_error = "Model file not found"
            model_loaded = False
            return False
        
        print(f"📦 Loading SAM model from {SAM_CHECKPOINT}...")
        
        # Check file size (SAM ViT-H should be ~2.4GB)
        file_size = os.path.getsize(SAM_CHECKPOINT) / (1024**3)  # GB
        print(f"📊 Model file size: {file_size:.2f} GB")
        
        if file_size < 2.0:
            error_msg = (
                f"⚠️  Model file seems too small ({file_size:.2f} GB). Expected ~2.4 GB.\n"
                f"File may be corrupted or incomplete. Please re-download from:\n"
                f"{MODEL_DOWNLOAD_URL}"
            )
            print(error_msg)
            model_error = "Model file corrupted or incomplete"
            model_loaded = False
            return False
        
        # Use CUDA if available, otherwise fallback to CPU
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"🖥️  Using device: {device.upper()}")
        
        if device == "cuda":
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            print(f"🎮 GPU: {gpu_name} ({gpu_memory:.1f} GB)")
            
            if gpu_memory < 6:
                print(f"⚠️  Warning: GPU has only {gpu_memory:.1f} GB memory. SAM ViT-H requires ~6GB.")
                print(f"💡 Consider using ViT-B model for lower memory usage.")
        
        # Initialize SAM model
        print(f"🔧 Initializing SAM {MODEL_TYPE.upper()} model...")
        sam_model = sam_model_registry[MODEL_TYPE](checkpoint=SAM_CHECKPOINT)
        sam_model.to(device=device)
        
        # Initialize predictor
        print("🔧 Initializing SAM predictor...")
        predictor = SamPredictor(sam_model)
        
        # Initialize mask generator
        print("🔧 Initializing automatic mask generator...")
        mask_generator = SamAutomaticMaskGenerator(
            model=sam_model,
            points_per_side=32,
            pred_iou_thresh=0.86,
            stability_score_thresh=0.92,
            crop_n_layers=1,
            crop_n_points_downscale_factor=2,
            min_mask_region_area=100
        )
        
        model_loaded = True
        model_error = None
        print("✅ SAM model loaded successfully!")
        print("🚀 Service ready for roof segmentation.")
        return True
        
    except KeyError as e:
        error_msg = (
            f"❌ Invalid model type '{MODEL_TYPE}'. Available types: {list(sam_model_registry.keys())}\n"
            f"Error: {str(e)}"
        )
        print(error_msg)
        model_error = f"Invalid model type: {str(e)}"
        model_loaded = False
        return False
        
    except RuntimeError as e:
        error_msg = (
            f"❌ Runtime error loading model:\n{str(e)}\n\n"
            f"💡 Possible solutions:\n"
            f"1. Check if you have enough GPU/RAM memory\n"
            f"2. Try using CPU by setting CUDA_VISIBLE_DEVICES=''\n"
            f"3. Download a smaller model (ViT-B instead of ViT-H)\n"
            f"\n⚠️  Service will run in FALLBACK mode (placeholder data only)"
        )
        print(error_msg)
        model_error = f"Runtime error: {str(e)}"
        model_loaded = False
        return False
        
    except Exception as e:
        error_msg = (
            f"❌ Unexpected error loading SAM model:\n{str(e)}\n"
            f"Type: {type(e).__name__}\n"
            f"\n⚠️  Service will run in FALLBACK mode (placeholder data only)"
        )
        print(error_msg)
        model_error = f"Unexpected error: {str(e)}"
        model_loaded = False
        return False

def mask_to_polygon(mask):
    """Convert a binary mask to polygon coordinates"""
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    polygons = []
    for contour in contours:
        epsilon = 0.002 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)
        
        if len(approx) >= 3:
            polygon_coords = approx.reshape(-1, 2).tolist()
            polygons.append(polygon_coords)
    
    return polygons

def calculate_polygon_area(polygon_coords):
    """Calculate area of a polygon using Shapely"""
    if len(polygon_coords) < 3:
        return 0
    try:
        poly = Polygon(polygon_coords)
        return poly.area
    except:
        return 0

def pixel_to_geo_coordinates(pixel_coords, center_lat, center_lng, scale_meters_per_pixel, image_width, image_height):
    """Convert pixel coordinates to geographic coordinates"""
    # Convert pixel coordinates to meters relative to image center
    center_x = image_width / 2
    center_y = image_height / 2
    
    geo_coords = []
    for pixel_x, pixel_y in pixel_coords:
        # Calculate offset from center in pixels
        dx_pixels = pixel_x - center_x
        dy_pixels = center_y - pixel_y  # Flip Y axis (image coordinates vs geographic)
        
        # Convert to meters
        dx_meters = dx_pixels * scale_meters_per_pixel
        dy_meters = dy_pixels * scale_meters_per_pixel
        
        # Convert meters to degrees (approximate)
        # 1 degree latitude ≈ 111,111 meters
        # 1 degree longitude ≈ 111,111 * cos(latitude) meters
        lat_offset = dy_meters / 111111.0
        lng_offset = dx_meters / (111111.0 * np.cos(np.radians(center_lat)))
        
        geo_lat = center_lat + lat_offset
        geo_lng = center_lng + lng_offset
        
        geo_coords.append([geo_lng, geo_lat])  # [longitude, latitude] format
    
    return geo_coords

def show_anns(anns):
    """Process annotations and return sorted masks with colors"""
    if len(anns) == 0:
        return [], []
    
    sorted_anns = sorted(anns, key=(lambda x: x['area']), reverse=True)
    colors = []
    
    for ann in sorted_anns:
        color_mask = np.random.random(3)
        colors.append(color_mask)
    
    return colors, sorted_anns

def get_fallback_response(image_array, center_lat, center_lng, scale_meters_per_pixel):
    """
    Generate fallback/placeholder response when SAM model is not available
    
    Returns simple rectangular roof area approximation
    """
    h, w = image_array.shape[:2]
    
    # Create a simple rectangular polygon (80% of image)
    margin = 0.1
    polygon = [
        [int(w * margin), int(h * margin)],
        [int(w * (1 - margin)), int(h * margin)],
        [int(w * (1 - margin)), int(h * (1 - margin))],
        [int(w * margin), int(h * (1 - margin))],
        [int(w * margin), int(h * margin)]
    ]
    
    area_pixels = w * h * 0.64  # 80% x 80% = 64%
    area_m2 = area_pixels * (scale_meters_per_pixel ** 2)
    
    geo_coords = pixel_to_geo_coordinates(polygon, center_lat, center_lng, scale_meters_per_pixel, w, h)
    
    return {
        "image_info": {
            "dimensions": {"width": w, "height": h}
        },
        "georeferencing": {
            "center_lat": center_lat,
            "center_lng": center_lng,
            "scale_meters_per_pixel": scale_meters_per_pixel
        },
        "usable_roof_area": [
            {
                "id": "roof_area_1_fallback",
                "polygon": polygon,
                "area_pixels": area_pixels,
                "area_m2": area_m2,
                "coordinates": geo_coords
            }
        ],
        "obstacles": [],
        "total_usable_area_pixels": area_pixels,
        "total_usable_area_m2": area_m2,
        "total_obstacle_area_pixels": 0,
        "total_obstacle_area_m2": 0,
        "summary": {
            "total_roof_segments": 1,
            "total_obstacles": 0,
            "usable_area_percentage": 100.0,
            "obstacle_area_percentage": 0.0,
            "total_area_m2": area_m2
        },
        "_fallback": True,
        "_fallback_reason": model_error or "SAM model not loaded"
    }

def process_image_workflow(image_array, center_lat, center_lng, scale_meters_per_pixel, roof_points=None):
    """
    Process image following the exact workflow from segment.ipynb
    Returns processed data for JSON response
    
    Falls back to placeholder response if SAM model is not loaded
    
    Args:
        image_array: Input image as numpy array
        center_lat: Center latitude for georeferencing
        center_lng: Center longitude for georeferencing
        scale_meters_per_pixel: Conversion factor from pixels to meters
        roof_points: Optional list of {x, y} percentage points from user (for SAM point prompts)
    """
    global predictor, mask_generator, model_loaded
    
    # Check if model is loaded
    if not model_loaded or predictor is None or mask_generator is None:
        print("⚠️  SAM model not available, using fallback response")
        return get_fallback_response(image_array, center_lat, center_lng, scale_meters_per_pixel)
    
    # Step 1: Convert image to RGB
    if len(image_array.shape) == 3 and image_array.shape[2] == 3:
        image_rgb = image_array
    else:
        image_rgb = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)
    
    image_final = image_rgb.copy()
    
    # Step 2: Apply Gaussian Blur and Canny Edge Detection
    gray_image = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    blurred_image = cv2.GaussianBlur(gray_image, (5, 5), 0)
    edges = cv2.Canny(blurred_image, 100, 200)
    edges_colored = cv2.cvtColor(edges, cv2.COLOR_GRAY2RGB)
    enhanced_image = cv2.addWeighted(image_rgb, 0.8, edges_colored, 0.2, 0)
    image_rgb = enhanced_image
    
    # Step 3: Use entire image as bounding box (no rectangle selection)
    h, w = image_rgb.shape[:2]
    input_box = np.array([[0, 0], [w, h]], dtype=int)
    
    # Step 4: Initialize SAM predictor and predict mask
    predictor.set_image(image_rgb)
    
    # Convert user-placed points to pixel coordinates for SAM point prompts
    point_coords = None
    point_labels = None
    if roof_points and len(roof_points) > 0:
        # Convert percentage coordinates to pixel coordinates
        # roof_points format: [{x: 0-100, y: 0-100}, ...]
        point_coords = np.array([
            [p.get('x', 50) * w / 100, p.get('y', 50) * h / 100]
            for p in roof_points
        ])
        # All points are positive prompts (label = 1 means foreground/roof)
        point_labels = np.ones(len(roof_points), dtype=int)
        print(f"🎯 Using {len(roof_points)} point prompts for SAM prediction")
    
    # Predict with point prompts if available, otherwise just use bounding box
    if point_coords is not None:
        masks, scores, logits = predictor.predict(
            point_coords=point_coords,
            point_labels=point_labels,
            box=input_box,
            multimask_output=True,
        )
    else:
        masks, scores, logits = predictor.predict(
            box=input_box,
            multimask_output=True,
        )
    
    # Select the best mask
    best_mask = masks[np.argmax(scores)]
    
    # Step 5: Create cut-out image
    mask_coords = np.where(best_mask)
    x_min, x_max = np.min(mask_coords[1]), np.max(mask_coords[1])
    y_min, y_max = np.min(mask_coords[0]), np.max(mask_coords[0])
    
    cut_out_image = image_rgb.copy()
    cut_out_image[~best_mask] = 0
    
    # Step 6: Apply zoom (only if zoom_level > 0)
    # BUG FIX: When zoom_level = 0, do NOT crop+resize — that "zoom to bounding box" operation
    # inflates the apparent mask coverage (28% → 60%+) and causes 2-3x area overcount.
    zoom_level = 0.0
    if zoom_level > 0:
        x_range = x_max - x_min
        y_range = y_max - y_min
        zoom_x_min = max(int(x_min + x_range * zoom_level), 0)
        zoom_x_max = min(int(x_max - x_range * zoom_level), cut_out_image.shape[1])
        zoom_y_min = max(int(y_min + y_range * zoom_level), 0)
        zoom_y_max = min(int(y_max - y_range * zoom_level), cut_out_image.shape[0])
        zoomed_section = cut_out_image[zoom_y_min:zoom_y_max, zoom_x_min:zoom_x_max]
        zoomed_section_resized = cv2.resize(
            zoomed_section,
            (cut_out_image.shape[1], cut_out_image.shape[0]),
            interpolation=cv2.INTER_LINEAR
        )
        cut_out_image = zoomed_section_resized
        print(f"   🔍 Zoom applied: cropped {zoom_x_max-zoom_x_min}×{zoom_y_max-zoom_y_min} → {cut_out_image.shape[1]}×{cut_out_image.shape[0]}")
    # else: cut_out_image stays at original resolution with non-roof pixels = black
    
    # Step 7: Automatic mask generation on the cut-out image
    # The cut_out still has non-roof pixels = black, so mask_generator works on the
    # correct spatial scale. The largest generated mask = main roof surface.
    masks = mask_generator.generate(cut_out_image)
    colors, sorted_masks = show_anns(masks)
    
    # Step 8: Build the usable roof mask
    # ─────────────────────────────────────────────────────────────────────────
    # BUG FIX: On a cut-out image (non-roof pixels = black), mask_generator
    # treats the large black background as the single biggest region →
    # sorted_masks[0] IS the background, NOT the roof.
    #
    # Correct approach:
    #   • Use best_mask (from predictor, Step 4) as the authoritative roof shape.
    #   • Use mask_generator sub-masks that overlap significantly with best_mask
    #     as obstacle candidates (sub-features on the roof surface).
    # ─────────────────────────────────────────────────────────────────────────
    best_mask_pixels = best_mask.sum()
    best_coverage = best_mask_pixels / (h * w)
    print(f"   🏠 Predictor roof mask: {best_coverage*100:.1f}% of image ({best_mask_pixels} px)")

    # Obstacle candidates = sub-masks whose pixels are MOSTLY inside best_mask
    obstacle_candidates = []
    for mask_data in sorted_masks:
        seg = mask_data['segmentation']
        if seg.sum() == 0:
            continue
        overlap_ratio = (seg & best_mask).sum() / seg.sum()
        seg_coverage  = seg.sum() / (h * w)
        # Accept as an obstacle candidate if:
        #   ≥60 % of its pixels lie inside the roof boundary (not background)
        #   AND it doesn't cover the whole image (i.e. not the background itself)
        if overlap_ratio >= 0.60 and seg_coverage < 0.40:
            obstacle_candidates.append(mask_data)

    print(f"   🔧 {len(obstacle_candidates)} sub-feature candidate(s) found inside roof boundary")

    # Subtract all obstacle candidates from the roof to get clean usable area
    obstacle_union = np.zeros_like(best_mask, dtype=bool)
    for mask_data in obstacle_candidates:
        obstacle_union |= mask_data['segmentation']

    first_mask_cut = best_mask & ~obstacle_union
    
    # Step 9: Create JSON response data
    roof_data = {
        "image_info": {
            "dimensions": {
                "width": w,
                "height": h
            }
        },
        "georeferencing": {
            "center_lat": center_lat,
            "center_lng": center_lng,
            "scale_meters_per_pixel": scale_meters_per_pixel
        },
        "usable_roof_area": [],
        "obstacles": [],
        "total_usable_area_pixels": 0,
        "total_usable_area_m2": 0,
        "total_obstacle_area_pixels": 0,
        "total_obstacle_area_m2": 0
    }
    
    # Process usable roof area
    if first_mask_cut is not None:
        roof_polygons = mask_to_polygon(first_mask_cut)
        total_usable_area_pixels = 0
        
        for i, polygon in enumerate(roof_polygons):
            area_pixels = calculate_polygon_area(polygon)
            area_m2 = area_pixels * (scale_meters_per_pixel ** 2)
            total_usable_area_pixels += area_pixels
            
            # Convert to geographic coordinates
            geo_coords = pixel_to_geo_coordinates(polygon, center_lat, center_lng, scale_meters_per_pixel, w, h)
            
            roof_data["usable_roof_area"].append({
                "id": f"roof_area_{i+1}",
                "polygon": polygon,
                "area_pixels": area_pixels,
                "area_m2": area_m2,
                "coordinates": geo_coords
            })
        
        roof_data["total_usable_area_pixels"] = total_usable_area_pixels
        roof_data["total_usable_area_m2"] = total_usable_area_pixels * (scale_meters_per_pixel ** 2)
    
    # Process obstacles — strict noise filter to remove shadow/texture artefacts
    # Rule: only keep obstacles ≥ 2.5 m² (real chimneys, AC units, skylights)
    MIN_OBSTACLE_AREA_M2 = 2.5

    if len(obstacle_candidates) > 0:
        total_obstacle_area_pixels = 0
        filtered_count = 0

        for i, mask_data in enumerate(obstacle_candidates):
            obstacle_mask = mask_data['segmentation']
            obstacle_polygons = mask_to_polygon(obstacle_mask)
            
            for j, polygon in enumerate(obstacle_polygons):
                area_pixels = calculate_polygon_area(polygon)
                area_m2 = area_pixels * (scale_meters_per_pixel ** 2)
                
                # Skip obstacles smaller than minimum threshold
                if area_m2 < MIN_OBSTACLE_AREA_M2:
                    filtered_count += 1
                    continue
                
                total_obstacle_area_pixels += area_pixels
                
                # Convert to geographic coordinates
                geo_coords = pixel_to_geo_coordinates(polygon, center_lat, center_lng, scale_meters_per_pixel, w, h)
                
                roof_data["obstacles"].append({
                    "id": f"obstacle_{i}_{j+1}",
                    "polygon": polygon,
                    "area_pixels": area_pixels,
                    "area_m2": area_m2,
                    "coordinates": geo_coords,
                    "predicted_iou": mask_data['predicted_iou'],
                    "stability_score": mask_data['stability_score'],
                    "type": "unknown"
                })
        
        roof_data["total_obstacle_area_pixels"] = total_obstacle_area_pixels
        roof_data["total_obstacle_area_m2"] = total_obstacle_area_pixels * (scale_meters_per_pixel ** 2)
        
        if filtered_count > 0:
            print(f"📦 Filtered out {filtered_count} obstacles smaller than {MIN_OBSTACLE_AREA_M2} m²")
    
    # Add summary
    total_detected_area = roof_data["total_usable_area_pixels"] + roof_data["total_obstacle_area_pixels"]
    roof_data["summary"] = {
        "total_roof_segments": len(roof_data["usable_roof_area"]),
        "total_obstacles": len(roof_data["obstacles"]),
        "usable_area_percentage": (roof_data["total_usable_area_pixels"] / total_detected_area * 100) if total_detected_area > 0 else 0,
        "obstacle_area_percentage": (roof_data["total_obstacle_area_pixels"] / total_detected_area * 100) if total_detected_area > 0 else 0,
        "total_area_m2": roof_data["total_usable_area_m2"] + roof_data["total_obstacle_area_m2"]
    }
    
    return roof_data

@app.on_event("startup")
async def startup_event():
    """
    Load SAM model on startup
    Continues even if model fails to load (fallback mode)
    """
    print("\n" + "="*60)
    print("🚀 Starting Roof Segmentation API")
    print("="*60)
    
    success = load_sam_model()
    
    if success:
        print("\n✅ Service started successfully with SAM model")
    else:
        print("\n⚠️  Service started in FALLBACK mode")
        print("📝 API will return placeholder data until model is loaded")
    
    print("="*60 + "\n")

@app.post("/analyze_roof", response_model=RoofAnalysisResponse)
async def analyze_roof(
    image: UploadFile = File(...),
    center_lat: float = Form(...),
    center_lng: float = Form(...),
    scale_meters_per_pixel: float = Form(...),
    roof_points: str = Form(None)  # JSON array of {x, y} percentage points from user
):
    """
    Analyze roof image to detect usable areas and obstacles
    
    Args:
        image: Uploaded image file
        center_lat: Latitude coordinate of image center
        center_lng: Longitude coordinate of image center
        scale_meters_per_pixel: Scale factor for converting pixels to meters
    
    Returns:
        JSON response with usable roof areas and obstacles as polygons
    """
    try:
        # Validate input parameters
        if not (-90 <= center_lat <= 90):
            raise HTTPException(status_code=400, detail="Invalid latitude. Must be between -90 and 90.")
        if not (-180 <= center_lng <= 180):
            raise HTTPException(status_code=400, detail="Invalid longitude. Must be between -180 and 180.")
        if scale_meters_per_pixel <= 0:
            raise HTTPException(status_code=400, detail="Scale must be positive.")
        
        # Check if image is provided
        if not image:
            raise HTTPException(status_code=400, detail="No image provided.")
        
        # Read image
        image_data = await image.read()
        
        # Convert to numpy array
        pil_image = Image.open(io.BytesIO(image_data))
        image_array = np.array(pil_image)
        
        # Ensure image is in RGB format
        if len(image_array.shape) == 2:  # Grayscale
            image_array = cv2.cvtColor(image_array, cv2.COLOR_GRAY2RGB)
        elif len(image_array.shape) == 3 and image_array.shape[2] == 4:  # RGBA
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGBA2RGB)
        
        # Parse roof_points if provided
        parsed_points = None
        if roof_points:
            try:
                parsed_points = json.loads(roof_points)
                print(f"📍 Received {len(parsed_points)} user-placed roof points")
            except json.JSONDecodeError:
                print("⚠️  Failed to parse roof_points JSON, ignoring")
        
        # ── Scale calibration ─────────────────────────────────────────────────
        # The frontend captures with html2canvas scale:2, which doubles the pixel
        # density relative to the geographic bounds calculation.  Dividing by 2
        # corrects the 4× area inflation (area ∝ scale²).
        SCALE_CORRECTION = 2.0
        effective_scale = scale_meters_per_pixel / SCALE_CORRECTION

        # Debug logging
        print(f"\n🔍 SCALE DEBUG:")
        print(f"   Browser scale (raw):      {scale_meters_per_pixel:.6f} m/px")
        print(f"   Effective scale (÷{SCALE_CORRECTION}):   {effective_scale:.6f} m/px")
        image_w = image_array.shape[1]
        image_h = image_array.shape[0]
        image_area_pixels = image_w * image_h
        total_image_m2 = (image_w * effective_scale) * (image_h * effective_scale)
        print(f"   Image size: {image_w}×{image_h} px  →  {image_w*effective_scale:.1f}m × {image_h*effective_scale:.1f}m")
        print(f"   Total image area: {total_image_m2:.1f} m²  (expected < 600 m² for a house view)")
        if total_image_m2 > 1000:
            print(f"   ⚠️  Still large — consider re-capturing at zoom 20")
        else:
            print(f"   ✅ Image footprint looks correct for a house-level view")

        # Process image using the corrected scale
        result = process_image_workflow(image_array, center_lat, center_lng, effective_scale, parsed_points)
        
        # Log the detected area
        total_area = result.get("total_usable_area_m2", 0)
        total_pixels = result.get("total_usable_area_pixels", 0)
        print(f"   Detected usable area: {total_pixels:.0f} px² = {total_area:.1f} m²")
        print(f"   Coverage: {(total_pixels/image_area_pixels*100):.1f}% of image\n")
        
        # Add warning if using fallback mode
        if not model_loaded:
            print(f"⚠️  Request processed in FALLBACK mode (placeholder data returned)")
            result["_warning"] = "SAM model not loaded - using placeholder data. See /model/info for troubleshooting."
        
        return JSONResponse(content=result)
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        error_detail = f"Error processing image: {str(e)}"
        print(f"❌ {error_detail}")
        raise HTTPException(status_code=500, detail=error_detail)

@app.get("/health")
async def health_check():
    """Health check endpoint with detailed model status"""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    health_data = {
        "status": "healthy",
        "model_loaded": model_loaded,
        "model_error": model_error,
        "device": device,
        "mode": "production" if model_loaded else "fallback"
    }
    
    if device == "cuda" and torch.cuda.is_available():
        health_data["gpu_info"] = {
            "name": torch.cuda.get_device_name(0),
            "memory_gb": round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2)
        }
    
    if model_loaded:
        health_data["model_info"] = {
            "checkpoint": SAM_CHECKPOINT,
            "type": MODEL_TYPE,
            "file_size_gb": round(os.path.getsize(SAM_CHECKPOINT) / (1024**3), 2)
        }
    else:
        health_data["help"] = {
            "download_url": MODEL_DOWNLOAD_URL,
            "install_location": os.path.abspath(SAM_CHECKPOINT)
        }
    
    return health_data

@app.get("/model/info")
async def model_info():
    """Get detailed model information and troubleshooting"""
    if model_loaded:
        return {
            "status": "loaded",
            "checkpoint": SAM_CHECKPOINT,
            "model_type": MODEL_TYPE,
            "device": "cuda" if torch.cuda.is_available() else "cpu",
            "file_exists": os.path.exists(SAM_CHECKPOINT),
            "file_size_gb": round(os.path.getsize(SAM_CHECKPOINT) / (1024**3), 2) if os.path.exists(SAM_CHECKPOINT) else None
        }
    else:
        return {
            "status": "not_loaded",
            "error": model_error,
            "checkpoint_path": os.path.abspath(SAM_CHECKPOINT),
            "file_exists": os.path.exists(SAM_CHECKPOINT),
            "download_instructions": {
                "url": MODEL_DOWNLOAD_URL,
                "commands": [
                    f"wget {MODEL_DOWNLOAD_URL}",
                    f"# Or use curl:",
                    f"curl -L -o {SAM_CHECKPOINT} {MODEL_DOWNLOAD_URL}"
                ],
                "windows_powershell": f"Invoke-WebRequest -Uri {MODEL_DOWNLOAD_URL} -OutFile {SAM_CHECKPOINT}"
            },
            "alternative_models": {
                "vit_b": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth (375MB)",
                "vit_l": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_l_0b3195.pth (1.2GB)"
            }
        }

# ============ Panel Placement Integration ============

import math as math_module

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
    row_spacing_mode: str = Field(default="tight", description="'auto', 'tight', or 'shade-free'")
    orientation: str = Field(default="portrait", description="'portrait' or 'landscape'")


class PanelPosition(BaseModel):
    """Individual panel position"""
    id: int
    center_x: float
    center_y: float
    corners: List[List[float]]
    geo_center: List[float]
    geo_corners: List[List[float]]
    row: int
    column: int


class PlacementResponse(BaseModel):
    """Response with panel placement results"""
    success: bool
    panels_placed: int
    target_panel_count: int
    panel_positions: List[Dict[str, Any]]
    coverage_percentage: float
    total_panel_area_m2: float
    usable_area_m2: float
    row_count: int
    panels_per_row: List[int]
    row_spacing_m: float
    panel_footprint_m2: float
    effective_panel_footprint_m2: float
    message: str
    warnings: List[str]


def calculate_panel_footprint(panel_spec: PanelSpec, tilt_degrees: float, orientation: str):
    """Calculate effective panel footprint on roof surface"""
    width_m = panel_spec.width_mm / 1000.0
    height_m = panel_spec.height_mm / 1000.0
    
    if orientation.lower() == 'landscape':
        width_m, height_m = height_m, width_m
    
    tilt_rad = math_module.radians(tilt_degrees)
    projected_height = height_m * math_module.cos(tilt_rad)
    
    return width_m, projected_height


def calculate_row_spacing(panel_height_m: float, tilt_degrees: float, latitude: float, mode: str = "auto") -> float:
    """Calculate optimal row spacing to minimize shading
    
    Modes:
    - 'tight': Minimal spacing (30% of panel height) - maximizes panel density
    - 'auto': Balanced spacing accounting for partial shading
    - 'shade-free': Full shadow clearance at winter solstice
    """
    MIN_ROW_SPACING_FACTOR = 0.15  # Reduced from 0.3 for tighter packing
    tilt_rad = math_module.radians(tilt_degrees)
    projected_height = panel_height_m * math_module.cos(tilt_rad)
    
    if mode == "tight":
        # Minimal gap - just enough for maintenance access
        return max(panel_height_m * MIN_ROW_SPACING_FACTOR, 0.1)
    
    winter_sun_alt = 90 - abs(latitude) - 23.45
    winter_sun_alt = max(winter_sun_alt, 15)
    sun_alt_rad = math_module.radians(winter_sun_alt)
    
    shadow_length = panel_height_m * math_module.sin(tilt_rad) / math_module.tan(sun_alt_rad)
    
    if mode == "shade-free":
        return shadow_length + projected_height * 0.1
    
    # Auto mode: accept partial morning/evening shading for higher density
    # Use 40% of shadow length instead of 70%
    return shadow_length * 0.4 + projected_height * 0.05


def get_rotated_panel_corners(center_x: float, center_y: float, 
                              width_px: float, height_px: float, 
                              azimuth_degrees: float) -> List[List[float]]:
    """Get the 4 corners of a rotated panel rectangle"""
    half_w = width_px / 2
    half_h = height_px / 2
    
    corners = [
        [-half_w, -half_h],
        [half_w, -half_h],
        [half_w, half_h],
        [-half_w, half_h]
    ]
    
    rotation_rad = math_module.radians(azimuth_degrees - 180)
    cos_r = math_module.cos(rotation_rad)
    sin_r = math_module.sin(rotation_rad)
    
    rotated_corners = []
    for x, y in corners:
        rx = x * cos_r - y * sin_r + center_x
        ry = x * sin_r + y * cos_r + center_y
        rotated_corners.append([rx, ry])
    
    return rotated_corners


def place_panels_in_polygon(request: PlacementRequest) -> Dict[str, Any]:
    """Main algorithm to place panels within usable polygon"""
    warnings = []
    
    if len(request.usable_polygon) < 3:
        return {
            "success": False,
            "panels_placed": 0,
            "target_panel_count": request.target_panel_count,
            "panel_positions": [],
            "coverage_percentage": 0,
            "total_panel_area_m2": 0,
            "usable_area_m2": 0,
            "row_count": 0,
            "panels_per_row": [],
            "row_spacing_m": 0,
            "panel_footprint_m2": 0,
            "effective_panel_footprint_m2": 0,
            "message": "Invalid polygon: need at least 3 points",
            "warnings": []
        }
    
    try:
        usable_poly = Polygon(request.usable_polygon)
        if not usable_poly.is_valid:
            usable_poly = usable_poly.buffer(0)
    except Exception as e:
        return {
            "success": False,
            "panels_placed": 0,
            "target_panel_count": request.target_panel_count,
            "panel_positions": [],
            "coverage_percentage": 0,
            "total_panel_area_m2": 0,
            "usable_area_m2": 0,
            "row_count": 0,
            "panels_per_row": [],
            "row_spacing_m": 0,
            "panel_footprint_m2": 0,
            "effective_panel_footprint_m2": 0,
            "message": f"Invalid polygon: {str(e)}",
            "warnings": []
        }
    
    usable_area_pixels = usable_poly.area
    usable_area_m2 = usable_area_pixels * (request.scale_meters_per_pixel ** 2)
    
    panel_width_m, panel_height_m = calculate_panel_footprint(
        request.panel_spec, request.tilt_degrees, request.orientation
    )
    
    panel_width_px = panel_width_m / request.scale_meters_per_pixel
    panel_height_px = panel_height_m / request.scale_meters_per_pixel
    
    # Debug logging for panel placement
    print(f"📐 Panel Placement Debug:")
    print(f"   Scale: {request.scale_meters_per_pixel:.4f} m/pixel")
    print(f"   Panel real size: {request.panel_spec.width_mm/1000:.2f}m × {request.panel_spec.height_mm/1000:.2f}m")
    print(f"   Panel footprint: {panel_width_m:.2f}m × {panel_height_m:.2f}m (after tilt projection)")
    print(f"   Panel in pixels: {panel_width_px:.1f}px × {panel_height_px:.1f}px")
    print(f"   Usable area: {usable_area_m2:.1f} m² ({usable_area_pixels:.0f} px²)")
    print(f"   Image: {request.image_width}x{request.image_height}px")
    
    actual_width_m = request.panel_spec.width_mm / 1000.0
    actual_height_m = request.panel_spec.height_mm / 1000.0
    if request.orientation.lower() == 'landscape':
        actual_width_m, actual_height_m = actual_height_m, actual_width_m
    panel_footprint_m2 = actual_width_m * actual_height_m
    effective_panel_footprint_m2 = panel_width_m * panel_height_m
    
    row_spacing_m = calculate_row_spacing(
        panel_height_m, 
        request.tilt_degrees, 
        request.center_lat,
        request.row_spacing_mode
    )
    row_spacing_px = row_spacing_m / request.scale_meters_per_pixel
    
    print(f"   Row spacing: {row_spacing_m:.2f}m ({row_spacing_px:.1f}px), mode={request.row_spacing_mode}")
    
    panel_gap_m = 0.02
    panel_gap_px = panel_gap_m / request.scale_meters_per_pixel
    
    minx, miny, maxx, maxy = usable_poly.bounds
    print(f"   Polygon bounds: ({minx:.0f},{miny:.0f}) to ({maxx:.0f},{maxy:.0f})")
    
    margin_px = request.min_edge_margin_m / request.scale_meters_per_pixel
    minx += margin_px
    miny += margin_px
    maxx -= margin_px
    maxy -= margin_px
    
    # Calculate theoretical max panels
    available_width = maxx - minx
    available_height = maxy - miny
    max_cols = int(available_width / (panel_width_px + panel_gap_px))
    max_rows = int(available_height / (panel_height_px + row_spacing_px))
    theoretical_max = max_cols * max_rows
    print(f"   Available space: {available_width:.0f}px × {available_height:.0f}px")
    print(f"   Theoretical grid: {max_cols} cols × {max_rows} rows = {theoretical_max} panels")
    
    try:
        shrunk_poly = usable_poly.buffer(-margin_px)
        if shrunk_poly.is_empty or not shrunk_poly.is_valid:
            shrunk_poly = usable_poly
            warnings.append("Could not apply edge margin - polygon too small")
    except:
        shrunk_poly = usable_poly
        warnings.append("Could not apply edge margin")
    
    panel_positions = []
    panel_id = 1
    row_num = 0
    panels_per_row = []
    
    current_y = miny + panel_height_px / 2
    
    while current_y < maxy - panel_height_px / 2:
        row_panels = 0
        col_num = 0
        
        current_x = minx + panel_width_px / 2
        
        while current_x < maxx - panel_width_px / 2:
            if len(panel_positions) >= request.target_panel_count:
                break
            
            corners = get_rotated_panel_corners(
                current_x, current_y, panel_width_px, panel_height_px, request.azimuth_degrees
            )
            
            panel_poly = Polygon(corners)
            
            if shrunk_poly.contains(panel_poly):
                geo_center = pixel_to_geo_coordinates(
                    [[current_x, current_y]],
                    request.center_lat, request.center_lng,
                    request.scale_meters_per_pixel,
                    request.image_width, request.image_height
                )[0]
                
                geo_corners = pixel_to_geo_coordinates(
                    corners,
                    request.center_lat, request.center_lng,
                    request.scale_meters_per_pixel,
                    request.image_width, request.image_height
                )
                
                panel_positions.append({
                    "id": panel_id,
                    "center_x": current_x,
                    "center_y": current_y,
                    "corners": corners,
                    "geo_center": geo_center,
                    "geo_corners": geo_corners,
                    "row": row_num,
                    "column": col_num
                })
                
                panel_id += 1
                row_panels += 1
                col_num += 1
            
            current_x += panel_width_px + panel_gap_px
        
        if row_panels > 0:
            panels_per_row.append(row_panels)
            row_num += 1
        
        current_y += panel_height_px + row_spacing_px
        
        if len(panel_positions) >= request.target_panel_count:
            break
    
    total_panel_area_m2 = len(panel_positions) * panel_footprint_m2
    coverage_percentage = (total_panel_area_m2 / usable_area_m2 * 100) if usable_area_m2 > 0 else 0
    
    if len(panel_positions) >= request.target_panel_count:
        message = f"Successfully placed all {request.target_panel_count} panels"
    elif len(panel_positions) > 0:
        message = f"Placed {len(panel_positions)} of {request.target_panel_count} panels (limited by usable area)"
        warnings.append(f"Could only fit {len(panel_positions)} panels in available area")
    else:
        message = "Could not place any panels - area too small or invalid polygon"
    
    return {
        "success": len(panel_positions) > 0,
        "panels_placed": len(panel_positions),
        "target_panel_count": request.target_panel_count,
        "panel_positions": panel_positions,
        "coverage_percentage": round(coverage_percentage, 1),
        "total_panel_area_m2": round(total_panel_area_m2, 2),
        "usable_area_m2": round(usable_area_m2, 2),
        "row_count": row_num,
        "panels_per_row": panels_per_row,
        "row_spacing_m": round(row_spacing_m, 3),
        "panel_footprint_m2": round(panel_footprint_m2, 3),
        "effective_panel_footprint_m2": round(effective_panel_footprint_m2, 3),
        "message": message,
        "warnings": warnings
    }


@app.post("/place_panels")
async def place_panels(request: PlacementRequest):
    """
    Calculate optimal panel placement within usable roof area
    
    Takes the usable polygon from SAM detection and places panels
    according to specifications, tilt, azimuth, and spacing requirements.
    """
    try:
        result = place_panels_in_polygon(request)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error placing panels: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Roof Segmentation & Panel Placement API",
        "description": "Upload an image with georeferencing info to get usable roof areas, obstacles, and panel placements",
        "endpoints": {
            "POST /analyze_roof": "Detect usable roof area and obstacles",
            "POST /place_panels": "Calculate optimal panel placement",
            "GET /health": "Health check",
            "GET /docs": "Interactive API documentation"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8889)

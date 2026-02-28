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
from pydantic import BaseModel
from shapely.geometry import Polygon
from segment_anything import sam_model_registry, SamPredictor, SamAutomaticMaskGenerator

app = FastAPI(title="Roof Segmentation API", description="API for detecting usable roof areas and obstacles")

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

def process_image_workflow(image_array, center_lat, center_lng, scale_meters_per_pixel):
    """
    Process image following the exact workflow from segment.ipynb
    Returns processed data for JSON response
    
    Falls back to placeholder response if SAM model is not loaded
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
    
    # Step 6: Apply zoom (no zoom in this case)
    zoom_level = 0.0
    x_range = x_max - x_min
    y_range = y_max - y_min
    zoom_x_min = max(int(x_min + x_range * zoom_level), 0)
    zoom_x_max = min(int(x_max - x_range * zoom_level), cut_out_image.shape[1])
    zoom_y_min = max(int(y_min + y_range * zoom_level), 0)
    zoom_y_max = min(int(y_max - y_range * zoom_level), cut_out_image.shape[0])
    
    zoomed_section = cut_out_image[zoom_y_min:zoom_y_max, zoom_x_min:zoom_x_max]
    zoomed_section_resized = cv2.resize(zoomed_section, (cut_out_image.shape[1], cut_out_image.shape[0]), interpolation=cv2.INTER_LINEAR)
    cut_out_image = zoomed_section_resized
    
    # Step 7: Automatic mask generation
    masks = mask_generator.generate(cut_out_image)
    colors, sorted_masks = show_anns(masks)
    
    # Step 8: Process masks
    first_mask_cut = None
    if len(sorted_masks) > 0:
        first_mask = sorted_masks[0]
        combined_other_masks = np.zeros_like(first_mask['segmentation'], dtype=bool)
        
        for i, mask in enumerate(sorted_masks):
            if i != 0:
                combined_other_masks |= mask['segmentation']
        
        first_mask_cut = first_mask['segmentation'] & ~combined_other_masks
    
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
    
    # Process obstacles
    if len(sorted_masks) > 1:
        total_obstacle_area_pixels = 0
        
        for i, mask_data in enumerate(sorted_masks[1:], 1):
            obstacle_mask = mask_data['segmentation']
            obstacle_polygons = mask_to_polygon(obstacle_mask)
            
            for j, polygon in enumerate(obstacle_polygons):
                area_pixels = calculate_polygon_area(polygon)
                area_m2 = area_pixels * (scale_meters_per_pixel ** 2)
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
    scale_meters_per_pixel: float = Form(...)
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
        
        # Process image using the same workflow as notebook
        result = process_image_workflow(image_array, center_lat, center_lng, scale_meters_per_pixel)
        
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

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Roof Segmentation API",
        "description": "Upload an image with georeferencing info to get usable roof areas and obstacles",
        "endpoints": {
            "POST /analyze_roof": "Main analysis endpoint",
            "GET /health": "Health check",
            "GET /docs": "Interactive API documentation"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8889)

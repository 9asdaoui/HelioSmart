# Roof Detection API Documentation

## Overview
This FastAPI service provides roof detection and obstacle segmentation capabilities using the Segment Anything Model (SAM). It accepts aerial images with georeferencing information and returns polygons for usable roof areas and obstacles in both pixel coordinates and geographic coordinates.

## Features
- **Automatic roof detection** using SAM model
- **Obstacle identification** (chimneys, vents, etc.)
- **Georeferenced output** with real-world coordinates
- **Area calculations** in both pixels and square meters
- **JSON API responses** for easy integration

## API Endpoints

### POST /analyze_roof
Main endpoint for roof analysis.

**Request Parameters:**
- `image` (file): Image file to analyze (JPEG, PNG, etc.)
- `center_lat` (float): Latitude coordinate of image center
- `center_lng` (float): Longitude coordinate of image center
- `scale_meters_per_pixel` (float): Scale factor for converting pixels to meters

**Response:**
```json
{
  "image_info": {
    "dimensions": {
      "width": 1024,
      "height": 768
    }
  },
  "georeferencing": {
    "center_lat": 33.5731,
    "center_lng": -7.5898,
    "scale_meters_per_pixel": 0.1
  },
  "usable_roof_area": [
    {
      "id": "roof_area_1",
      "polygon": [[x1, y1], [x2, y2], ...],
      "area_pixels": 150000,
      "area_m2": 1500.0,
      "coordinates": [[lng1, lat1], [lng2, lat2], ...]
    }
  ],
  "obstacles": [
    {
      "id": "obstacle_1",
      "polygon": [[x1, y1], [x2, y2], ...],
      "area_pixels": 500,
      "area_m2": 5.0,
      "coordinates": [[lng1, lat1], [lng2, lat2], ...],
      "predicted_iou": 0.95,
      "stability_score": 0.92,
      "type": "unknown"
    }
  ],
  "total_usable_area_pixels": 150000,
  "total_obstacle_area_pixels": 500,
  "total_usable_area_m2": 1500.0,
  "total_obstacle_area_m2": 5.0,
  "usable_area_percentage": 99.7,
  "obstacle_area_percentage": 0.3
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

### GET /
Root endpoint with API information.

## Usage Examples

### Python with requests
```python
import requests

# Prepare the request
url = "http://localhost:8000/analyze_roof"
files = {'image': ('roof.jpg', open('roof.jpg', 'rb'), 'image/jpeg')}
data = {
    'center_lat': 33.5731,
    'center_lng': -7.5898,
    'scale_meters_per_pixel': 0.1
}

# Send request
response = requests.post(url, files=files, data=data)
result = response.json()

# Process results
for area in result['usable_roof_area']:
    print(f"Usable area: {area['area_m2']:.2f} m²")

for obstacle in result['obstacles']:
    print(f"Obstacle: {obstacle['area_m2']:.2f} m²")
```

### cURL
```bash
curl -X POST "http://localhost:8000/analyze_roof" \\
  -F "image=@roof.jpg" \\
  -F "center_lat=33.5731" \\
  -F "center_lng=-7.5898" \\
  -F "scale_meters_per_pixel=0.1"
```

### JavaScript (with fetch)
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('center_lat', '33.5731');
formData.append('center_lng', '-7.5898');
formData.append('scale_meters_per_pixel', '0.1');

fetch('http://localhost:8000/analyze_roof', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Roof analysis results:', data);
});
```

## Installation and Setup

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Download SAM model:**
Ensure `sam_vit_h_4b8939.pth` is in the project directory.

3. **Start the service:**
```bash
python api_service.py
```

The service will be available at `http://localhost:8000`.

## Interactive Documentation
FastAPI automatically generates interactive documentation:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## Algorithm Workflow

The API follows the same workflow as the original Jupyter notebook:

1. **Image preprocessing** with Gaussian blur and Canny edge detection
2. **Initial segmentation** using SAM with the entire image as bounding box
3. **Mask refinement** to create a cleaned cut-out of the roof area
4. **Automatic mask generation** to identify individual roof segments and obstacles
5. **Polygon extraction** from binary masks
6. **Georeferencing** to convert pixel coordinates to real-world coordinates
7. **Area calculation** in both pixels and square meters

## Error Handling

The API includes comprehensive error handling:
- **400 Bad Request:** Invalid file type or missing parameters
- **500 Internal Server Error:** Processing errors with detailed error messages

## Performance Considerations

- **GPU acceleration:** Uses CUDA if available, falls back to CPU
- **Model loading:** SAM model is loaded once at startup for efficiency
- **Memory usage:** Large images may require significant memory

## Limitations

- **Accuracy depends on image quality** and roof visibility
- **Scale factor accuracy** affects real-world measurements
- **Obstacle classification** is currently generic (type: "unknown")
- **Simplified coordinate conversion** (suitable for small areas)

For production use, consider implementing:
- More sophisticated coordinate transformation
- Obstacle type classification
- Image size optimization
- Batch processing capabilities
- Authentication and rate limiting

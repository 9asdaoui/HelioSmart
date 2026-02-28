# Roof Segmentation API - Python Service

FastAPI service for roof segmentation using Meta's Segment Anything Model (SAM).

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Download SAM Model

The service requires the SAM ViT-H model checkpoint file (~2.4 GB).

**Option A: Direct Download**
```bash
wget https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth
```

**Option B: Using curl**
```bash
curl -L -o sam_vit_h_4b8939.pth https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth
```

**Option C: Windows PowerShell**
```powershell
Invoke-WebRequest -Uri https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth -OutFile sam_vit_h_4b8939.pth
```

Place the downloaded file in the `py_service/` directory.

### 3. Run the Service

```bash
python api_service.py
```

Or with Uvicorn directly:
```bash
uvicorn api_service:app --host 0.0.0.0 --port 8889 --reload
```

## 📊 Model Options

If you have limited GPU memory, consider using a smaller model:

| Model | Size | Memory Required | Download URL |
|-------|------|-----------------|--------------|
| **ViT-H** (default) | 2.4 GB | ~6 GB GPU | [Download](https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth) |
| **ViT-L** | 1.2 GB | ~4 GB GPU | [Download](https://dl.fbaipublicfiles.com/segment_anything/sam_vit_l_0b3195.pth) |
| **ViT-B** | 375 MB | ~2 GB GPU | [Download](https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth) |

To use a different model, update these lines in `api_service.py`:
```python
SAM_CHECKPOINT = "sam_vit_b_01ec64.pth"  # Change filename
MODEL_TYPE = "vit_b"                      # Change model type
```

## 🔍 API Endpoints

### Health Check
```bash
GET http://localhost:8889/health
```

Response:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_error": null,
  "device": "cuda",
  "mode": "production",
  "gpu_info": {
    "name": "NVIDIA GeForce RTX 3080",
    "memory_gb": 10.0
  },
  "model_info": {
    "checkpoint": "sam_vit_h_4b8939.pth",
    "type": "vit_h",
    "file_size_gb": 2.4
  }
}
```

### Model Information
```bash
GET http://localhost:8889/model/info
```

### Analyze Roof
```bash
POST http://localhost:8889/analyze_roof
Content-Type: multipart/form-data

Parameters:
- image: <file>
- center_lat: <float>
- center_lng: <float>
- scale_meters_per_pixel: <float>
```

## ⚠️ Fallback Mode

If the SAM model file is not found, the service will:
- ✅ **Still start successfully**
- ⚠️ **Run in FALLBACK mode**
- 📦 Return placeholder/approximated data
- 💡 Provide download instructions via `/model/info`

This allows the rest of the HelioSmart system to continue functioning while you download the model.

## 🛠️ Troubleshooting

### Model file not found
```
❌ SAM model file not found: sam_vit_h_4b8939.pth

📥 To download the model:
1. Download from: https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth
2. Place it in: /path/to/py_service/
3. Or run: wget https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth

⚠️  Service will run in FALLBACK mode (placeholder data only)
```

**Solution:** Download the model file using one of the commands above.

### Model file corrupt or incomplete
```
⚠️  Model file seems too small (0.5 GB). Expected ~2.4 GB.
File may be corrupted or incomplete. Please re-download.
```

**Solution:** Delete the file and re-download completely.

### Out of GPU memory
```
⚠️  Warning: GPU has only 4.0 GB memory. SAM ViT-H requires ~6GB.
💡 Consider using ViT-B model for lower memory usage.
```

**Solution:** 
1. Download ViT-B model instead (375 MB, requires ~2GB GPU)
2. Or force CPU mode: `CUDA_VISIBLE_DEVICES='' python api_service.py`

### Python package missing
```
ModuleNotFoundError: No module named 'segment_anything'
```

**Solution:** 
```bash
pip install git+https://github.com/facebookresearch/segment-anything.git
```

Or add to `requirements.txt`:
```
segment-anything @ git+https://github.com/facebookresearch/segment-anything.git
```

## 🐳 Docker Support

The service is designed to work standalone or within Docker. If running in Docker, ensure the model file is mounted or downloaded into the container.

Example Dockerfile addition:
```dockerfile
# Download SAM model during build
RUN wget https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth -O /app/sam_vit_h_4b8939.pth
```

## 📝 API Documentation

Interactive API documentation available at:
- Swagger UI: http://localhost:8889/docs
- ReDoc: http://localhost:8889/redoc

## 🔗 Integration with HelioSmart

This service is called by:
- `HelioSmart/backend/app/services/placeholder_apis.py`
- Method: `UsableAreaDetectionService.detect()`
- Method: `PanelPlacementService.place_panels()`

When the Python service is running with SAM model loaded, these will return real segmentation data instead of placeholders.

## 📊 Performance Notes

**GPU (CUDA) - Recommended:**
- Processing time: ~2-5 seconds per image
- Memory: 6-8 GB GPU RAM
- Device: NVIDIA GPU with CUDA support

**CPU Mode:**
- Processing time: ~30-60 seconds per image  
- Memory: 8-16 GB system RAM
- Device: Any modern CPU

## 🙏 Credits

- **Segment Anything Model (SAM)**: Meta AI Research
- **Repository**: https://github.com/facebookresearch/segment-anything
- **Paper**: https://arxiv.org/abs/2304.02643

## 📄 License

This service uses the SAM model which is licensed under Apache 2.0 by Meta Platforms, Inc.

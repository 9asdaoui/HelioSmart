# Image Enhancement Features for Roof Detection

## Overview
I've added advanced image enhancement capabilities to improve SAM's roof edge detection performance. The system now includes multiple enhancement modes optimized for different types of aerial roof images.

## Enhancement Modes

### 1. Basic Mode (`enhancement_mode="basic"`)
This is the original simple enhancement:
- Gaussian blur for noise reduction
- Single-scale Canny edge detection
- Simple edge overlay

### 2. Advanced Mode (`enhancement_mode="advanced"`) - **Default**
Enhanced preprocessing with multiple techniques:
- **CLAHE (Contrast Limited Adaptive Histogram Equalization)**: Improves local contrast
- **Bilateral Filtering**: Reduces noise while preserving edges
- **Morphological Operations**: Enhances roof structures
- **Multi-scale Edge Detection**: Combines different Canny thresholds
- **HSV Color Enhancement**: Boosts saturation for better material distinction
- **Sharpening Filter**: Enhances edge definition

### 3. Aggressive Mode (`enhancement_mode="aggressive"`)
Maximum enhancement for challenging images:
- **Strong CLAHE**: More aggressive contrast enhancement
- **Multiple Noise Reduction Passes**: Bilateral + Gaussian filtering
- **Larger Morphological Kernels**: Better structure enhancement
- **Triple-scale Edge Detection**: Three different Canny thresholds
- **LAB Color Space Enhancement**: Better color distinction
- **Strong HSV Boost**: Increased saturation and brightness
- **Multi-layer Blending**: Combines multiple enhancement techniques
- **Strong Sharpening**: More aggressive edge enhancement

## Technical Benefits

### Better Edge Detection
- **Multi-scale Canny**: Captures both fine and coarse edges
- **Morphological Operations**: Closes gaps in roof outlines
- **Edge Dilation**: Makes edges more prominent for SAM

### Improved Contrast
- **CLAHE**: Enhances local contrast without over-brightening
- **Histogram Equalization**: Better dynamic range utilization

### Color Enhancement
- **HSV Saturation Boost**: Better roof material distinction
- **LAB Color Space**: Improved color separation
- **Multi-channel Enhancement**: Works on different color aspects

### Noise Reduction
- **Bilateral Filter**: Preserves edges while reducing noise
- **Gaussian Smoothing**: Additional noise reduction
- **Morphological Closing**: Removes small noise artifacts

## Usage in API

```python
# Basic enhancement
POST /analyze_roof
{
    "image": file,
    "center_lat": 33.5731,
    "center_lng": -7.5898,
    "scale_meters_per_pixel": 0.1,
    "enhancement_mode": "basic" 
}

# Advanced enhancement (default)
POST /analyze_roof
{
    "image": file,
    "center_lat": 33.5731,
    "center_lng": -7.5898,
    "scale_meters_per_pixel": 0.1,
    "enhancement_mode": "advanced"
}

# Aggressive enhancement
POST /analyze_roof
{
    "image": file,
    "center_lat": 33.5731,
    "center_lng": -7.5898,
    "scale_meters_per_pixel": 0.1,
    "enhancement_mode": "aggressive"
}
```

## When to Use Each Mode

### Basic Mode
- High-quality aerial images with good contrast
- Images with clear roof boundaries
- When processing speed is prioritized

### Advanced Mode (Recommended)
- Most typical aerial roof images
- Balanced enhancement for good results
- Default choice for general use

### Aggressive Mode
- Poor quality or low-contrast images
- Images with unclear roof boundaries
- Challenging lighting conditions
- Images with significant noise or blur

## Technical Implementation

The enhancement pipeline is implemented in the `enhance_image_for_roof_detection()` function which:

1. Analyzes the input image
2. Applies the selected enhancement mode
3. Returns the optimized image for SAM processing

Each mode uses a carefully tuned combination of OpenCV operations optimized for aerial roof detection scenarios.

## Performance Impact

- **Basic**: Fastest processing
- **Advanced**: Moderate processing time, best balance
- **Aggressive**: Slower processing, maximum quality

The enhanced preprocessing significantly improves SAM's ability to detect:
- Roof edges and boundaries
- Different roof materials and textures
- Obstacles and structures on roofs
- Complex roof geometries

## Future Enhancements

Potential additions:
- Adaptive enhancement based on image analysis
- Machine learning-based enhancement selection
- Custom enhancement parameters
- Real-time enhancement preview

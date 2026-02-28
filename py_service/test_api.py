"""
Test script for the Roof Detection API
This script demonstrates how to use the FastAPI service to analyze roof images.
"""

import requests
import json
import os
from pathlib import Path
import numpy as np
import cv2
import matplotlib.pyplot as plt
from PIL import Image
import io

def visualize_results(image_path, result_data):
    """Visualize the roof analysis results with masks applied to the original image"""
    
    # Load the original image
    original_image = cv2.imread(str(image_path))
    if original_image is None:
        print(f"Error: Could not load image {image_path}")
        return
    
    # Convert BGR to RGB for matplotlib
    original_image_rgb = cv2.cvtColor(original_image, cv2.COLOR_BGR2RGB)
    
    # Create figure with subplots
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    fig.suptitle('Roof Detection Results', fontsize=16)
    
    # 1. Original image
    axes[0, 0].imshow(original_image_rgb)
    axes[0, 0].set_title('Original Image')
    axes[0, 0].axis('off')
    
    # 2. Usable roof areas
    roof_image = original_image_rgb.copy()
    if result_data['usable_roof_area']:
        for i, area in enumerate(result_data['usable_roof_area']):
            polygon = np.array(area['polygon'], dtype=np.int32)
            # Create a colored mask for this area
            mask = np.zeros(roof_image.shape[:2], dtype=np.uint8)
            cv2.fillPoly(mask, [polygon], 255)
            
            # Apply green overlay for usable areas
            color = [0, 255, 0]  # Green
            for c in range(3):
                roof_image[:, :, c] = np.where(mask == 255, 
                                             roof_image[:, :, c] * 0.7 + color[c] * 0.3, 
                                             roof_image[:, :, c])
            
            # Draw polygon outline
            cv2.polylines(roof_image, [polygon], True, (0, 255, 0), 2)
            
            # Add area label
            centroid = np.mean(polygon, axis=0).astype(int)
            cv2.putText(roof_image, f'R{i+1}', tuple(centroid), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    axes[0, 1].imshow(roof_image)
    axes[0, 1].set_title(f'Usable Roof Areas ({len(result_data["usable_roof_area"])} areas)')
    axes[0, 1].axis('off')
    
    # 3. Obstacles
    obstacle_image = original_image_rgb.copy()
    if result_data['obstacles']:
        for i, obstacle in enumerate(result_data['obstacles']):
            polygon = np.array(obstacle['polygon'], dtype=np.int32)
            # Create a colored mask for this obstacle
            mask = np.zeros(obstacle_image.shape[:2], dtype=np.uint8)
            cv2.fillPoly(mask, [polygon], 255)
            
            # Apply red overlay for obstacles
            color = [255, 0, 0]  # Red
            for c in range(3):
                obstacle_image[:, :, c] = np.where(mask == 255, 
                                                 obstacle_image[:, :, c] * 0.7 + color[c] * 0.3, 
                                                 obstacle_image[:, :, c])
            
            # Draw polygon outline
            cv2.polylines(obstacle_image, [polygon], True, (255, 0, 0), 2)
            
            # Add obstacle label
            centroid = np.mean(polygon, axis=0).astype(int)
            cv2.putText(obstacle_image, f'O{i+1}', tuple(centroid), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    axes[1, 0].imshow(obstacle_image)
    axes[1, 0].set_title(f'Obstacles ({len(result_data["obstacles"])} obstacles)')
    axes[1, 0].axis('off')
    
    # 4. Combined view
    combined_image = original_image_rgb.copy()
    
    # Apply usable areas (green)
    if result_data['usable_roof_area']:
        for i, area in enumerate(result_data['usable_roof_area']):
            polygon = np.array(area['polygon'], dtype=np.int32)
            mask = np.zeros(combined_image.shape[:2], dtype=np.uint8)
            cv2.fillPoly(mask, [polygon], 255)
            
            color = [0, 255, 0]  # Green
            for c in range(3):
                combined_image[:, :, c] = np.where(mask == 255, 
                                                 combined_image[:, :, c] * 0.8 + color[c] * 0.2, 
                                                 combined_image[:, :, c])
            cv2.polylines(combined_image, [polygon], True, (0, 255, 0), 2)
            
            # Add area text
            centroid = np.mean(polygon, axis=0).astype(int)
            cv2.putText(combined_image, f'R{i+1}', tuple(centroid), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    
    # Apply obstacles (red)
    if result_data['obstacles']:
        for i, obstacle in enumerate(result_data['obstacles']):
            polygon = np.array(obstacle['polygon'], dtype=np.int32)
            mask = np.zeros(combined_image.shape[:2], dtype=np.uint8)
            cv2.fillPoly(mask, [polygon], 255)
            
            color = [255, 0, 0]  # Red
            for c in range(3):
                combined_image[:, :, c] = np.where(mask == 255, 
                                                 combined_image[:, :, c] * 0.8 + color[c] * 0.2, 
                                                 combined_image[:, :, c])
            cv2.polylines(combined_image, [polygon], True, (255, 0, 0), 2)
            
            # Add obstacle text
            centroid = np.mean(polygon, axis=0).astype(int)
            cv2.putText(combined_image, f'O{i+1}', tuple(centroid), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    
    axes[1, 1].imshow(combined_image)
    axes[1, 1].set_title('Combined View (Green=Usable, Red=Obstacles)')
    axes[1, 1].axis('off')
    
    # Add summary text
    summary_text = f"""Summary:
• Usable areas: {len(result_data['usable_roof_area'])} ({result_data.get('usable_area_percentage', 0):.1f}%)
• Obstacles: {len(result_data['obstacles'])} ({result_data.get('obstacle_area_percentage', 0):.1f}%)
• Total usable: {result_data.get('total_usable_area_m2', 0):.2f} m²
• Total obstacles: {result_data.get('total_obstacle_area_m2', 0):.2f} m²"""
    
    plt.figtext(0.02, 0.02, summary_text, fontsize=10, verticalalignment='bottom')
    
    plt.tight_layout()
    plt.subplots_adjust(bottom=0.15)
    plt.show()
    
    # Save the combined result
    output_path = "roof_analysis_visualization.png"
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"Visualization saved to: {output_path}")

def create_detailed_mask_visualization(image_path, result_data):
    """Create a detailed visualization with individual masks for each detected area"""
    
    # Load the original image
    original_image = cv2.imread(str(image_path))
    if original_image is None:
        print(f"Error: Could not load image {image_path}")
        return
    
    # Convert BGR to RGB for matplotlib
    original_image_rgb = cv2.cvtColor(original_image, cv2.COLOR_BGR2RGB)
    
    # Calculate number of subplots needed
    total_areas = len(result_data['usable_roof_area']) + len(result_data['obstacles'])
    
    if total_areas == 0:
        print("No areas or obstacles detected for detailed visualization")
        return
    
    cols = min(3, total_areas + 1)  # +1 for original image
    rows = (total_areas + cols) // cols
    
    fig, axes = plt.subplots(rows, cols, figsize=(5*cols, 4*rows))
    if rows == 1:
        axes = [axes] if cols == 1 else axes
    else:
        axes = axes.flatten()
    
    fig.suptitle('Detailed Mask Analysis', fontsize=16)
    
    # Original image
    axes[0].imshow(original_image_rgb)
    axes[0].set_title('Original Image')
    axes[0].axis('off')
    
    plot_idx = 1
    
    # Individual usable areas
    for i, area in enumerate(result_data['usable_roof_area']):
        if plot_idx < len(axes):
            area_image = original_image_rgb.copy()
            polygon = np.array(area['polygon'], dtype=np.int32)
            
            # Create mask
            mask = np.zeros(area_image.shape[:2], dtype=np.uint8)
            cv2.fillPoly(mask, [polygon], 255)
            
            # Apply green overlay
            color = [0, 255, 0]
            for c in range(3):
                area_image[:, :, c] = np.where(mask == 255, 
                                             area_image[:, :, c] * 0.6 + color[c] * 0.4, 
                                             area_image[:, :, c])
            
            cv2.polylines(area_image, [polygon], True, (0, 255, 0), 3)
            
            axes[plot_idx].imshow(area_image)
            axes[plot_idx].set_title(f'Usable Area {i+1}\\n{area["area_m2"]:.2f} m²')
            axes[plot_idx].axis('off')
            plot_idx += 1
    
    # Individual obstacles
    for i, obstacle in enumerate(result_data['obstacles']):
        if plot_idx < len(axes):
            obstacle_image = original_image_rgb.copy()
            polygon = np.array(obstacle['polygon'], dtype=np.int32)
            
            # Create mask
            mask = np.zeros(obstacle_image.shape[:2], dtype=np.uint8)
            cv2.fillPoly(mask, [polygon], 255)
            
            # Apply red overlay
            color = [255, 0, 0]
            for c in range(3):
                obstacle_image[:, :, c] = np.where(mask == 255, 
                                                 obstacle_image[:, :, c] * 0.6 + color[c] * 0.4, 
                                                 obstacle_image[:, :, c])
            
            cv2.polylines(obstacle_image, [polygon], True, (255, 0, 0), 3)
            
            axes[plot_idx].imshow(obstacle_image)
            axes[plot_idx].set_title(f'Obstacle {i+1}\\n{obstacle["area_m2"]:.2f} m²\\nIoU: {obstacle["predicted_iou"]:.3f}')
            axes[plot_idx].axis('off')
            plot_idx += 1
    
    # Hide unused subplots
    for idx in range(plot_idx, len(axes)):
        axes[idx].axis('off')
    
    plt.tight_layout()
    plt.show()
    
    # Save detailed visualization
    output_path = "detailed_mask_visualization.png"
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"Detailed visualization saved to: {output_path}")

def test_roof_analysis_api():
    """Test the roof analysis API with a sample image"""
    
    # API endpoint
    url = "http://localhost:8890/analyze_roof"
    
    # Test image path (using one of the images in the images folder)
    image_path = Path("images/roof_1_1751622744.png")
    
    if not image_path.exists():
        print(f"Error: Test image not found at {image_path}")
        return
    
    # Sample georeferencing data (example values - adjust as needed)
    geo_data = {
        "center_lat": 33.5731,      # Example latitude (Miami, FL)
        "center_lng": -7.5898,      # Example longitude (Casablanca, Morocco)
        "scale_meters_per_pixel": 0.1  # Example scale (10 cm per pixel)
    }
    
    try:
        # Prepare the request
        with open(image_path, 'rb') as image_file:
            files = {
                'image': ('test_image.jpg', image_file, 'image/jpeg')
            }
            
            data = {
                'center_lat': geo_data['center_lat'],
                'center_lng': geo_data['center_lng'],
                'scale_meters_per_pixel': geo_data['scale_meters_per_pixel'],
                'enhancement_mode': 'advanced'  # Try the new enhancement mode
            }
            
            print("Sending request to API...")
            print(f"Image: {image_path}")
            print(f"Georeferencing: {geo_data}")
            print("Processing... (this may take a moment)")
            
            # Send request to API
            response = requests.post(url, files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                
                print("\\n" + "="*50)
                print("API RESPONSE - ROOF ANALYSIS RESULTS")
                print("="*50)
                
                # Display image info
                print(f"Image dimensions: {result['image_info']['dimensions']['width']}x{result['image_info']['dimensions']['height']}")
                
                # Display georeferencing info
                print(f"\\nGeoreferencing:")
                print(f"  Center: ({result['georeferencing']['center_lat']:.6f}, {result['georeferencing']['center_lng']:.6f})")
                print(f"  Scale: {result['georeferencing']['scale_meters_per_pixel']} m/pixel")
                
                # Display usable roof areas
                print(f"\\nUsable Roof Areas: {len(result['usable_roof_area'])}")
                for i, area in enumerate(result['usable_roof_area']):
                    print(f"  Area {i+1}: {area['area_m2']:.2f} m² ({area['area_pixels']:.0f} pixels)")
                    print(f"    Polygon points: {len(area['polygon'])} vertices")
                    print(f"    Geo-coordinates: {len(area['coordinates'])} points")
                
                # Display obstacles
                print(f"\\nObstacles Detected: {len(result['obstacles'])}")
                for i, obstacle in enumerate(result['obstacles']):
                    print(f"  Obstacle {i+1}: {obstacle['area_m2']:.2f} m² ({obstacle['area_pixels']:.0f} pixels)")
                    print(f"    Type: {obstacle['type']}")
                    print(f"    Confidence: IoU={obstacle['predicted_iou']:.3f}, Stability={obstacle['stability_score']:.3f}")
                
                # Display summary
                print(f"\\nSummary:")
                print(f"  Total usable area: {result['total_usable_area_m2']:.2f} m²")
                print(f"  Total obstacle area: {result['total_obstacle_area_m2']:.2f} m²")
                print(f"  Usable percentage: {result['summary']['usable_area_percentage']:.1f}%")
                print(f"  Obstacle percentage: {result['summary']['obstacle_area_percentage']:.1f}%")
                
                # Save result to file
                output_file = "api_test_result.json"
                with open(output_file, 'w') as f:
                    json.dump(result, f, indent=2)
                print(f"\\nFull results saved to: {output_file}")
                
                # Visualize results with masks
                print("\\n" + "="*50)
                print("VISUALIZING RESULTS")
                print("="*50)
                visualize_results(image_path, result)
                create_detailed_mask_visualization(image_path, result)
                
            else:
                print(f"Error: API returned status code {response.status_code}")
                print(f"Response: {response.text}")
                
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to API. Make sure the service is running on http://localhost:8890")
    except Exception as e:
        print(f"Error: {str(e)}")

def test_health_check():
    """Test the health check endpoint"""
    try:
        response = requests.get("http://localhost:8890/health")
        if response.status_code == 200:
            result = response.json()
            print("Health Check:")
            print(f"  Status: {result['status']}")
            print(f"  Model loaded: {result['model_loaded']}")
        else:
            print(f"Health check failed: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to API")

if __name__ == "__main__":
    print("Roof Detection API Test")
    print("======================")
    
    # Test health check first
    test_health_check()
    print()
    
    # Test roof analysis
    test_roof_analysis_api()

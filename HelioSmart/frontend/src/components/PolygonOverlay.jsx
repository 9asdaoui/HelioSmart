import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'

/**
 * PolygonOverlay Component
 * Displays SAM service polygon detection results and panel placements
 * Shows captured satellite image with polygon overlays drawn on canvas
 */
export default function PolygonOverlay({ visualization, capturedImage, onApprove, onReject, panelPositions }) {
  const canvasRef = useRef(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showPanels, setShowPanels] = useState(true)

  // Draw polygons and panels on the captured image
  useEffect(() => {
    if (!canvasRef.current || !capturedImage) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = img.width
      canvas.height = img.height

      // Draw the captured image
      ctx.drawImage(img, 0, 0)

      // Draw usable polygon (green) if available
      if (visualization?.usable_polygon && visualization.usable_polygon.length > 0) {
        ctx.beginPath()
        ctx.strokeStyle = '#22c55e'
        ctx.lineWidth = 3
        ctx.fillStyle = 'rgba(34, 197, 94, 0.3)'

        const polygon = visualization.usable_polygon
        if (polygon.length > 0) {
          ctx.moveTo(polygon[0][0], polygon[0][1])
          for (let i = 1; i < polygon.length; i++) {
            ctx.lineTo(polygon[i][0], polygon[i][1])
          }
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }
      }

      // Draw roof polygon (blue) if different from usable
      if (visualization?.roof_polygon && visualization.roof_polygon.length > 0) {
        const roofPoly = visualization.roof_polygon
        const usablePoly = visualization.usable_polygon

        // Only draw if different from usable polygon
        if (JSON.stringify(roofPoly) !== JSON.stringify(usablePoly)) {
          ctx.beginPath()
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'

          ctx.moveTo(roofPoly[0][0], roofPoly[0][1])
          for (let i = 1; i < roofPoly.length; i++) {
            ctx.lineTo(roofPoly[i][0], roofPoly[i][1])
          }
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // Draw obstacles (red) if available
      if (visualization?.obstacles && visualization.obstacles.length > 0) {
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'

        visualization.obstacles.forEach(obstacle => {
          if (obstacle && obstacle.length > 0) {
            ctx.beginPath()
            ctx.moveTo(obstacle[0][0], obstacle[0][1])
            for (let i = 1; i < obstacle.length; i++) {
              ctx.lineTo(obstacle[i][0], obstacle[i][1])
            }
            ctx.closePath()
            ctx.fill()
            ctx.stroke()
          }
        })
      }

      // Draw panel placements (yellow/orange) if available and enabled
      if (showPanels && panelPositions && panelPositions.length > 0) {
        ctx.strokeStyle = '#f97316'  // Orange
        ctx.lineWidth = 1.5
        ctx.fillStyle = 'rgba(251, 191, 36, 0.6)'  // Yellow with transparency

        panelPositions.forEach((panel, index) => {
          if (panel.corners && panel.corners.length >= 4) {
            ctx.beginPath()
            ctx.moveTo(panel.corners[0][0], panel.corners[0][1])
            for (let i = 1; i < panel.corners.length; i++) {
              ctx.lineTo(panel.corners[i][0], panel.corners[i][1])
            }
            ctx.closePath()
            ctx.fill()
            ctx.stroke()

            // Optionally draw panel number
            if (panel.center_x && panel.center_y) {
              ctx.fillStyle = '#1f2937'  // Dark gray text
              ctx.font = 'bold 10px Arial'
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(String(panel.id || index + 1), panel.center_x, panel.center_y)
              ctx.fillStyle = 'rgba(251, 191, 36, 0.6)'  // Reset fill color
            }
          }
        })
      }

      setImageLoaded(true)
    }

    img.src = capturedImage
  }, [capturedImage, visualization, panelPositions, showPanels])

  if (!visualization) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No visualization data available</p>
      </div>
    )
  }

  const { usable_area_m2, obstacles, center_lat, center_lng, scale_meters_per_pixel } = visualization

  // Format area value
  const formatArea = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'Calculating...'
    }
    return `${Number(value).toFixed(1)} m²`
  }

  return (
    <div className="space-y-4">
      {/* Captured Image with Polygon Overlays */}
      <div className="relative">
        <div className="rounded-lg shadow-lg border-2 border-gray-300 overflow-hidden bg-gray-100">
          {capturedImage ? (
            <canvas
              ref={canvasRef}
              className="w-full h-auto"
              style={{ maxHeight: '400px', objectFit: 'contain' }}
            />
          ) : (
            <div className="w-full h-80 flex items-center justify-center">
              <p className="text-gray-500">No captured image available</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-white/95 p-3 rounded-lg shadow-lg">
          <h4 className="font-semibold text-sm mb-2">Legend</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 opacity-30 border-2 border-blue-500 rounded"></div>
              <span>Detected Roof</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 opacity-30 border-2 border-green-500 rounded"></div>
              <span>Usable Area</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 opacity-40 border-2 border-red-500 rounded"></div>
              <span>Obstacles</span>
            </div>
            {panelPositions && panelPositions.length > 0 && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showPanels"
                  checked={showPanels}
                  onChange={(e) => setShowPanels(e.target.checked)}
                  className="rounded"
                />
                <div className="w-4 h-4 bg-yellow-400 opacity-60 border-2 border-orange-500 rounded"></div>
                <label htmlFor="showPanels" className="cursor-pointer">
                  Panels ({panelPositions.length})
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Area and Panel Information */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600 font-semibold">Usable Area</p>
          <p className="text-2xl font-bold text-blue-700">
            {formatArea(usable_area_m2)}
          </p>
        </div>

        {panelPositions && panelPositions.length > 0 ? (
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-600 font-semibold">Panels Placed</p>
            <p className="text-2xl font-bold text-orange-700">
              {panelPositions.length}
            </p>
          </div>
        ) : (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 font-semibold">Usable for Panels</p>
            <p className="text-2xl font-bold text-green-700">
              {formatArea(usable_area_m2 ? usable_area_m2 * 0.8 : null)}
            </p>
            <p className="text-xs text-gray-500 mt-1">~80% of roof area</p>
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 font-semibold">Obstacles Detected</p>
          <p className="text-2xl font-bold text-gray-700">
            {obstacles?.length || 0}
          </p>
        </div>

        {visualization?.coverage_percentage && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 font-semibold">Coverage</p>
            <p className="text-2xl font-bold text-green-700">
              {visualization.coverage_percentage.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {/* Location Info */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <p className="font-semibold text-gray-800 mb-1">📍 Captured Location</p>
            <p>Latitude: {center_lat?.toFixed(6) || 'N/A'}</p>
            <p>Longitude: {center_lng?.toFixed(6) || 'N/A'}</p>
            {scale_meters_per_pixel && (
              <p>Scale: {scale_meters_per_pixel.toFixed(3)} m/pixel</p>
            )}
          </div>

          <div className="flex flex-col space-y-2">
            {onReject && (
              <button
                onClick={onReject}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                ← Retry Estimation
              </button>
            )}
            {onApprove && (
              <button
                onClick={onApprove}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold"
              >
                ✓ Approve & View Results
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

PolygonOverlay.propTypes = {
  visualization: PropTypes.shape({
    roof_polygon: PropTypes.array,
    usable_polygon: PropTypes.array,
    obstacles: PropTypes.array,
    usable_area_m2: PropTypes.number,
    scale_meters_per_pixel: PropTypes.number,
    center_lat: PropTypes.number,
    center_lng: PropTypes.number,
    sam_mode: PropTypes.oneOf(['production', 'fallback', 'placeholder']),
    sam_warning: PropTypes.string,
    coverage_percentage: PropTypes.number,
  }),
  capturedImage: PropTypes.string,
  onApprove: PropTypes.func,
  onReject: PropTypes.func,
  panelPositions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      center_x: PropTypes.number,
      center_y: PropTypes.number,
      corners: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
      row: PropTypes.number,
      column: PropTypes.number,
    })
  ),
}

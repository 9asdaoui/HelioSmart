import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { estimationsAPI, utilitiesAPI, marketplaceAPI } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import PolygonOverlay from '@/components/PolygonOverlay'
import html2canvas from 'html2canvas'
import { Sun, X, Zap, Building2, Home, Package2, Crosshair, ChevronLeft, ChevronRight, CheckCheck, MapPin, Cpu } from 'lucide-react'

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * Returns distance in meters
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

/**
 * Calculate ACTUAL meters per pixel from Google Maps bounds
 * This is the most accurate method - uses real map bounds, not formulas
 */
function calculateActualScale(map, mapDivWidth, html2canvasScale = 2) {
  if (!map) return null
  
  const bounds = map.getBounds()
  if (!bounds) return null
  
  const ne = bounds.getNorthEast()
  const sw = bounds.getSouthWest()
  
  // Calculate horizontal distance across the map in meters
  const horizontalMeters = haversineDistance(
    (ne.lat() + sw.lat()) / 2, sw.lng(),  // West point at center latitude
    (ne.lat() + sw.lat()) / 2, ne.lng()   // East point at center latitude
  )
  
  // Actual pixels in captured image (html2canvas doubles resolution)
  const actualPixelWidth = mapDivWidth * html2canvasScale
  
  return horizontalMeters / actualPixelWidth
}

export default function CreateEstimation() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [currentProfile, setCurrentProfile] = useState('balanced')
  const [selectedRoofType, setSelectedRoofType] = useState('')
  const [selectedRoofTilt, setSelectedRoofTilt] = useState('')
  const [selectedStories, setSelectedStories] = useState('')
  const [customStories, setCustomStories] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [selectedMaterialVendor, setSelectedMaterialVendor] = useState(null) // null = HelioSmart defaults
  const [placedPoints, setPlacedPoints] = useState([])
  const [obstaclePoints, setObstaclePoints] = useState([])
  const [annualUsage, setAnnualUsage] = useState(10000)
  const [annualCost, setAnnualCost] = useState(1200)
  const [visualizationData, setVisualizationData] = useState(null)
  const [estimationId, setEstimationId] = useState(null)
  const [sitePlanSnapshot, setSitePlanSnapshot] = useState(null)
  const [processingStep, setProcessingStep] = useState(0) // 0=upload, 1=SAM, 2=panels, 3=results
  const [errors, setErrors] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [capturedRoofImage, setCapturedRoofImage] = useState(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedZoomLevel, setCapturedZoomLevel] = useState(null) // Store zoom at capture time
  const [capturedScale, setCapturedScale] = useState(null) // Store actual m/pixel scale at capture time
  
  const mapRef = useRef(null)
  const captureBoxRef = useRef(null)
  const [map, setMap] = useState(null)
  const [geocoder, setGeocoder] = useState(null)
  const [mapCenter, setMapCenter] = useState({ lat: 34.0209, lng: -6.8417 }) // Default: Rabat
  const [isLocating, setIsLocating] = useState(false)
  
  // Fetch utilities from database
  const { data: utilitiesData, isLoading: utilitiesLoading } = useQuery({
    queryKey: ['utilities'],
    queryFn: () => utilitiesAPI.getAll()
  })

  const utilities = utilitiesData?.data || []

  // Fetch marketplace vendors for material provider selection
  const { data: vendorsData } = useQuery({
    queryKey: ['marketplace-vendors'],
    queryFn: () => marketplaceAPI.getVendors()
  })
  const materialVendors = vendorsData?.data || []

  const createMutation = useMutation({
    mutationFn: (data) => estimationsAPI.createProject(data),
    onSuccess: (response) => {
      console.log('Full API Response:', response)
      console.log('Response Data:', response.data)
      console.log('Visualization Data:', response.data.visualization)
      
      const estId = response.data.estimation_id || response.data.id
      setEstimationId(estId)
      
      // Check if visualization data is in response
      if (response.data.visualization) {
        console.log('Step 9 ACTIVATED - visualization data found')
        setVisualizationData(response.data.visualization)
        setCurrentStep(9) // Go to AI detection results step
      } else {
        console.log('No visualization data - redirecting to details page')
        // No visualization data, go directly to details
        navigate(`/estimations/${estId}`)
      }
    },
    onError: (error) => {
      console.error('Estimation creation failed:', error)
      setErrors({ submit: error.response?.data?.detail || error.message })
    }
  })
  
  // Advance fake processing steps every 30 s while step 7 is active
  useEffect(() => {
    if (currentStep !== 8) { setProcessingStep(0); return }
    setProcessingStep(0)
    const timers = [
      setTimeout(() => setProcessingStep(1), 30000),
      setTimeout(() => setProcessingStep(2), 60000),
      setTimeout(() => setProcessingStep(3), 90000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [currentStep])

  // Initialize Google Maps
  useEffect(() => {
    const initMap = () => {
      if (!window.google || !mapRef.current) return
      
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: mapCenter.lat === 34.0209 ? 15 : 20, // City overview on first load, rooftop zoom after search
        mapTypeId: 'satellite',
        tilt: 0,
        heading: 0,
        mapTypeControl: true,
        fullscreenControl: false,
        streetViewControl: false,
      })
      
      setMap(newMap)
      setGeocoder(new window.google.maps.Geocoder())
    }
    
    if (window.google) {
      initMap()
    } else {
      window.initMap = initMap
    }
  }, [])
  
  const searchLocation = async () => {
    if (!geocoder || !searchQuery.trim()) return
    
    try {
      const response = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: searchQuery }, (results, status) => {
          if (status === 'OK' && results[0]) resolve(results[0])
          else reject(status)
        })
      })
      
      const location = response.geometry.location
      map.setCenter(location)
      map.setZoom(20)  // Consistent with initial zoom
      setMapCenter({ lat: location.lat(), lng: location.lng() })
    } catch (error) {
      console.error('Search failed:', error)
      setErrors({ ...errors, location: 'Location not found. Please try a different search.' })
    }
  }
  
  const getUserGeolocation = () => {
    if (!navigator.geolocation) return
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMapCenter(latlng)
        if (map) {
          map.setCenter(latlng)
          map.setZoom(20)
        }
        setIsLocating(false)
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const captureCurrentLocation = async () => {
    if (!map || !geocoder || !mapRef.current) {
      setErrors({ ...errors, location: 'Map is not ready yet' })
      return
    }
    
    setIsCapturing(true)
    const center = map.getCenter()
    const location = { lat: center.lat(), lng: center.lng() }
    
    try {
      setErrors({ ...errors, location: null })
      
      // 1. Capture the satellite image from the map
      const mapElement = mapRef.current
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 2, // Higher quality
      })
      
      // 2. Calculate the capture box dimensions (40% width, 4:3 aspect ratio, centered)
      const mapWidth = canvas.width
      const mapHeight = canvas.height
      const boxWidth = mapWidth * 0.4
      const boxHeight = boxWidth * (3/4)
      const boxX = (mapWidth - boxWidth) / 2
      const boxY = (mapHeight - boxHeight) / 2
      
      // 3. Crop to the capture box area
      const croppedCanvas = document.createElement('canvas')
      croppedCanvas.width = boxWidth
      croppedCanvas.height = boxHeight
      const ctx = croppedCanvas.getContext('2d')
      ctx.drawImage(canvas, boxX, boxY, boxWidth, boxHeight, 0, 0, boxWidth, boxHeight)
      
      // 4. Convert to base64
      const imageBase64 = croppedCanvas.toDataURL('image/png')
      setCapturedRoofImage(imageBase64)
      
      // 5. Calculate ACTUAL scale using map bounds and the real pixel width of the captured image
      const currentZoom = map.getZoom()
      setCapturedZoomLevel(currentZoom)
      
      const bounds = map.getBounds()
      if (bounds) {
        const ne = bounds.getNorthEast()
        const sw = bounds.getSouthWest()
        const centerLat = (ne.lat() + sw.lat()) / 2
        
        // W_meters: real-world width of the FULL map (NW→NE)
        const fullMapMeters = haversineDistance(centerLat, sw.lng(), centerLat, ne.lng())
        
        // W_pixels of the FULL captured image (html2canvas scale:2 already doubles it — canvas.width === mapDivWidth * 2)
        const fullImagePixels = mapWidth  // canvas.width, already 2x the DOM width
        
        // The cropped box is 40% of the full image width both in pixels and in meters
        const captureBoxPixels = boxWidth   // boxWidth = mapWidth * 0.4
        const captureBoxMeters = fullMapMeters * 0.4
        
        // scale_meters_per_pixel = W_meters / W_pixels  (image-width-based, not screen-div-based)
        const actualScale = captureBoxMeters / captureBoxPixels
        setCapturedScale(actualScale)
        
        console.log(`📐 FINAL CALIBRATED SCALE: ${actualScale.toFixed(6)} m/px`)
        console.log(`   Map bounds span: ${fullMapMeters.toFixed(1)} m across ${fullImagePixels} px (full image)`)
        console.log(`   Capture box:     ${captureBoxMeters.toFixed(1)} m across ${captureBoxPixels} px`)
        console.log(`   Image covers:    ${(captureBoxPixels * actualScale).toFixed(1)} m × ${(boxHeight * actualScale).toFixed(1)} m`)
        console.log(`   Total image area: ${(captureBoxPixels * actualScale * boxHeight * actualScale).toFixed(0)} m²`)
      }
      
      console.log(`📸 Captured roof image at zoom ${currentZoom}`)
      
      // 6. Get address data via geocoding
      const response = await new Promise((resolve, reject) => {
        geocoder.geocode({ location }, (results, status) => {
          if (status === 'OK' && results[0]) resolve(results[0])
          else reject(status)
        })
      })
      
      const addressComponents = response.address_components
      const addressData = {
        latitude: location.lat,
        longitude: location.lng,
        address: response.formatted_address,
        street: '',
        city: '',
        state: '',
        zip_code: '',
        country: ''
      }
      
      addressComponents.forEach(component => {
        const types = component.types
        if (types.includes('street_number') || types.includes('route')) {
          addressData.street += component.long_name + ' '
        }
        if (types.includes('locality')) {
          addressData.city = component.long_name
        }
        if (types.includes('administrative_area_level_1')) {
          addressData.state = component.short_name
        }
        if (types.includes('postal_code')) {
          addressData.zip_code = component.long_name
        }
        if (types.includes('country')) {
          addressData.country = component.long_name
        }
      })
      
      setSelectedLocation(addressData)
      setErrors({ ...errors, location: null })
      setIsCapturing(false)
    } catch (error) {
      console.error('Capture error:', error)
      setErrors({ ...errors, location: 'Failed to capture roof image. Please try again.' })
      setIsCapturing(false)
    }
  }
  
  const addSolarPoint = (e) => {
    if (placedPoints.length >= 6) {
      setErrors({ ...errors, roofPoints: 'Maximum 6 points allowed' })
      return
    }
    
    const rect = e.target.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    setPlacedPoints([...placedPoints, { x, y }])
    setErrors({ ...errors, roofPoints: null })
  }
  
  const nextStep = (step) => {
    const newErrors = {}
    
    if (step === 1) {
      if (!selectedLocation) {
        newErrors.location = 'Please capture a location first'
      }
      if (!capturedRoofImage) {
        newErrors.location = 'Please capture your roof image by clicking the Capture Location button'
      }
    }
    
    if (step === 2) {
      if (!currentProfile) {
        newErrors.energyProfile = 'Please select an energy usage profile'
      }
    }
    
    if (step === 3) {
      if (!selectedProvider) {
        newErrors.provider = 'Please select an energy provider'
      }
    }
    
    if (step === 4) {
      if (!selectedRoofType) {
        newErrors.roofType = 'Please select a roof type'
      }
      if (selectedRoofType === 'tilted' && !selectedRoofTilt) {
        newErrors.roofTilt = 'Please select a roof tilt'
      }
      if (!selectedStories) {
        newErrors.stories = 'Please select number of stories'
      }
    }
    
    if (step === 6 && placedPoints.length < 1) {
      newErrors.roofPoints = 'Please mark at least 1 point on the roof area'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setErrors({})
    setCurrentStep(step + 1)
  }
  
  const prevStep = (step) => {
    setCurrentStep(step - 1)
  }
  
  const submitForm = async () => {
    if (!map) {
      setErrors({ submit: 'Map is not ready' })
      return
    }
    
    // Validate that we have a captured roof image
    if (!capturedRoofImage) {
      setErrors({ submit: 'Please capture your roof location first (Step 1)' })
      return
    }
    
    setErrors({})
    
    const formData = {
      // Location data
      latitude: selectedLocation?.latitude || 0,
      longitude: selectedLocation?.longitude || 0,
      street: selectedLocation?.street || '',
      city: selectedLocation?.city || '',
      state: selectedLocation?.state || '',
      zip_code: selectedLocation?.zip_code || '',
      country: selectedLocation?.country || '',
      search_query: selectedLocation?.address || '',
      
      // Satellite image from capture
      satellite_image: capturedRoofImage,
      // Use the ACTUAL scale derived from map bounds + real image pixel width at capture time
      scale_meters_per_pixel: (() => {
        if (capturedScale) {
          console.log(`📐 FINAL CALIBRATED SCALE: ${capturedScale.toFixed(6)} m/px (bounds-based, image-width corrected)`)
          return capturedScale
        }
        // Fallback: OSM tile-size formula — less accurate but never NaN
        const lat = selectedLocation?.latitude || mapCenter.lat
        const zoom = capturedZoomLevel || map?.getZoom() || 20
        // Full-image scale (html2canvas scale:2 doubles pixel count)
        const fullScale = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom) / 2
        // Capture box is 40% of the image, so scale is the same (pixels and meters both shrink equally)
        console.log(`⚠️ FALLBACK SCALE: ${fullScale.toFixed(6)} m/px (no captured bounds — re-capture recommended)`)
        return fullScale
      })(),
      zoom_level: capturedZoomLevel || map?.getZoom() || 20,
      
      // Roof points from Step 5 (used as SAM prompts)
      roof_points: placedPoints.map(p => ({ x: p.x, y: p.y })),
      
      // Energy usage
      monthly_bill: annualCost / 12,
      usage_pattern: currentProfile, // 'balanced', 'summer', 'winter'
      
      // Provider
      provider: selectedProvider?.id || 1, // utility_id

      // Material provider (optional vendor)
      vendor_id: selectedMaterialVendor?.id || null,
      
      // Property details
      roof_type: selectedRoofType,
      roof_tilt: selectedRoofTilt || '20',
      building_stories: selectedStories === 'custom' ? parseInt(customStories) : parseInt(selectedStories),
      
      // Coverage percentage
      coverage_percentage: 80.0,
    }
    
    createMutation.mutate(formData)
  }
  
  const energyProfiles = [
    { id: 'low', icon: '🌱', label: 'Low Usage', description: 'Small home, minimal appliances' },
    { id: 'balanced', icon: '🏠', label: 'Balanced', description: 'Average household consumption' },
    { id: 'high', icon: '⚡', label: 'High Usage', description: 'Large home, many appliances' }
  ]
  
  const roofTypes = [
    { id: 'flat', icon: '▬', name: 'Flat Roof', description: 'Minimal slope (0-10°)' },
    { id: 'tilted', icon: '◢', name: 'Tilted Roof', description: 'Angled roof surface' }
  ]
  
  const roofTiltOptions = [
    { value: '15', label: '15°' },
    { value: '25', label: '25°' },
    { value: '35', label: '35°' },
    { value: '45', label: '45°' }
  ]
  
  const storiesOptions = [
    { value: '1', label: '1 Story' },
    { value: '2', label: '2 Stories' },
    { value: '3', label: '3 Stories' },
    { value: 'custom', label: 'Custom' }
  ]
  

  const STEPS = [
    { num: 1, label: 'Location',   Icon: MapPin },
    { num: 2, label: 'Energy',     Icon: Zap },
    { num: 3, label: 'Provider',   Icon: Building2 },
    { num: 4, label: 'Property',   Icon: Home },
    { num: 5, label: 'Material',   Icon: Package2 },
    { num: 6, label: 'Roof Points',Icon: Crosshair },
    { num: 7, label: 'Review',     Icon: CheckCheck },
    { num: 8, label: 'Processing', Icon: Cpu },
    { num: 9, label: 'Results',    Icon: Sun },
  ]

  const slideDir = 'step-slide-right'

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col">

      {/*  Focus-mode top bar  */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">

          {/* Left  cancel */}
          <button onClick={() => navigate('/estimations')} className="flex items-center gap-2 text-gray-400 hover:text-gray-700 text-sm font-medium transition-colors group">
            <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
            Cancel
          </button>

          {/* Center  step dots */}
          <div className="hidden md:flex items-center gap-1.5">
            {STEPS.map(({ num, Icon }) => (
              <div key={num} className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  currentStep > num
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                    : currentStep === num
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-200 scale-110'
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  {currentStep > num ? <span className="text-[10px]"></span> : <Icon className="w-3 h-3" />}
                </div>
                {num < 9 && (
                  <div className={`w-4 h-0.5 rounded-full transition-colors duration-300 ${currentStep > num ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Mobile step label */}
          <div className="md:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200">
              <span className="text-xs font-bold text-white">{currentStep}</span>
            </div>
            <span className="text-sm font-medium text-gray-700">{STEPS[currentStep-1]?.label}</span>
          </div>

          {/* Right  progress text */}
          <span className="text-xs text-gray-400 font-medium">Step {currentStep} of 9</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 ease-out" style={{ width: `${(currentStep / 9) * 100}%` }} />
      </div>

      {/*  Main content  */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">

        {/* STEP 1 - Location */}
        {currentStep === 1 && (
          <div key="s1" className={slideDir}>
            <StepHeader num={1} title="Locate Your Roof" subtitle="Search for your address, then capture the satellite view of your rooftop." />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Location</label>
                <div className="flex gap-2">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && searchLocation()} placeholder="Search: Marrakesh, Gueliz, Morocco..." className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition-all" />
                  <button type="button" onClick={searchLocation} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold px-5 rounded-xl transition-all shadow-md shadow-amber-200 text-sm flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> Search
                  </button>
                </div>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ height: '400px' }}>
                <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                <button type="button" onClick={getUserGeolocation} disabled={isLocating} title="Get current location" className="absolute top-3 right-3 z-10 bg-white hover:bg-gray-50 border border-gray-200 shadow-md text-gray-700 rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-all">
                  {isLocating ? (
                    <svg className="w-3.5 h-3.5 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path strokeLinecap="round" d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
                  )}
                  {isLocating ? 'Locating...' : 'My Location'}
                </button>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative" style={{ width: '40%', aspectRatio: '4/3' }}>
                    <div className="absolute inset-0 border-[3px] border-dashed border-amber-400 rounded-xl" style={{ boxShadow: '0 0 0 3px rgba(245,158,11,0.25), inset 0 0 20px rgba(0,0,0,0.08)' }}>
                      <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap shadow-md">Fit roof here</div>
                    </div>
                  </div>
                </div>
              </div>

              <button type="button" onClick={captureCurrentLocation} disabled={isCapturing} className={`w-full font-semibold py-3 px-6 rounded-xl transition-all text-sm ${isCapturing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-300/40'}`}>
                {isCapturing ? 'Capturing...' : 'Capture Location'}
              </button>

              {errors.location && <ErrorBanner message={errors.location} />}
              {selectedLocation && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0"><span className="text-white text-sm font-bold"></span></div>
                  <div><p className="text-emerald-800 font-semibold text-sm">Location Captured</p><p className="text-sm text-gray-500 mt-0.5">{selectedLocation.address}</p></div>
                </div>
              )}
            </div>
            <NavButtons onNext={() => nextStep(1)} />
          </div>
        )}

        {/* STEP 2 - Energy */}
        {currentStep === 2 && (
          <div key="s2" className={slideDir}>
            <StepHeader num={2} title="Energy Usage" subtitle="Tell us about your household energy consumption." />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              {errors.energyProfile && <ErrorBanner message={errors.energyProfile} />}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Select Your Energy Profile</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {energyProfiles.map((profile) => (
                    <div key={profile.id} onClick={() => setCurrentProfile(profile.id)} className={`cursor-pointer rounded-2xl p-6 text-center transition-all duration-200 border-2 ${currentProfile === profile.id ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-100' : 'border-gray-100 bg-white hover:border-amber-200 hover:bg-amber-50/50'}`}>
                      <div className="text-4xl mb-3">{profile.icon}</div>
                      <h3 className="font-semibold text-gray-900 mb-1">{profile.label}</h3>
                      <p className="text-xs text-gray-500">{profile.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Annual Usage (kWh)</label>
                  <input type="number" value={annualUsage} onChange={(e) => setAnnualUsage(parseFloat(e.target.value))} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Annual Cost (MAD)</label>
                  <input type="number" value={annualCost} onChange={(e) => setAnnualCost(parseFloat(e.target.value))} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition-all" />
                </div>
              </div>
            </div>
            <NavButtons onBack={() => prevStep(2)} onNext={() => nextStep(2)} />
          </div>
        )}

        {/* STEP 3 - Provider */}
        {currentStep === 3 && (
          <div key="s3" className={slideDir}>
            <StepHeader num={3} title="Energy Provider" subtitle="Select your current electricity provider." />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              {errors.provider && <ErrorBanner message={errors.provider} />}
              {utilitiesLoading ? (
                <div className="flex items-center justify-center py-12 gap-3">
                  <span className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-400 text-sm">Loading utilities...</span>
                </div>
              ) : utilities.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No utilities available</div>
              ) : (
                <div className="space-y-3">
                  {utilities.map((utility) => (
                    <div key={utility.id} onClick={() => setSelectedProvider(utility)} className={`cursor-pointer rounded-xl p-5 flex items-center gap-4 border-2 transition-all duration-200 ${selectedProvider?.id === utility.id ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-100' : 'border-gray-100 hover:border-amber-200 hover:bg-amber-50/30'}`}>
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-200">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{utility.name}</h3>
                        <p className="text-sm text-gray-400">{utility.city}, {utility.state}</p>
                      </div>
                      {selectedProvider?.id === utility.id && (
                        <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-bold"></span></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <NavButtons onBack={() => prevStep(3)} onNext={() => nextStep(3)} />
          </div>
        )}

        {/* STEP 4 - Property */}
        {currentStep === 4 && (
          <div key="s4" className={slideDir}>
            <StepHeader num={4} title="Property Details" subtitle="Tell us about your roof and building structure." />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              {(errors.roofType || errors.roofTilt || errors.stories) && <ErrorBanner message={errors.roofType || errors.roofTilt || errors.stories} />}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Roof Type</label>
                <div className="grid grid-cols-2 gap-4">
                  {roofTypes.map((type) => (
                    <div key={type.id} onClick={() => setSelectedRoofType(type.id)} className={`cursor-pointer rounded-2xl p-6 text-center border-2 transition-all duration-200 ${selectedRoofType === type.id ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-100' : 'border-gray-100 hover:border-amber-200'}`}>
                      <div className="text-4xl mb-2">{type.icon}</div>
                      <h3 className="font-semibold text-gray-900 mb-1">{type.name}</h3>
                      <p className="text-xs text-gray-500">{type.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedRoofType === 'tilted' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Roof Tilt Angle</label>
                  <div className="grid grid-cols-4 gap-3">
                    {roofTiltOptions.map((option) => (
                      <div key={option.value} onClick={() => setSelectedRoofTilt(option.value)} className={`cursor-pointer rounded-xl p-4 text-center border-2 transition-all duration-200 ${selectedRoofTilt === option.value ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-100' : 'border-gray-100 hover:border-amber-200'}`}>
                        <div className="text-xl font-bold text-gray-900">{option.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Number of Stories</label>
                <div className="grid grid-cols-4 gap-3">
                  {storiesOptions.map((option) => (
                    <div key={option.value} onClick={() => { setSelectedStories(option.value); if (option.value !== 'custom') setCustomStories('') }} className={`cursor-pointer rounded-xl p-4 text-center border-2 transition-all duration-200 ${selectedStories === option.value ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-100' : 'border-gray-100 hover:border-amber-200'}`}>
                      <div className="text-base font-bold text-gray-900">{option.label}</div>
                    </div>
                  ))}
                </div>
                {selectedStories === 'custom' && (
                  <input type="number" min="1" value={customStories} onChange={(e) => setCustomStories(e.target.value)} placeholder="Enter number of stories" className="mt-4 w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition-all" />
                )}
              </div>
            </div>
            <NavButtons onBack={() => prevStep(4)} onNext={() => nextStep(4)} />
          </div>
        )}

        {/* STEP 5 - Material Provider */}
        {currentStep === 5 && (
          <div key="s5" className={slideDir}>
            <StepHeader num={5} title="Material Provider" subtitle="Choose a verified vendor or use HelioSmart defaults for optimal panel selection." />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
              <div onClick={() => setSelectedMaterialVendor(null)} className={`cursor-pointer rounded-xl p-5 flex items-center gap-4 border-2 transition-all duration-200 ${selectedMaterialVendor === null ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-100' : 'border-gray-100 hover:border-amber-200'}`}>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-200">
                  <Sun className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">HelioSmart Default</p>
                  <p className="text-sm text-gray-400">Best-scored panel from the full catalogue</p>
                </div>
                {selectedMaterialVendor === null && <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-bold"></span></div>}
              </div>

              {materialVendors.map((vendor) => (
                <div key={vendor.id} onClick={() => setSelectedMaterialVendor(vendor)} className={`cursor-pointer rounded-xl p-5 flex items-center gap-4 border-2 transition-all duration-200 ${selectedMaterialVendor?.id === vendor.id ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-100' : 'border-gray-100 hover:border-amber-200'}`}>
                  <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-sky-200">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{vendor.company_name || vendor.email}</p>
                    <p className="text-sm text-gray-400">{vendor.panel_count} panel{vendor.panel_count !== 1 ? 's' : ''}  {vendor.inverter_count} inverter{vendor.inverter_count !== 1 ? 's' : ''}</p>
                  </div>
                  {selectedMaterialVendor?.id === vendor.id && <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-bold"></span></div>}
                </div>
              ))}

              {materialVendors.length === 0 && <p className="text-sm text-gray-400 italic">No marketplace vendors available yet.</p>}
            </div>
            <NavButtons onBack={() => prevStep(5)} onNext={() => nextStep(5)} />
          </div>
        )}

        {/* STEP 6 - Roof Points */}
        {currentStep === 6 && (
          <div key="s6" className={slideDir}>
            <StepHeader num={6} title="Mark Your Roof" subtitle="Click on your roof to help our AI identify the exact boundaries." />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              {errors.roofPoints && <ErrorBanner message={errors.roofPoints} />}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
                    <p className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2"><Crosshair className="w-4 h-4" /> Instructions</p>
                    <ol className="text-sm text-amber-700/80 space-y-2 list-decimal list-inside">
                      <li>Click on the <strong>roof area</strong> in your captured image</li>
                      <li>Mark points <strong>on your roof</strong> to help our AI</li>
                      <li>Place up to <strong>6 points</strong> on different parts</li>
                      <li className="text-emerald-700 font-semibold">These points guide the AI to detect your exact roof</li>
                    </ol>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Points: {placedPoints.length} / 6</p>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300" style={{ width: `${(placedPoints.length / 6) * 100}%` }} />
                    </div>
                    {placedPoints.length > 0 && <p className="text-xs text-emerald-600 mt-2 font-medium"> {placedPoints.length} point{placedPoints.length > 1 ? 's' : ''} marked</p>}
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-md">Your Captured Roof</span>
                  </div>
                  {capturedRoofImage ? (
                    <div onClick={addSolarPoint} className="relative border-2 border-amber-300 rounded-xl overflow-hidden cursor-crosshair shadow-lg hover:shadow-xl transition-shadow" style={{ aspectRatio: '4/3' }}>
                      <img src={capturedRoofImage} alt="Captured roof" className="w-full h-full object-cover" />
                      {placedPoints.map((point, index) => (
                        <div key={index} className="absolute w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg" style={{ left: `${point.x}%`, top: `${point.y}%`, boxShadow: '0 0 0 4px rgba(245,158,11,0.25)' }}>
                          <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full" /></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-red-300 rounded-xl bg-red-50 flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
                      <div className="text-center p-6">
                        <p className="text-red-600 font-semibold mb-1">No Image Captured</p>
                        <p className="text-red-400 text-sm">Go back to Step 1 and click "Capture Location"</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <NavButtons onBack={() => prevStep(6)} onNext={() => nextStep(6)} />
          </div>
        )}

        {/* STEP 7 - Review */}
        {currentStep === 7 && (
          <div key="s7" className={slideDir}>
            <StepHeader num={7} title="Review Your Estimation" subtitle="Double-check everything before submitting to our AI." />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              {errors.submit && <ErrorBanner message={errors.submit} />}

              {[
                { label: 'Account', content: <><p className="text-sm text-gray-700 font-medium">{user?.company_name || user?.email}</p><p className="text-xs text-gray-400">{user?.email}</p></> },
                { label: 'Location', content: <><p className="text-sm text-gray-700">{selectedLocation?.address}</p><p className="text-xs text-gray-400 mt-0.5">Lat: {selectedLocation?.latitude?.toFixed(6)}, Lng: {selectedLocation?.longitude?.toFixed(6)}</p></> },
                { label: 'Energy Usage', content: <><p className="text-sm text-gray-700">Profile: {currentProfile}  {annualUsage} kWh/yr  {annualCost} MAD/yr</p></> },
                { label: 'Provider', content: <p className="text-sm text-gray-700">{selectedProvider?.name}</p> },
                { label: 'Property', content: <p className="text-sm text-gray-700">Roof: {selectedRoofType}{selectedRoofType === 'tilted' ? ` (${selectedRoofTilt}°)` : ''}  {selectedStories === 'custom' ? customStories : selectedStories} stor{parseInt(selectedStories === 'custom' ? customStories : selectedStories) > 1 ? 'ies' : 'y'}</p> },
                { label: 'Roof Points', content: <p className="text-sm text-gray-700">{placedPoints.length} points marked</p> },
              ].map(({ label, content }) => (
                <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">{label}</h3>
                  {content}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-6">
              <button type="button" onClick={() => prevStep(7)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-all">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button type="button" onClick={() => { submitForm(); setCurrentStep(8); }} disabled={createMutation.isPending} className="relative flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white font-semibold px-7 py-3 rounded-xl shadow-lg shadow-emerald-300/40 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group/sub">
                <span className="relative z-10 flex items-center gap-2"><Cpu className="w-4 h-4" /> Submit to AI</span>
                <span className="absolute inset-0 translate-x-[-100%] group-hover/sub:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 8 - Processing */}
        {currentStep === 8 && (
          <div key="s8" className={slideDir}>
            <div className="flex flex-col items-center justify-center py-12">
              {/* Animated AI orb */}
              <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 rounded-full bg-amber-300/30 animate-ring-pulse" />
                <div className="absolute inset-0 rounded-full bg-amber-300/20 animate-ring-pulse2" />
                <div className="absolute inset-0 rounded-full bg-amber-300/10 animate-ring-pulse3" />
                <div className="absolute inset-2 rounded-full border-[3px] border-dashed border-amber-300/40 animate-spin-slow" />
                <div className="absolute inset-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-400/50">
                  <Sun className="w-12 h-12 text-white animate-float" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">AI is Analyzing Your Roof</h2>
              <p className="text-gray-400 text-sm mb-8 text-center max-w-md">Our AI is detecting roof boundaries, calculating panel placement, and running SAM segmentation.</p>

              <div className="w-full max-w-sm space-y-3">
                {[
                  { label: 'Uploading satellite image' },
                  { label: 'Running SAM roof segmentation' },
                  { label: 'Calculating panel placement' },
                  { label: 'Generating results' },
                ].map((s, i) => {
                  const done = i < processingStep
                  const active = i === processingStep
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${active ? 'bg-amber-50 border border-amber-200' : done ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-100'}`}>
                      {done ? (
                        <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-200"><span className="text-white text-xs font-bold"></span></div>
                      ) : active ? (
                        <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-200">
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-gray-400 text-xs font-bold">{i + 1}</span></div>
                      )}
                      <span className={`text-sm font-medium ${done ? 'text-emerald-700' : active ? 'text-amber-700' : 'text-gray-400'}`}>{s.label}</span>
                      {active && <span className="ml-auto text-xs text-amber-500 animate-pulse">processing...</span>}
                    </div>
                  )
                })}
              </div>

              <p className="text-xs text-gray-400 mt-8">This may take 1-2 minutes depending on image size...</p>
            </div>
          </div>
        )}

        {/* STEP 9 - Results */}
        {currentStep === 9 && visualizationData && (
          <div key="s9" className={slideDir}>
            <StepHeader num={9} title="AI Roof Detection Results" subtitle="See exactly what our AI detected on your roof." />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                <h3 className="font-semibold text-sky-800 text-sm mb-1">Visual Transparency</h3>
                <p className="text-sm text-sky-700/80">
                  The <span className="font-semibold text-emerald-600">green area</span> shows usable space for solar panels
                  {visualizationData?.panel_positions?.length > 0 && <span>, and the <span className="font-semibold text-orange-500">orange rectangles</span> show the optimal panel placement</span>}
                  {visualizationData?.obstacles?.length > 0 && <span>. <span className="font-semibold text-red-500">Red markers</span> indicate obstacles</span>}.
                </p>
              </div>

              <PolygonOverlay
                visualization={visualizationData}
                capturedImage={capturedRoofImage}
                panelPositions={visualizationData?.panel_positions}
                onSnapshotReady={setSitePlanSnapshot}
                onApprove={async () => {
                  if (sitePlanSnapshot && estimationId) {
                    try { await estimationsAPI.update(estimationId, { site_plan_snapshot: sitePlanSnapshot }) }
                    catch (e) { console.warn('site_plan_snapshot save failed:', e) }
                  }
                  if (estimationId) navigate(`/estimations/${estimationId}`)
                }}
                onReject={() => { setCurrentStep(1); setVisualizationData(null); setEstimationId(null) }}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

/*  Shared sub-components  */

function StepHeader({ num, title, subtitle }) {
  return (
    <div className="mb-6 opacity-0" style={{ animation: 'slideUpFade 0.45s ease-out 0.08s forwards' }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200">
          <span className="text-white text-sm font-bold">{num}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <p className="text-gray-400 text-sm ml-12">{subtitle}</p>
    </div>
  )
}

function NavButtons({ onBack, onNext }) {
  return (
    <div className="flex items-center justify-between mt-6">
      {onBack ? (
        <button type="button" onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-all">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      ) : <div />}
      {onNext && (
        <button type="button" onClick={onNext} className="relative flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-amber-300/40 text-sm transition-all overflow-hidden group/n">
          <span className="relative z-10 flex items-center gap-2">Continue <ChevronRight className="w-4 h-4 group-hover/n:translate-x-0.5 transition-transform duration-200" /></span>
          <span className="absolute inset-0 translate-x-[-100%] group-hover/n:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        </button>
      )}
    </div>
  )
}

function ErrorBanner({ message }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-bold">!</span></div>
      <p className="text-red-700 text-sm font-medium">{message}</p>
    </div>
  )
}

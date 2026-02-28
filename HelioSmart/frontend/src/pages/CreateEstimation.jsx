import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { estimationsAPI, utilitiesAPI } from '@/services/api'
import PolygonOverlay from '@/components/PolygonOverlay'

export default function CreateEstimation() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [currentProfile, setCurrentProfile] = useState('balanced')
  const [selectedRoofType, setSelectedRoofType] = useState('')
  const [selectedRoofTilt, setSelectedRoofTilt] = useState('')
  const [selectedStories, setSelectedStories] = useState('')
  const [customStories, setCustomStories] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [placedPoints, setPlacedPoints] = useState([])
  const [obstaclePoints, setObstaclePoints] = useState([])
  const [annualUsage, setAnnualUsage] = useState(10000)
  const [annualCost, setAnnualCost] = useState(1200)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [visualizationData, setVisualizationData] = useState(null)
  const [estimationId, setEstimationId] = useState(null)
  const [errors, setErrors] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  
  const mapRef = useRef(null)
  const [map, setMap] = useState(null)
  const [geocoder, setGeocoder] = useState(null)
  const [mapCenter, setMapCenter] = useState({ lat: 31.6295, lng: -7.9811 })
  
  // Fetch utilities from database
  const { data: utilitiesData, isLoading: utilitiesLoading } = useQuery({
    queryKey: ['utilities'],
    queryFn: () => utilitiesAPI.getAll()
  })

  const utilities = utilitiesData?.data || []

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
        console.log('Step 7 ACTIVATED - visualization data found')
        setVisualizationData(response.data.visualization)
        setCurrentStep(7) // Go to visualization step
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
  
  // Initialize Google Maps
  useEffect(() => {
    const initMap = () => {
      if (!window.google || !mapRef.current) return
      
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: 18,
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
      map.setZoom(19)
      setMapCenter({ lat: location.lat(), lng: location.lng() })
    } catch (error) {
      console.error('Search failed:', error)
      setErrors({ ...errors, location: 'Location not found. Please try a different search.' })
    }
  }
  
  const captureCurrentLocation = async () => {
    if (!map || !geocoder) {
      setErrors({ ...errors, location: 'Map is not ready yet' })
      return
    }
    
    const center = map.getCenter()
    const location = { lat: center.lat(), lng: center.lng() }
    
    try {
      setErrors({ ...errors, location: null })
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
    } catch (error) {
      console.error('Geocoding error:', error)
      setErrors({ ...errors, location: 'Failed to capture location. Please try again.' })
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
      if (!customerName.trim()) {
        newErrors.customerName = 'Please enter customer name'
      }
      if (!customerEmail.trim() || !customerEmail.includes('@')) {
        newErrors.customerEmail = 'Please enter a valid email address'
      }
      if (!selectedLocation) {
        newErrors.location = 'Please capture a location first'
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
    
    if (step === 5 && placedPoints.length < 1) {
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
    setErrors({})
    
    // Capture satellite image from map
    let satelliteImageBase64 = ''
    try {
      // Get the map div and convert to canvas
      const mapDiv = mapRef.current
      if (mapDiv) {
        // Use html2canvas or similar library, or use Google Maps Static API
        // For now, we'll use a placeholder approach
        const canvas = document.createElement('canvas')
        canvas.width = mapDiv.offsetWidth
        canvas.height = mapDiv.offsetHeight
        const ctx = canvas.getContext('2d')
        
        // Try to capture the map image
        // Note: This is a simplified version. In production, use proper screenshot library
        try {
          // Get static map image from Google Maps Static API
          const center = map.getCenter()
          const zoom = map.getZoom()
          const size = `${canvas.width}x${canvas.height}`
          
          // Since we can't easily screenshot Google Maps due to CORS,
          // we'll use the Static Maps API or send coordinates for backend to fetch
          // For now, create a data URL placeholder
          satelliteImageBase64 = `data:image/png;base64,${btoa('placeholder')}`
        } catch (err) {
          console.warn('Could not capture map image:', err)
          satelliteImageBase64 = `data:image/png;base64,${btoa('placeholder')}`
        }
      }
    } catch (error) {
      console.error('Error capturing satellite image:', error)
    }
    
    const formData = {
      // Customer info
      customer_name: customerName,
      email: customerEmail,
      
      // Location data
      latitude: selectedLocation?.latitude || 0,
      longitude: selectedLocation?.longitude || 0,
      street: selectedLocation?.street || '',
      city: selectedLocation?.city || '',
      state: selectedLocation?.state || '',
      zip_code: selectedLocation?.zip_code || '',
      country: selectedLocation?.country || '',
      search_query: selectedLocation?.address || '',
      
      // Satellite image
      satellite_image: satelliteImageBase64,
      scale_meters_per_pixel: 0.3, // Approximate scale
      zoom_level: map?.getZoom() || 18,
      
      // Energy usage
      monthly_bill: annualCost / 12,
      usage_pattern: currentProfile, // 'balanced', 'summer', 'winter'
      
      // Provider
      provider: selectedProvider?.id || 1, // utility_id
      
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
  
  return (
    <div className="p-4 md:p-8" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e1f5fe 100%)', minHeight: '100vh' }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">Solar Estimation Tool</h1>
          <p className="text-gray-600">Design your perfect solar energy system in 6 easy steps</p>
        </div>
        
        <div className="flex justify-between items-center mb-8 px-2">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                  currentStep >= step
                    ? currentStep === step ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step ? '✓' : step}
                </div>
                <span className="text-xs mt-2 text-gray-600 hidden md:block">
                  {step === 1 && 'Location'}
                  {step === 2 && 'Energy'}
                  {step === 3 && 'Provider'}
                  {step === 4 && 'Property'}
                  {step === 5 && 'Solar Points'}
                  {step === 6 && 'Review'}
                </span>
              </div>
              {step < 6 && (
                <div className="flex-1 h-1 mx-2" style={{ backgroundColor: currentStep > step ? '#22c55e' : '#e5e7eb' }} />
              )}
            </div>
          ))}
        </div>
        
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 1: Customer & Location</h2>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => { setCustomerName(e.target.value); setErrors({ ...errors, customerName: null }) }}
                    placeholder="Enter customer name"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.customerName ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {errors.customerName && <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => { setCustomerEmail(e.target.value); setErrors({ ...errors, customerEmail: null }) }}
                    placeholder="customer@example.com"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.customerEmail ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {errors.customerEmail && <p className="text-red-500 text-sm mt-1">{errors.customerEmail}</p>}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Location</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
                    placeholder="Search: Marrakesh, Gueliz, Morocco..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button type="button" onClick={searchLocation} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 rounded-lg transition-colors">
                    🔍 Search
                  </button>
                </div>
              </div>
              
              <div className="relative" style={{ height: '400px', borderRadius: '0.5rem', overflow: 'hidden' }}>
                <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg font-medium">
                  📍 Center your roof in the box, then click Capture
                </div>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative" style={{ width: '60%', aspectRatio: '4/3' }}>
                    <div className="absolute inset-0 border-3 border-dashed border-yellow-400 rounded-lg" style={{ borderWidth: '3px', boxShadow: '0 0 0 3px rgba(250, 204, 21, 0.4), inset 0 0 20px rgba(0,0,0,0.1)' }}>
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 text-xs px-3 py-1 rounded font-bold whitespace-nowrap shadow">⬇ Fit roof here ⬇</div>
                    </div>
                  </div>
                </div>
              </div>
              <button type="button" onClick={captureCurrentLocation} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                📸 Capture Location
              </button>
              
              {errors.location && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-semibold">⚠️ {errors.location}</p>
                </div>
              )}
              
              {selectedLocation && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-semibold">✓ Location Captured</p>
                  <p className="text-sm text-gray-600 mt-1">{selectedLocation.address}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button type="button" onClick={() => nextStep(1)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">Next →</button>
            </div>
          </div>
        )}
        
        {currentStep === 2 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 2: Energy Usage</h2>
            {errors.energyProfile && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-800">{errors.energyProfile}</p>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Select Your Energy Profile</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {energyProfiles.map((profile) => (
                    <div key={profile.id} onClick={() => setCurrentProfile(profile.id)} className={`cursor-pointer border-2 rounded-lg p-6 text-center transition-all ${currentProfile === profile.id ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                      <div className="text-4xl mb-3">{profile.icon}</div>
                      <h3 className="font-semibold text-gray-800 mb-1">{profile.label}</h3>
                      <p className="text-xs text-gray-600">{profile.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Annual Usage (kWh)</label>
                  <input type="number" value={annualUsage} onChange={(e) => setAnnualUsage(parseFloat(e.target.value))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Annual Cost (MAD)</label>
                  <input type="number" value={annualCost} onChange={(e) => setAnnualCost(parseFloat(e.target.value))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button type="button" onClick={() => prevStep(2)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg transition-colors">← Back</button>
              <button type="button" onClick={() => nextStep(2)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">Next →</button>
            </div>
          </div>
        )}
        
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 3: Energy Provider</h2>
            {errors.provider && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-800">{errors.provider}</p>
              </div>
            )}
            {utilitiesLoading ? (
              <div className="text-center py-8 text-gray-500">Loading utilities...</div>
            ) : utilities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No utilities available</div>
            ) : (
              <div className="space-y-4">
                {utilities.map((utility) => (
                  <div key={utility.id} onClick={() => setSelectedProvider(utility)} className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${selectedProvider?.id === utility.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-4">
                        <span className="text-2xl">⚡</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{utility.name}</h3>
                        <p className="text-sm text-gray-600">{utility.city}, {utility.state}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between mt-6">
              <button type="button" onClick={() => prevStep(3)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg transition-colors">← Back</button>
              <button type="button" onClick={() => nextStep(3)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">Next →</button>
            </div>
          </div>
        )}
        
        {currentStep === 4 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 4: Property Details</h2>
            {(errors.roofType || errors.roofTilt || errors.stories) && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-800">{errors.roofType || errors.roofTilt || errors.stories}</p>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Roof Type</label>
                <div className="grid grid-cols-2 gap-4">
                  {roofTypes.map((type) => (
                    <div key={type.id} onClick={() => setSelectedRoofType(type.id)} className={`cursor-pointer border-2 rounded-lg p-6 text-center transition-all ${selectedRoofType === type.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                      <div className="text-4xl mb-2">{type.icon}</div>
                      <h3 className="font-semibold text-gray-800 mb-1">{type.name}</h3>
                      <p className="text-xs text-gray-600">{type.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              {selectedRoofType === 'tilted' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">Roof Tilt Angle</label>
                  <div className="grid grid-cols-4 gap-4">
                    {roofTiltOptions.map((option) => (
                      <div key={option.value} onClick={() => setSelectedRoofTilt(option.value)} className={`cursor-pointer border-2 rounded-lg p-4 text-center transition-all ${selectedRoofTilt === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                        <div className="text-2xl font-bold text-gray-800">{option.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Number of Stories</label>
                <div className="grid grid-cols-4 gap-4">
                  {storiesOptions.map((option) => (
                    <div key={option.value} onClick={() => { setSelectedStories(option.value); if (option.value !== 'custom') setCustomStories('') }} className={`cursor-pointer border-2 rounded-lg p-4 text-center transition-all ${selectedStories === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                      <div className="text-xl font-bold text-gray-800">{option.label}</div>
                    </div>
                  ))}
                </div>
                {selectedStories === 'custom' && (
                  <input type="number" min="1" value={customStories} onChange={(e) => setCustomStories(e.target.value)} placeholder="Enter number of stories" className="mt-4 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                )}
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button type="button" onClick={() => prevStep(4)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg transition-colors">← Back</button>
              <button type="button" onClick={() => nextStep(4)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">Next →</button>
            </div>
          </div>
        )}
        
        {currentStep === 5 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 5: Mark Your Roof Area</h2>
            {errors.roofPoints && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-800">{errors.roofPoints}</p>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-5 mb-4">
                  <p className="text-base text-blue-900 font-bold mb-3">📋 Instructions:</p>
                  <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                    <li className="font-medium">Click inside the <span className="text-indigo-600 font-bold">rectangular roof box</span> on the right</li>
                    <li>Mark the corners and key points of your roof area</li>
                    <li>Place up to <span className="font-bold">6 points</span> to outline your roof</li>
                    <li className="text-red-700 font-semibold">⚠️ IMPORTANT: Only click inside the box - this represents your captured roof image</li>
                  </ol>
                  <div className="mt-3 bg-white rounded p-3 border border-blue-200">
                    <p className="text-xs text-gray-700"><span className="font-semibold">💡 Tip:</span> These points will help our AI detect the exact roof boundaries and calculate optimal panel placement.</p>
                  </div>
                </div>
                <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Points Placed: {placedPoints.length} / 6</p>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all" style={{ width: `${(placedPoints.length / 6) * 100}%` }}></div>
                  </div>
                  {placedPoints.length > 0 && (
                    <p className="text-xs text-green-600 mt-2">✓ {placedPoints.length} point{placedPoints.length > 1 ? 's' : ''} marked</p>
                  )}
                </div>
              </div>
              <div className="relative">
                <div className="absolute -top-2 left-0 right-0 text-center">
                  <span className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">↓ Your Captured Roof Image ↓</span>
                </div>
                <div onClick={addSolarPoint} className="relative border-4 border-indigo-500 rounded-lg overflow-hidden cursor-crosshair shadow-xl" style={{ aspectRatio: '4/3', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'800\' height=\'600\' viewBox=\'0 0 800 600\'%3E%3Crect width=\'800\' height=\'600\' fill=\'%23b0bec5\'/%3E%3Cpath d=\'M100 100h600v400H100z\' fill=\'%23455a64\' fill-opacity=\'.3\'/%3E%3Cpath d=\'M150 150h500v300H150z\' fill=\'%23455a64\' fill-opacity=\'.2\'/%3E%3C/svg%3E")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                {placedPoints.map((point, index) => (
                  <div key={index} className="absolute w-6 h-6 bg-blue-500 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg" style={{ left: `${point.x}%`, top: `${point.y}%`, boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)' }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button type="button" onClick={() => prevStep(5)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg transition-colors">← Back</button>
              <button type="button" onClick={() => nextStep(5)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">Next →</button>
            </div>
          </div>
        )}
        
        {currentStep === 6 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 6: Review Your Estimation</h2>
            {errors.submit && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-800 font-semibold">⚠️ Submission Error</p>
                <p className="text-sm text-red-700 mt-1">{errors.submit}</p>
              </div>
            )}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Customer Information</h3>
                <p className="text-sm text-gray-600">Name: {customerName}</p>
                <p className="text-sm text-gray-600">Email: {customerEmail}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Location</h3>
                <p className="text-sm text-gray-600">{selectedLocation?.address}</p>
                <p className="text-xs text-gray-500 mt-1">Lat: {selectedLocation?.latitude?.toFixed(6)}, Lng: {selectedLocation?.longitude?.toFixed(6)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Energy Usage</h3>
                <p className="text-sm text-gray-600">Profile: {currentProfile}</p>
                <p className="text-sm text-gray-600">Annual Usage: {annualUsage} kWh</p>
                <p className="text-sm text-gray-600">Annual Cost: {annualCost} MAD</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Energy Provider</h3>
                <p className="text-sm text-gray-600">{selectedProvider?.name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Property Details</h3>
                <p className="text-sm text-gray-600">Roof Type: {selectedRoofType}</p>
                {selectedRoofType === 'tilted' && <p className="text-sm text-gray-600">Roof Tilt: {selectedRoofTilt}°</p>}
                <p className="text-sm text-gray-600">Stories: {selectedStories === 'custom' ? customStories : selectedStories}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Solar System</h3>
                <p className="text-sm text-gray-600">Panel Points: {placedPoints.length}</p>
                <p className="text-sm text-gray-600">Estimated Panels: {placedPoints.length * 3}</p>
                <p className="text-sm text-gray-600">Estimated Capacity: {(placedPoints.length * 3 * 0.350).toFixed(2)} kW</p>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button type="button" onClick={() => prevStep(6)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg transition-colors">← Back</button>
              <button type="button" onClick={submitForm} disabled={createMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50">
                {createMutation.isPending ? 'Submitting...' : 'Submit Estimation'}
              </button>
            </div>
          </div>
        )}

        {/* Step 7: AI Detection Results - Visual Transparency */}
        {currentStep === 7 && visualizationData && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              🤖 AI Roof Detection Results
            </h2>
            
            <div className="mb-6">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">Visual Transparency</h3>
                <p className="text-sm text-blue-800">
                  Below you can see exactly what our AI detected on your roof. 
                  The <span className="font-semibold text-green-600">green area</span> shows usable space for solar panels, 
                  and <span className="font-semibold text-red-600">red markers</span> indicate obstacles.
                </p>
              </div>
              
              <PolygonOverlay 
                visualization={visualizationData}
                onApprove={() => {
                  if (estimationId) {
                    navigate(`/estimations/${estimationId}`)
                  }
                }}
                onReject={() => {
                  // Allow user to go back and retry
                  setCurrentStep(1)
                  setVisualizationData(null)
                  setEstimationId(null)
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

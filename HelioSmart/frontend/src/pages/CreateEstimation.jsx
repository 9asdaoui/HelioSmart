import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { estimationsAPI, utilitiesAPI } from '@/services/api'
import PolygonOverlay from '@/components/PolygonOverlay'
import html2canvas from 'html2canvas'
import { MapPin, Zap, Building, Home, Sun, CheckCircle, ArrowLeft, ArrowRight, Send, Cpu } from 'lucide-react'

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
  const [capturedRoofImage, setCapturedRoofImage] = useState(null)
  const [isCapturing, setIsCapturing] = useState(false)

  const mapRef = useRef(null)
  const captureBoxRef = useRef(null)
  const [map, setMap] = useState(null)
  const [geocoder, setGeocoder] = useState(null)
  const [mapCenter, setMapCenter] = useState({ lat: 31.6295, lng: -7.9811 })

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

      if (response.data.visualization) {
        console.log('Step 8 ACTIVATED - visualization data found')
        setVisualizationData(response.data.visualization)
        setCurrentStep(8)
      } else {
        console.log('No visualization data - redirecting to details page')
        navigate(`/estimations/${estId}`)
      }
    },
    onError: (error) => {
      console.error('Estimation creation failed:', error)
      setErrors({ submit: error.response?.data?.detail || error.message })
    }
  })

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
    if (!map || !geocoder || !mapRef.current) {
      setErrors({ ...errors, location: 'Map is not ready yet' })
      return
    }

    setIsCapturing(true)
    const center = map.getCenter()
    const location = { lat: center.lat(), lng: center.lng() }

    try {
      setErrors({ ...errors, location: null })

      const mapElement = mapRef.current
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 2,
      })

      const mapWidth = canvas.width
      const mapHeight = canvas.height
      const boxWidth = mapWidth * 0.4
      const boxHeight = boxWidth * (3 / 4)
      const boxX = (mapWidth - boxWidth) / 2
      const boxY = (mapHeight - boxHeight) / 2

      const croppedCanvas = document.createElement('canvas')
      croppedCanvas.width = boxWidth
      croppedCanvas.height = boxHeight
      const ctx = croppedCanvas.getContext('2d')
      ctx.drawImage(canvas, boxX, boxY, boxWidth, boxHeight, 0, 0, boxWidth, boxHeight)

      const imageBase64 = croppedCanvas.toDataURL('image/png')
      setCapturedRoofImage(imageBase64)
      console.log('Captured roof image:', imageBase64.substring(0, 100) + '...')

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
      if (!customerName.trim()) newErrors.customerName = 'Please enter customer name'
      if (!customerEmail.trim() || !customerEmail.includes('@')) newErrors.customerEmail = 'Please enter a valid email address'
      if (!selectedLocation) newErrors.location = 'Please capture a location first'
      if (!capturedRoofImage) newErrors.location = 'Please capture your roof image by clicking the Capture Location button'
    }
    if (step === 2) {
      if (!currentProfile) newErrors.energyProfile = 'Please select an energy usage profile'
    }
    if (step === 3) {
      if (!selectedProvider) newErrors.provider = 'Please select an energy provider'
    }
    if (step === 4) {
      if (!selectedRoofType) newErrors.roofType = 'Please select a roof type'
      if (selectedRoofType === 'tilted' && !selectedRoofTilt) newErrors.roofTilt = 'Please select a roof tilt'
      if (!selectedStories) newErrors.stories = 'Please select number of stories'
    }
    if (step === 5 && placedPoints.length < 1) newErrors.roofPoints = 'Please mark at least 1 point on the roof area'

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
    if (!capturedRoofImage) {
      setErrors({ submit: 'Please capture your roof location first (Step 1)' })
      return
    }

    setErrors({})

    const formData = {
      customer_name: customerName,
      email: customerEmail,
      latitude: selectedLocation?.latitude || 0,
      longitude: selectedLocation?.longitude || 0,
      street: selectedLocation?.street || '',
      city: selectedLocation?.city || '',
      state: selectedLocation?.state || '',
      zip_code: selectedLocation?.zip_code || '',
      country: selectedLocation?.country || '',
      search_query: selectedLocation?.address || '',
      satellite_image: capturedRoofImage,
      scale_meters_per_pixel: 0.3,
      zoom_level: map?.getZoom() || 18,
      monthly_bill: annualCost / 12,
      usage_pattern: currentProfile,
      provider: selectedProvider?.id || 1,
      roof_type: selectedRoofType,
      roof_tilt: selectedRoofTilt || '20',
      building_stories: selectedStories === 'custom' ? parseInt(customStories) : parseInt(selectedStories),
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

  const stepLabels = ['Location', 'Energy', 'Provider', 'Property', 'Points', 'Review', 'Processing', 'Results']
  const stepIcons = [MapPin, Zap, Building, Home, Sun, CheckCircle, Cpu, CheckCircle]

  return (
    <div className="min-h-screen bg-slate-50 py-8 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display font-bold gradient-text mb-2">Solar Estimation Tool</h1>
          <p className="text-slate-500">Design your perfect solar energy system in 6 easy steps</p>
        </div>

        {/* Stepper */}
        <div className="flex justify-between items-center mb-10 px-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => {
            const Icon = stepIcons[step - 1]
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${currentStep > step
                      ? 'bg-eco-500 text-white shadow-glow-eco'
                      : currentStep === step
                        ? 'bg-gradient-to-br from-solar-400 to-primary-500 text-white shadow-glow-sm'
                        : 'bg-slate-200 text-slate-400'
                    }`}>
                    {currentStep > step ? '✓' : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-xs mt-2 text-slate-500 hidden md:block font-medium">
                    {stepLabels[step - 1]}
                  </span>
                </div>
                {step < 8 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all duration-500 ${currentStep > step ? 'bg-eco-400' : 'bg-slate-200'
                    }`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step 1: Location */}
        {currentStep === 1 && (
          <div className="card animate-slide-up">
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-solar-100 rounded-xl"><MapPin className="w-5 h-5 text-solar-600" /></div>
              Customer & Location
            </h2>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Customer Name *</label>
                  <input type="text" value={customerName} onChange={(e) => { setCustomerName(e.target.value); setErrors({ ...errors, customerName: null }) }} placeholder="Enter customer name" className={`input-field ${errors.customerName ? 'border-red-400 ring-2 ring-red-100' : ''}`} required />
                  {errors.customerName && <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>}
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input type="email" value={customerEmail} onChange={(e) => { setCustomerEmail(e.target.value); setErrors({ ...errors, customerEmail: null }) }} placeholder="customer@example.com" className={`input-field ${errors.customerEmail ? 'border-red-400 ring-2 ring-red-100' : ''}`} required />
                  {errors.customerEmail && <p className="text-red-500 text-sm mt-1">{errors.customerEmail}</p>}
                </div>
              </div>

              <div>
                <label className="label">Search Location</label>
                <div className="flex gap-2">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && searchLocation()} placeholder="Search: Marrakesh, Gueliz, Morocco..." className="input-field flex-1" />
                  <button type="button" onClick={searchLocation} className="btn-primary px-6">
                    🔍 Search
                  </button>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden shadow-glass-lg" style={{ height: '400px' }}>
                <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full font-medium border border-white/10">
                  📍 Center your roof in the box, then click Capture
                </div>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative" style={{ width: '40%', aspectRatio: '4/3' }}>
                    <div className="absolute inset-0 border-3 border-dashed border-solar-400 rounded-xl" style={{ borderWidth: '3px', boxShadow: '0 0 0 3px rgba(251, 191, 36, 0.3), inset 0 0 20px rgba(0,0,0,0.1)' }}>
                      <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-solar-400 to-primary-500 text-white text-xs px-4 py-1.5 rounded-full font-bold whitespace-nowrap shadow-lg">⬇ Fit roof here ⬇</div>
                    </div>
                  </div>
                </div>
              </div>

              <button type="button" onClick={captureCurrentLocation} disabled={isCapturing} className={`w-full font-semibold py-3.5 rounded-xl transition-all text-white ${isCapturing ? 'bg-slate-400 cursor-not-allowed' : 'btn-primary'}`}>
                {isCapturing ? '⏳ Capturing...' : '📸 Capture Location'}
              </button>

              {errors.location && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <p className="text-red-700 font-semibold text-sm">{errors.location}</p>
                </div>
              )}

              {selectedLocation && (
                <div className="bg-eco-50 border border-eco-200 rounded-xl p-4 flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-eco-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-eco-800 font-semibold">Location Captured</p>
                    <p className="text-sm text-slate-600 mt-0.5">{selectedLocation.address}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-8">
              <button type="button" onClick={() => nextStep(1)} className="btn-primary px-8">
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Energy */}
        {currentStep === 2 && (
          <div className="card animate-slide-up">
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-solar-100 rounded-xl"><Zap className="w-5 h-5 text-solar-600" /></div>
              Energy Usage
            </h2>
            {errors.energyProfile && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-700 text-sm">{errors.energyProfile}</p>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="label">Select Your Energy Profile</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {energyProfiles.map((profile) => (
                    <div key={profile.id} onClick={() => setCurrentProfile(profile.id)} className={currentProfile === profile.id ? 'selection-card-active' : 'selection-card'}>
                      <div className="text-4xl mb-3">{profile.icon}</div>
                      <h3 className="font-display font-bold text-slate-800 mb-1">{profile.label}</h3>
                      <p className="text-xs text-slate-500">{profile.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Annual Usage (kWh)</label>
                  <input type="number" value={annualUsage} onChange={(e) => setAnnualUsage(parseFloat(e.target.value))} className="input-field" />
                </div>
                <div>
                  <label className="label">Annual Cost (MAD)</label>
                  <input type="number" value={annualCost} onChange={(e) => setAnnualCost(parseFloat(e.target.value))} className="input-field" />
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-8">
              <button type="button" onClick={() => prevStep(2)} className="btn-secondary"><ArrowLeft className="w-4 h-4 mr-2" /> Back</button>
              <button type="button" onClick={() => nextStep(2)} className="btn-primary">Next <ArrowRight className="w-4 h-4 ml-2" /></button>
            </div>
          </div>
        )}

        {/* Step 3: Provider */}
        {currentStep === 3 && (
          <div className="card animate-slide-up">
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-solar-100 rounded-xl"><Building className="w-5 h-5 text-solar-600" /></div>
              Energy Provider
            </h2>
            {errors.provider && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-700 text-sm">{errors.provider}</p>
              </div>
            )}
            {utilitiesLoading ? (
              <div className="text-center py-12"><div className="spinner-lg mx-auto mb-3"></div><p className="text-slate-500">Loading utilities...</p></div>
            ) : utilities.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No utilities available</div>
            ) : (
              <div className="space-y-3">
                {utilities.map((utility) => (
                  <div key={utility.id} onClick={() => setSelectedProvider(utility)} className={`cursor-pointer rounded-2xl p-5 transition-all duration-200 border-2 ${selectedProvider?.id === utility.id ? 'border-solar-400 bg-solar-50 shadow-glow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-solar-400 to-primary-500 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                        <span className="text-2xl">⚡</span>
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-slate-900">{utility.name}</h3>
                        <p className="text-sm text-slate-500">{utility.city}, {utility.state}</p>
                      </div>
                      {selectedProvider?.id === utility.id && <CheckCircle className="w-5 h-5 text-eco-500 ml-auto" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between mt-8">
              <button type="button" onClick={() => prevStep(3)} className="btn-secondary"><ArrowLeft className="w-4 h-4 mr-2" /> Back</button>
              <button type="button" onClick={() => nextStep(3)} className="btn-primary">Next <ArrowRight className="w-4 h-4 ml-2" /></button>
            </div>
          </div>
        )}

        {/* Step 4: Property Details */}
        {currentStep === 4 && (
          <div className="card animate-slide-up">
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-solar-100 rounded-xl"><Home className="w-5 h-5 text-solar-600" /></div>
              Property Details
            </h2>
            {(errors.roofType || errors.roofTilt || errors.stories) && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-700 text-sm">{errors.roofType || errors.roofTilt || errors.stories}</p>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="label">Roof Type</label>
                <div className="grid grid-cols-2 gap-4">
                  {roofTypes.map((type) => (
                    <div key={type.id} onClick={() => setSelectedRoofType(type.id)} className={selectedRoofType === type.id ? 'selection-card-active' : 'selection-card'}>
                      <div className="text-4xl mb-2">{type.icon}</div>
                      <h3 className="font-display font-bold text-slate-800 mb-1">{type.name}</h3>
                      <p className="text-xs text-slate-500">{type.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              {selectedRoofType === 'tilted' && (
                <div>
                  <label className="label">Roof Tilt Angle</label>
                  <div className="grid grid-cols-4 gap-3">
                    {roofTiltOptions.map((option) => (
                      <div key={option.value} onClick={() => setSelectedRoofTilt(option.value)} className={`cursor-pointer rounded-xl p-4 text-center border-2 transition-all duration-200 ${selectedRoofTilt === option.value ? 'border-solar-400 bg-solar-50 shadow-glow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="text-xl font-display font-bold text-slate-800">{option.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="label">Number of Stories</label>
                <div className="grid grid-cols-4 gap-3">
                  {storiesOptions.map((option) => (
                    <div key={option.value} onClick={() => { setSelectedStories(option.value); if (option.value !== 'custom') setCustomStories('') }} className={`cursor-pointer rounded-xl p-4 text-center border-2 transition-all duration-200 ${selectedStories === option.value ? 'border-solar-400 bg-solar-50 shadow-glow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="text-sm font-display font-bold text-slate-800">{option.label}</div>
                    </div>
                  ))}
                </div>
                {selectedStories === 'custom' && (
                  <input type="number" min="1" value={customStories} onChange={(e) => setCustomStories(e.target.value)} placeholder="Enter number of stories" className="input-field mt-4" />
                )}
              </div>
            </div>
            <div className="flex justify-between mt-8">
              <button type="button" onClick={() => prevStep(4)} className="btn-secondary"><ArrowLeft className="w-4 h-4 mr-2" /> Back</button>
              <button type="button" onClick={() => nextStep(4)} className="btn-primary">Next <ArrowRight className="w-4 h-4 ml-2" /></button>
            </div>
          </div>
        )}

        {/* Step 5: Roof Points */}
        {currentStep === 5 && (
          <div className="card animate-slide-up">
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-solar-100 rounded-xl"><Sun className="w-5 h-5 text-solar-600" /></div>
              Mark Your Roof Area
            </h2>
            {errors.roofPoints && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-700 text-sm">{errors.roofPoints}</p>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="bg-gradient-to-br from-helio-50 to-helio-100 border border-helio-200 rounded-2xl p-5 mb-4">
                  <p className="text-base text-helio-900 font-bold mb-3">📋 Instructions:</p>
                  <ol className="text-sm text-helio-800 space-y-2 list-decimal list-inside">
                    <li className="font-medium">Click inside the <span className="text-primary-600 font-bold">roof box</span> on the right</li>
                    <li>Mark the corners and key points of your roof area</li>
                    <li>Place up to <span className="font-bold">6 points</span> to outline your roof</li>
                    <li className="text-red-600 font-semibold">⚠️ Only click inside the box</li>
                  </ol>
                  <div className="mt-3 bg-white/80 rounded-xl p-3 border border-helio-200">
                    <p className="text-xs text-slate-700"><span className="font-semibold">💡 Tip:</span> These points will help our AI detect the exact roof boundaries.</p>
                  </div>
                </div>
                <div className="card">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Points Placed: {placedPoints.length} / 6</p>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-solar-400 to-eco-500 rounded-full transition-all duration-300" style={{ width: `${(placedPoints.length / 6) * 100}%` }}></div>
                  </div>
                  {placedPoints.length > 0 && (
                    <p className="text-xs text-eco-600 mt-2 font-medium">✓ {placedPoints.length} point{placedPoints.length > 1 ? 's' : ''} marked</p>
                  )}
                </div>
              </div>
              <div className="relative">
                <div className="absolute -top-2 left-0 right-0 text-center z-10">
                  <span className="bg-gradient-to-r from-helio-600 to-helio-700 text-white text-xs px-4 py-1.5 rounded-full font-bold shadow-lg">↓ Your Captured Roof Image ↓</span>
                </div>
                {capturedRoofImage ? (
                  <div onClick={addSolarPoint} className="relative border-4 border-helio-500 rounded-2xl overflow-hidden cursor-crosshair shadow-glass-lg mt-4" style={{ aspectRatio: '4/3' }}>
                    <img src={capturedRoofImage} alt="Captured roof" className="w-full h-full object-cover" />
                    {placedPoints.map((point, index) => (
                      <div key={index} className="absolute w-6 h-6 bg-gradient-to-br from-solar-400 to-primary-500 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg" style={{ left: `${point.x}%`, top: `${point.y}%`, boxShadow: '0 0 0 4px rgba(251, 191, 36, 0.3)' }}>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative border-4 border-red-300 rounded-2xl overflow-hidden shadow-glass bg-red-50 flex items-center justify-center mt-4" style={{ aspectRatio: '4/3' }}>
                    <div className="text-center p-6">
                      <p className="text-red-600 font-semibold text-lg mb-2">⚠️ No Image Captured</p>
                      <p className="text-red-500 text-sm">Go back to Step 1 and click "Capture Location"</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between mt-8">
              <button type="button" onClick={() => prevStep(5)} className="btn-secondary"><ArrowLeft className="w-4 h-4 mr-2" /> Back</button>
              <button type="button" onClick={() => nextStep(5)} className="btn-primary">Next <ArrowRight className="w-4 h-4 ml-2" /></button>
            </div>
          </div>
        )}

        {/* Step 6: Review */}
        {currentStep === 6 && (
          <div className="card animate-slide-up">
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-eco-100 rounded-xl"><CheckCircle className="w-5 h-5 text-eco-600" /></div>
              Review Your Estimation
            </h2>
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-700 font-semibold text-sm">⚠️ {errors.submit}</p>
              </div>
            )}
            <div className="space-y-4">
              {[
                { title: 'Customer Information', content: [`Name: ${customerName}`, `Email: ${customerEmail}`] },
                { title: 'Location', content: [selectedLocation?.address, `Lat: ${selectedLocation?.latitude?.toFixed(6)}, Lng: ${selectedLocation?.longitude?.toFixed(6)}`] },
                { title: 'Energy Usage', content: [`Profile: ${currentProfile}`, `Annual Usage: ${annualUsage} kWh`, `Annual Cost: ${annualCost} MAD`] },
                { title: 'Energy Provider', content: [selectedProvider?.name] },
                { title: 'Property Details', content: [`Roof Type: ${selectedRoofType}`, selectedRoofType === 'tilted' ? `Roof Tilt: ${selectedRoofTilt}°` : null, `Stories: ${selectedStories === 'custom' ? customStories : selectedStories}`].filter(Boolean) },
                { title: 'Solar System', content: [`Panel Points: ${placedPoints.length}`, `Estimated Panels: ${placedPoints.length * 3}`, `Estimated Capacity: ${(placedPoints.length * 3 * 0.350).toFixed(2)} kW`] },
              ].map((section, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <h3 className="font-display font-bold text-slate-800 mb-2">{section.title}</h3>
                  {section.content.map((line, j) => (
                    <p key={j} className="text-sm text-slate-600">{line}</p>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-8">
              <button type="button" onClick={() => prevStep(6)} className="btn-secondary"><ArrowLeft className="w-4 h-4 mr-2" /> Back</button>
              <button type="button" onClick={() => { submitForm(); setCurrentStep(7); }} disabled={createMutation.isPending} className="btn-eco px-8 py-3">
                <Send className="w-4 h-4 mr-2" />
                Submit Estimation
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Processing */}
        {currentStep === 7 && (
          <div className="card animate-slide-up">
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 text-center">AI Processing</h2>
            <div className="bg-gradient-to-br from-helio-50 to-slate-100 rounded-2xl p-10 border border-helio-200">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-solar-500 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-3 bg-gradient-to-br from-solar-100 to-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-4xl">☀️</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-display font-bold text-slate-900 mb-2">Analyzing Your Roof...</p>
                  <p className="text-slate-500">Our AI is detecting roof boundaries and calculating optimal panel placement</p>
                </div>
              </div>
              <div className="mt-8 space-y-4 max-w-md mx-auto">
                {[
                  { label: 'Uploading satellite image', done: true },
                  { label: 'Running SAM roof segmentation', loading: true },
                  { label: 'Calculating panel placement', pending: true },
                  { label: 'Generating results', pending: true },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center ${item.pending ? 'text-slate-400' : 'text-slate-700'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${item.done ? 'bg-eco-500 text-white' : item.loading ? 'bg-solar-500' : 'bg-slate-300 text-white'
                      }`}>
                      {item.done ? '✓' : item.loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : i + 1}
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-slate-400 mt-6">This may take 1-2 minutes...</p>
            </div>
          </div>
        )}

        {/* Step 8: AI Results */}
        {currentStep === 8 && visualizationData && (
          <div className="card animate-slide-up">
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-eco-100 rounded-xl"><Cpu className="w-5 h-5 text-eco-600" /></div>
              🤖 AI Roof Detection Results
            </h2>

            <div className="mb-6">
              <div className="bg-helio-50 border border-helio-200 rounded-xl p-4 mb-4">
                <h3 className="font-display font-bold text-helio-900 mb-2">Visual Transparency</h3>
                <p className="text-sm text-helio-800">
                  Below you can see what our AI detected. The <span className="font-semibold text-eco-600">green area</span> shows usable space for solar panels, and <span className="font-semibold text-red-600">red markers</span> indicate obstacles.
                </p>
              </div>

              <PolygonOverlay
                visualization={visualizationData}
                capturedImage={capturedRoofImage}
                onApprove={() => {
                  if (estimationId) {
                    navigate(`/estimations/${estimationId}`)
                  }
                }}
                onReject={() => {
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

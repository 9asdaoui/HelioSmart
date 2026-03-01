import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Sun, User, Mail, Phone, Lock, ArrowRight, Building, Briefcase, CheckCircle } from 'lucide-react'

const RegisterVendor = () => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    business_name: '',
    business_registration_number: '',
    tax_id: '',
    vendor_type: '',
    specializations: [],
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { register, registerAsVendor } = useAuth()
  const navigate = useNavigate()

  const vendorTypes = [
    { value: 'installer', label: 'Solar Installer', icon: '🔧' },
    { value: 'distributor', label: 'Equipment Distributor', icon: '📦' },
    { value: 'manufacturer', label: 'Manufacturer', icon: '🏭' },
    { value: 'consultant', label: 'Solar Consultant', icon: '💡' },
    { value: 'other', label: 'Other', icon: '🔗' },
  ]

  const specializationOptions = [
    'residential',
    'commercial',
    'utility-scale',
    'off-grid',
    'hybrid',
    'battery-storage',
  ]

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSpecializationChange = (spec) => {
    const updated = formData.specializations.includes(spec)
      ? formData.specializations.filter(s => s !== spec)
      : [...formData.specializations, spec]

    setFormData({
      ...formData,
      specializations: updated,
    })
  }

  const validateStep1 = () => {
    if (!formData.full_name || !formData.email || !formData.password) {
      setError('Please fill in all required fields')
      return false
    }
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match')
      return false
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!formData.business_name) {
      setError('Business name is required')
      return false
    }
    return true
  }

  const handleNext = () => {
    setError('')
    if (step === 1 && validateStep1()) {
      setStep(2)
    }
  }

  const handleBack = () => {
    setError('')
    setStep(1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep2()) return

    setIsLoading(true)
    setError('')

    const userResult = await register({
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      role: 'vendor',
    })

    if (!userResult.success) {
      setError(userResult.error)
      setIsLoading(false)
      return
    }

    const vendorResult = await registerAsVendor({
      business_name: formData.business_name,
      business_registration_number: formData.business_registration_number,
      tax_id: formData.tax_id,
      vendor_type: formData.vendor_type,
      specializations: formData.specializations,
    })

    if (vendorResult.success) {
      navigate('/vendor/dashboard')
    } else {
      setError(vendorResult.error)
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex animate-fade-in">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-5/12 hero-section items-center justify-center p-12 relative">
        <div className="relative z-10 max-w-sm text-center">
          <div className="inline-flex p-4 bg-gradient-to-br from-solar-400 to-primary-500 rounded-2xl shadow-glow mb-8">
            <Briefcase className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-display font-bold text-white mb-4">
            Become a Vendor
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Join our network of trusted solar professionals. List your products, reach more customers, and grow your business.
          </p>
          <div className="mt-10 space-y-3 text-left">
            {['List products & services', 'AI-powered catalog import', 'Reach solar customers', 'Analytics dashboard'].map((t, i) => (
              <div key={i} className="flex items-center space-x-3 text-slate-300">
                <CheckCircle className="w-4 h-4 text-eco-400 flex-shrink-0" />
                <span className="text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-solar-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-float animate-delay-300" />
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-lg">
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-solar-400 to-primary-500 rounded-xl flex items-center justify-center mr-3">
              <Sun className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-slate-900">HelioSmart</span>
          </div>

          <div className="mb-6">
            <h2 className="text-3xl font-display font-bold text-slate-900">Register as Vendor</h2>
            <p className="mt-1 text-slate-500">Step {step} of 2</p>
          </div>

          {/* Progress bar */}
          <div className="mb-8 flex items-center space-x-3">
            <div className="flex-1 flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= 1 ? 'bg-gradient-to-br from-solar-400 to-primary-500 text-white shadow-glow-sm' : 'bg-slate-200 text-slate-500'}`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${step > 1 ? 'bg-gradient-to-r from-solar-400 to-primary-500' : 'bg-slate-200'}`} />
            </div>
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= 2 ? 'bg-gradient-to-br from-solar-400 to-primary-500 text-white shadow-glow-sm' : 'bg-slate-200 text-slate-500'}`}>
                2
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-2 animate-slide-up">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {step === 1 ? (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="label">Full Name *</label>
                  <div className="input-group">
                    <User className="input-icon w-5 h-5" />
                    <input name="full_name" type="text" required value={formData.full_name} onChange={handleChange} className="input-field pl-11" placeholder="Your full name" />
                  </div>
                </div>
                <div>
                  <label className="label">Email *</label>
                  <div className="input-group">
                    <Mail className="input-icon w-5 h-5" />
                    <input name="email" type="email" required value={formData.email} onChange={handleChange} className="input-field pl-11" placeholder="you@company.com" />
                  </div>
                </div>
                <div>
                  <label className="label">Phone</label>
                  <div className="input-group">
                    <Phone className="input-icon w-5 h-5" />
                    <input name="phone" type="tel" value={formData.phone} onChange={handleChange} className="input-field pl-11" placeholder="+1 (555) 000-0000" />
                  </div>
                </div>
                <div>
                  <label className="label">Password *</label>
                  <div className="input-group">
                    <Lock className="input-icon w-5 h-5" />
                    <input name="password" type="password" required value={formData.password} onChange={handleChange} className="input-field pl-11" placeholder="Min 8 characters" />
                  </div>
                </div>
                <div>
                  <label className="label">Confirm Password *</label>
                  <div className="input-group">
                    <Lock className="input-icon w-5 h-5" />
                    <input name="confirm_password" type="password" required value={formData.confirm_password} onChange={handleChange} className="input-field pl-11" placeholder="Repeat password" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <label className="label">Business Name *</label>
                  <div className="input-group">
                    <Building className="input-icon w-5 h-5" />
                    <input name="business_name" type="text" required value={formData.business_name} onChange={handleChange} className="input-field pl-11" placeholder="Your company name" />
                  </div>
                </div>
                <div>
                  <label className="label">Registration Number</label>
                  <input name="business_registration_number" type="text" value={formData.business_registration_number} onChange={handleChange} className="input-field" placeholder="e.g., RC 123456" />
                </div>
                <div>
                  <label className="label">Tax ID</label>
                  <input name="tax_id" type="text" value={formData.tax_id} onChange={handleChange} className="input-field" placeholder="e.g., IF 123456789" />
                </div>
                <div>
                  <label className="label">Vendor Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {vendorTypes.map(type => (
                      <div
                        key={type.value}
                        onClick={() => setFormData({ ...formData, vendor_type: type.value })}
                        className={`cursor-pointer rounded-xl p-3 text-center transition-all duration-200 border-2 ${formData.vendor_type === type.value
                            ? 'border-solar-400 bg-solar-50 shadow-glow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                      >
                        <div className="text-2xl mb-1">{type.icon}</div>
                        <div className="text-xs font-semibold text-slate-700">{type.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Specializations</label>
                  <div className="flex flex-wrap gap-2">
                    {specializationOptions.map(spec => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => handleSpecializationChange(spec)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200 ${formData.specializations.includes(spec)
                            ? 'bg-gradient-to-r from-solar-400 to-primary-500 text-white border-transparent shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-solar-300'
                          }`}
                      >
                        {spec.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {step === 2 && (
                <button type="button" onClick={handleBack} className="btn-secondary flex-1">
                  Back
                </button>
              )}

              {step === 1 ? (
                <button type="button" onClick={handleNext} className="btn-primary flex-1 py-3">
                  <span className="flex items-center justify-center">
                    Next <ArrowRight className="w-5 h-5 ml-2" />
                  </span>
                </button>
              ) : (
                <button type="submit" disabled={isLoading} className="btn-eco flex-1 py-3">
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <span className="spinner mr-2"></span>
                      Creating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      Complete Registration <CheckCircle className="w-5 h-5 ml-2" />
                    </span>
                  )}
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm font-semibold text-primary-600 hover:text-primary-500 transition-colors">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterVendor

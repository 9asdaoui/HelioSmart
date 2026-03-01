import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Sun, User, Mail, Phone, Lock, ArrowRight } from 'lucide-react'

const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setIsLoading(true)

    const result = await register({
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      role: 'user',
    })

    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex animate-fade-in">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 hero-section items-center justify-center p-12 relative">
        <div className="relative z-10 max-w-md text-center">
          <div className="inline-flex p-4 bg-gradient-to-br from-solar-400 to-primary-500 rounded-2xl shadow-glow mb-8">
            <Sun className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-4xl font-display font-bold text-white mb-4">
            Join HelioSmart
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed">
            Create your free account and start estimating solar energy production with AI-powered tools.
          </p>
          <div className="mt-10 space-y-3">
            {['AI-powered roof detection', 'Instant production estimates', 'Financial projections & ROI'].map((t, i) => (
              <div key={i} className="flex items-center space-x-3 text-slate-300">
                <div className="w-5 h-5 rounded-full bg-eco-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-eco-400 text-xs">✓</span>
                </div>
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
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-solar-400 to-primary-500 rounded-xl flex items-center justify-center mr-3">
              <Sun className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-slate-900">HelioSmart</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900">
              Create your account
            </h2>
            <p className="mt-2 text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-500 transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-2 animate-slide-up">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="full_name" className="label">Full Name</label>
              <div className="input-group">
                <User className="input-icon w-5 h-5" />
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  className="input-field pl-11"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="label">Email</label>
              <div className="input-group">
                <Mail className="input-icon w-5 h-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field pl-11"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="label">Phone (optional)</label>
              <div className="input-group">
                <Phone className="input-icon w-5 h-5" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field pl-11"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="input-group">
                <Lock className="input-icon w-5 h-5" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-11"
                  placeholder="Min 8 characters"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm_password" className="label">Confirm Password</label>
              <div className="input-group">
                <Lock className="input-icon w-5 h-5" />
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className="input-field pl-11"
                  placeholder="Repeat password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <span className="spinner mr-2"></span>
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Create account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </span>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            By registering, you agree to our{' '}
            <Link to="/terms" className="text-primary-600 hover:text-primary-500 font-medium">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-primary-600 hover:text-primary-500 font-medium">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Sun, Mail, Lock, ArrowRight, Store } from 'lucide-react'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/'

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const result = await login(formData.email, formData.password)

    if (result.success) {
      navigate(from, { replace: true })
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
            Welcome Back
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed">
            Access your solar estimation dashboard, manage projects, and analyze production data.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: 'Projects', value: '500+' },
              { label: 'Accuracy', value: '99%' },
              { label: 'Vendors', value: '50+' },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-slate-400">{s.label}</div>
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
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-solar-400 to-primary-500 rounded-xl flex items-center justify-center mr-3">
              <Sun className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-slate-900">HelioSmart</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900">
              Sign in
            </h2>
            <p className="mt-2 text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-500 transition-colors">
                Create one free
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-2 animate-slide-up">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <div className="input-group">
                <Mail className="input-icon w-5 h-5" />
                <input
                  id="email"
                  name="email"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field pl-11"
                  placeholder="you@company.com"
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
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-solar-500 focus:ring-solar-400 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-slate-600">
                  Remember me
                </label>
              </div>
              <Link to="/forgot-password" className="text-sm font-semibold text-primary-600 hover:text-primary-500 transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <span className="spinner mr-2"></span>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Sign in
                  <ArrowRight className="w-5 h-5 ml-2" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-slate-500">
                  Want to become a vendor?
                </span>
              </div>
            </div>

            <Link
              to="/register-vendor"
              className="mt-4 btn-secondary w-full justify-center"
            >
              <Store className="w-4 h-4 mr-2" />
              Register as Vendor
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

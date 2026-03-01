import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sun, Mail, Lock, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(form.email, form.password)
      navigate(data.role === 'vendor' || data.role === 'admin' ? '/vendor' : '/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all'

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-violet-800/10 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="bg-[#0d1f35] border border-white/[0.08] rounded-2xl p-8 shadow-2xl shadow-black/60">
          {/* Top accent line */}
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 blur-lg opacity-50" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl flex items-center justify-center">
                <Sun className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">Sign in to HelioSmart</h1>
            <p className="text-slate-500 text-sm mt-1">Welcome back</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="email" required value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com" className={inputCls} />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="password" required value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••" className={inputCls} />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all mt-2 shadow-lg shadow-violet-900/40"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <LogIn className="w-4 h-4" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="border-t border-white/5 mt-6 pt-5 space-y-2 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-violet-400 font-medium hover:text-violet-300 transition-colors">Register</Link>
            </p>
            <p className="text-sm text-slate-600">
              Are you a supplier?{' '}
              <Link to="/register?role=vendor" className="text-amber-400 font-medium hover:text-amber-300 transition-colors">Register as Vendor</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

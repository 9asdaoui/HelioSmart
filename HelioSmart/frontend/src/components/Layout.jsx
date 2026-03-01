import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Sun, Home, FileText, Box, Zap, Building, Settings, Plus,
  ChevronDown, ShoppingBag, User, LogOut, Building2, Menu, X, Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, isVendor } = useAuth()
  const [showAdminMenu, setShowAdminMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const isActive   = (path) => location.pathname === path
  const isAdminPath = location.pathname.startsWith('/admin')
  const isChatbot   = location.pathname === '/chatbot'
  const isCreateEst = location.pathname === '/estimations/create'

  const handleLogout = () => { logout(); setShowUserMenu(false); navigate('/') }

  // Focus mode: no nav/footer for the create estimation wizard
  if (isCreateEst) {
    return <div className="min-h-screen bg-[#faf9f6]">{children}</div>
  }

  const adminItems = [
    { path: '/admin/panels',         label: 'Panels',    icon: Box },
    { path: '/admin/inverters',      label: 'Inverters', icon: Zap },
    { path: '/admin/utilities',      label: 'Utilities', icon: Building },
    { path: '/admin/configurations', label: 'Settings',  icon: Settings },
  ]

  return (
    <div className={isChatbot ? 'h-screen flex flex-col overflow-hidden bg-[#07111f]' : 'min-h-screen flex flex-col bg-[#faf9f6]'}>

      {/* Ambient warm sun glow */}
      {!isChatbot && (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[250px] bg-amber-400/10 blur-[120px] pointer-events-none z-0" />
      )}

      {/* ─── Navbar ─────────────────────────────────────────────────── */}
      <header className={isChatbot
        ? 'sticky top-0 z-50 bg-[#07111f]/90 backdrop-blur-md border-b border-white/[0.06]'
        : 'sticky top-0 z-50 bg-[#faf9f6]/95 backdrop-blur-md border-b border-gray-100'
      }>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200">
                <Sun style={{ width: 17, height: 17 }} className="text-white" />
              </div>
              <span className={`text-[15px] font-bold tracking-tight ${isChatbot ? 'text-white' : 'text-gray-900'}`}>HelioSmart</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5">
              {[
                { to: '/',            label: 'Home',        Icon: Home },
                { to: '/estimations', label: 'Estimations', Icon: FileText },
                { to: '/chatbot',     label: 'AI Chat',     Icon: Sparkles },
                { to: '/marketplace', label: 'Solar Products', Icon: ShoppingBag },
              ].map(({ to, label, Icon }) => (
                <Link key={to} to={to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isChatbot
                      ? isActive(to) ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                      : isActive(to) ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" /><span>{label}</span>
                </Link>
              ))}

              {/* New Estimation CTA */}
              <Link to="/estimations/create"
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ml-1 transition-all ${
                  isChatbot
                    ? 'bg-gradient-to-r from-violet-600 to-purple-700 text-white hover:from-violet-500 hover:to-purple-600 shadow-lg shadow-violet-900/40'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-md shadow-amber-200'
                } ${isActive('/estimations/create') ? 'ring-2 ring-orange-300' : ''}`}
              >
                <Plus className="w-4 h-4" /><span>New</span>
              </Link>


            </nav>

            {/* Auth area */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <div className="relative">
                  <button onClick={() => setShowUserMenu(!showUserMenu)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-colors ${
                      isChatbot ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="max-w-[130px] truncate">{user.email}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showUserMenu && (
                    <div className={`absolute right-0 mt-2 w-52 rounded-xl shadow-xl py-1.5 z-50 ${
                      isChatbot ? 'bg-[#0d1f35] border border-white/10 shadow-black/60' : 'bg-white border border-gray-100 shadow-gray-200/80'
                    }`}>
                      <div className={`px-4 py-2 mb-1 ${
                        isChatbot ? 'border-b border-white/5' : 'border-b border-gray-100'
                      }`}>
                        <p className={`text-xs truncate ${isChatbot ? 'text-slate-500' : 'text-gray-400'}`}>{user.email}</p>
                        {user.company_name && <p className="text-xs text-amber-500 font-medium mt-0.5">{user.company_name}</p>}
                      </div>
                      {isVendor && (
                        <Link to="/vendor" onClick={() => setShowUserMenu(false)}
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-500 transition-colors ${
                            isChatbot ? 'hover:bg-white/5' : 'hover:bg-amber-50'
                          }`}
                        >
                          <Building2 className="w-4 h-4" /> Vendor Dashboard
                        </Link>
                      )}
                      <button onClick={handleLogout}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 transition-colors ${
                          isChatbot ? 'hover:bg-red-900/20' : 'hover:bg-red-50'
                        }`}
                      >
                        <LogOut className="w-4 h-4" /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login"
                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                      isChatbot ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >Sign in</Link>
                  <Link to="/register?role=vendor"
                    className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl transition-all shadow-md shadow-amber-200"
                  >List Products</Link>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setShowMobileMenu(!showMobileMenu)}
              className={`md:hidden p-2 rounded-xl transition-colors ${
                isChatbot ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Mobile Menu ─────────────────────────────────────────────── */}
      {showMobileMenu && (
        <div className={`md:hidden fixed inset-0 top-[57px] z-40 overflow-y-auto ${
          isChatbot ? 'bg-[#07111f]/98 backdrop-blur-md' : 'bg-white border-t border-gray-100'
        }`}>
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {[
              { to: '/',                   label: 'Home',           Icon: Home },
              { to: '/estimations',        label: 'Estimations',    Icon: FileText },
              { to: '/estimations/create', label: 'New Estimation', Icon: Plus },
              { to: '/chatbot',            label: 'AI Chatbot',     Icon: Sparkles },
              { to: '/marketplace',        label: 'Solar Products', Icon: ShoppingBag },
            ].map(({ to, label, Icon }) => (
              <Link key={to} to={to} onClick={() => setShowMobileMenu(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isChatbot
                    ? isActive(to) ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    : isActive(to) ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </Link>
            ))}

            <div className={`border-t mt-2 pt-2 ${isChatbot ? 'border-white/5' : 'border-gray-100'}`}>
              {user ? (
                <>
                  {isVendor && (
                    <Link to="/vendor" onClick={() => setShowMobileMenu(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-amber-500 font-medium ${
                        isChatbot ? 'hover:bg-white/5' : 'hover:bg-amber-50'
                      }`}
                    >
                      <Building2 className="w-4 h-4" /> Vendor Dashboard
                    </Link>
                  )}
                  <button onClick={() => { handleLogout(); setShowMobileMenu(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-500 font-medium ${
                      isChatbot ? 'hover:bg-red-900/20' : 'hover:bg-red-50'
                    }`}
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 px-2 pb-2">
                  <Link to="/login" onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      isChatbot ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <User className="w-4 h-4" /> Sign in
                  </Link>
                  <Link to="/register?role=vendor" onClick={() => setShowMobileMenu(false)}
                    className="flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-xl text-sm font-medium text-white"
                  >
                    <Building2 className="w-4 h-4" /> List Products
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* ─── Main Content ─────────────────────────────────────────────── */}
      <main className={isChatbot ? 'flex-1 min-h-0 overflow-hidden relative z-10' : 'flex-1 container mx-auto px-4 pb-8 relative z-10'}>
        {children}
      </main>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      {!isChatbot && (
        <footer className="border-t border-gray-100 bg-white relative z-10">
          <div className="container mx-auto px-4 py-10">
            <div className="grid md:grid-cols-3 gap-10 mb-8">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                    <Sun className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-gray-900">HelioSmart</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Morocco's professional solar energy platform — AI-powered estimations, a verified supplier marketplace, and a multilingual smart chatbot.
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Platform</h4>
                <div className="flex flex-col gap-2.5">
                  {[['/', 'Home'], ['/estimations/create', 'New Estimation'], ['/estimations', 'My Estimations'], ['/marketplace', 'Marketplace'], ['/chatbot', 'AI Chatbot']].map(([to, label]) => (
                    <Link key={to} to={to} className="text-sm text-gray-400 hover:text-gray-900 transition-colors">{label}</Link>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">For Vendors</h4>
                <div className="flex flex-col gap-2.5">
                  <Link to="/register?role=vendor" className="text-sm text-amber-500 hover:text-amber-600 transition-colors">Register as Vendor</Link>
                  <Link to="/vendor" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">Vendor Dashboard</Link>
                  <Link to="/marketplace" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">Browse Products</Link>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
              <p className="text-sm text-gray-400">© 2026 HelioSmart. All rights reserved.</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-xs text-gray-400">Built for Morocco's solar market</p>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

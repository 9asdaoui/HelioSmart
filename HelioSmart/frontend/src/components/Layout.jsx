import { Link, useLocation } from 'react-router-dom'
import { Sun, Home, FileText, Box, Zap, Building, Settings, Plus, ChevronDown, Users, Store, UserCircle, LogOut, Menu, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const location = useLocation()
  const [showAdminMenu, setShowAdminMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, isAuthenticated, isVendor, isAdmin, logout } = useAuth()

  const adminRef = useRef(null)
  const userRef = useRef(null)

  const isActive = (path) => location.pathname === path
  const isAdminPath = location.pathname.startsWith('/admin')
  const isVendorPath = location.pathname.startsWith('/vendor')

  // Close dropdowns on click outside
  useEffect(() => {
    const handler = (e) => {
      if (adminRef.current && !adminRef.current.contains(e.target)) setShowAdminMenu(false)
      if (userRef.current && !userRef.current.contains(e.target)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Track scroll for header shadow
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const adminItems = isAdmin ? [
    { path: '/admin', label: 'Dashboard', icon: Settings },
    { path: '/admin/panels', label: 'Panels', icon: Box },
    { path: '/admin/inverters', label: 'Inverters', icon: Zap },
    { path: '/admin/utilities', label: 'Utilities', icon: Building },
    { path: '/admin/configurations', label: 'Settings', icon: Settings },
  ] : [
    { path: '/admin/panels', label: 'Panels', icon: Box },
    { path: '/admin/inverters', label: 'Inverters', icon: Zap },
    { path: '/admin/utilities', label: 'Utilities', icon: Building },
    { path: '/admin/configurations', label: 'Settings', icon: Settings },
  ]

  const handleLogout = async () => {
    await logout()
    window.location.href = '/'
  }

  const navLinkClass = (active) =>
    active ? 'nav-link-active' : 'nav-link'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-glass border-b border-slate-200/50'
          : 'bg-white/60 backdrop-blur-md border-b border-transparent'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="relative">
                <div className="w-9 h-9 bg-gradient-to-br from-solar-400 to-primary-500 rounded-xl flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow duration-300">
                  <Sun className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-solar-400/20 to-primary-500/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <span className="text-xl font-display font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                HelioSmart
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link to="/" className={navLinkClass(isActive('/'))}>
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>

              <Link to="/estimations" className={navLinkClass(isActive('/estimations'))}>
                <FileText className="w-4 h-4" />
                <span>Estimations</span>
              </Link>

              <Link to="/vendors" className={navLinkClass(location.pathname.startsWith('/vendors'))}>
                <Store className="w-4 h-4" />
                <span>Vendors</span>
              </Link>

              <Link
                to="/estimations/create"
                className="relative flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-eco-500 to-eco-600 hover:from-eco-600 hover:to-eco-700 shadow-md hover:shadow-glow-eco transition-all duration-300 active:scale-[0.97]"
              >
                <Plus className="w-4 h-4" />
                <span>New Estimation</span>
              </Link>

              {/* Vendor Link (only for vendors) */}
              {isVendor && (
                <Link
                  to="/vendor/dashboard"
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${isVendorPath
                      ? 'bg-gradient-to-r from-primary-500 to-solar-500 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  <Store className="w-4 h-4" />
                  <span>My Vendor</span>
                </Link>
              )}

              {/* Admin Dropdown (only for admin/engineer) */}
              {(isAdmin || user?.role === 'engineer') && (
                <div className="relative" ref={adminRef}>
                  <button
                    onClick={() => setShowAdminMenu(!showAdminMenu)}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${isAdminPath
                        ? 'bg-gradient-to-r from-helio-600 to-helio-700 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Admin</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdminMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showAdminMenu && (
                    <div className="dropdown-menu">
                      {adminItems.map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className="dropdown-item"
                            onClick={() => setShowAdminMenu(false)}
                          >
                            <Icon className="w-4 h-4 text-slate-400" />
                            <span>{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* User Menu */}
              {isAuthenticated ? (
                <div className="relative" ref={userRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-200 hover:bg-slate-100 ml-1"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-solar-400 to-primary-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                      {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="font-medium text-slate-700 text-sm">{user?.full_name?.split(' ')[0]}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showUserMenu && (
                    <div className="dropdown-menu">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-800">{user?.full_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        className="dropdown-item"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <UserCircle className="w-4 h-4 text-slate-400" />
                        <span>Profile</span>
                      </Link>
                      {!isVendor && (
                        <Link
                          to="/register-vendor"
                          className="dropdown-item"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Store className="w-4 h-4 text-slate-400" />
                          <span>Become a Vendor</span>
                        </Link>
                      )}
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            handleLogout()
                          }}
                          className="dropdown-item text-red-600 hover:bg-red-50 w-full"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2 ml-2">
                  <Link
                    to="/login"
                    className="btn-ghost text-sm"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary text-sm"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200 animate-slide-up">
            <div className="px-4 py-4 space-y-1">
              <Link to="/" className={navLinkClass(isActive('/'))}>
                <Home className="w-4 h-4" /><span>Home</span>
              </Link>
              <Link to="/estimations" className={navLinkClass(isActive('/estimations'))}>
                <FileText className="w-4 h-4" /><span>Estimations</span>
              </Link>
              <Link to="/vendors" className={navLinkClass(location.pathname.startsWith('/vendors'))}>
                <Store className="w-4 h-4" /><span>Vendors</span>
              </Link>
              <Link to="/estimations/create" className="btn-eco w-full justify-center mt-2">
                <Plus className="w-4 h-4 mr-2" /><span>New Estimation</span>
              </Link>
              {isVendor && (
                <Link to="/vendor/dashboard" className={navLinkClass(isVendorPath)}>
                  <Store className="w-4 h-4" /><span>My Vendor</span>
                </Link>
              )}
              {(isAdmin || user?.role === 'engineer') && adminItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.path} to={item.path} className="nav-link">
                    <Icon className="w-4 h-4" /><span>{item.label}</span>
                  </Link>
                )
              })}
              {!isAuthenticated && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <Link to="/login" className="btn-secondary w-full justify-center">Sign In</Link>
                  <Link to="/register" className="btn-primary w-full justify-center">Get Started</Link>
                </div>
              )}
              {isAuthenticated && (
                <div className="pt-3 border-t border-slate-200">
                  <button onClick={handleLogout} className="nav-link text-red-600 w-full">
                    <LogOut className="w-4 h-4" /><span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative bg-slate-900 text-white overflow-hidden">
        {/* Gradient top border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-solar-400/50 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2.5 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-solar-400 to-primary-500 rounded-xl flex items-center justify-center shadow-glow-sm">
                  <Sun className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-display font-bold text-white">HelioSmart</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Intelligent solar energy estimation platform powered by AI for accurate, data-driven installations.
              </p>
            </div>

            <div>
              <h3 className="font-display font-semibold mb-4 text-sm uppercase tracking-wider text-slate-300">Quick Links</h3>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link to="/" className="hover:text-solar-400 transition-colors">Home</Link></li>
                <li><Link to="/estimations" className="hover:text-solar-400 transition-colors">Estimations</Link></li>
                <li><Link to="/vendors" className="hover:text-solar-400 transition-colors">Vendors</Link></li>
                <li><Link to="/estimations/create" className="hover:text-solar-400 transition-colors">New Estimation</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-display font-semibold mb-4 text-sm uppercase tracking-wider text-slate-300">For Vendors</h3>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link to="/register-vendor" className="hover:text-solar-400 transition-colors">Register as Vendor</Link></li>
                <li><Link to="/vendor/dashboard" className="hover:text-solar-400 transition-colors">Vendor Dashboard</Link></li>
                <li><Link to="/vendors" className="hover:text-solar-400 transition-colors">Browse Vendors</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-display font-semibold mb-4 text-sm uppercase tracking-wider text-slate-300">Contact</h3>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li className="flex items-center space-x-2">
                  <span>✉️</span><span>support@heliosmart.com</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>📞</span><span>+1 (555) 123-4567</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-10 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} HelioSmart. All rights reserved.</p>
            <p className="mt-2 md:mt-0">Powered by AI &middot; Built for Solar Professionals</p>
          </div>
        </div>

        {/* Background decorative elements */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-solar-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-helio-500/5 to-transparent rounded-full blur-3xl" />
      </footer>
    </div>
  )
}

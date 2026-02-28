import { Link, useLocation } from 'react-router-dom'
import { Sun, Home, FileText, Box, Zap, Building, Settings, Plus, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function Layout({ children }) {
  const location = useLocation()
  const [showAdminMenu, setShowAdminMenu] = useState(false)
  
  const isActive = (path) => location.pathname === path
  const isAdminPath = location.pathname.startsWith('/admin')
  
  const adminItems = [
    { path: '/admin/panels', label: 'Panels', icon: Box },
    { path: '/admin/inverters', label: 'Inverters', icon: Zap },
    { path: '/admin/utilities', label: 'Utilities', icon: Building },
    { path: '/admin/configurations', label: 'Settings', icon: Settings },
  ]
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Sun className="w-8 h-8 text-primary-600" />
              <span className="text-2xl font-bold text-gray-800">HelioSmart</span>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                to="/"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/')
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Home</span>
              </Link>
              
              <Link
                to="/estimations"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/estimations')
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">Estimations</span>
              </Link>
              
              <Link
                to="/estimations/create"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors bg-green-600 text-white hover:bg-green-700 ${
                  isActive('/estimations/create') ? 'ring-2 ring-green-300' : ''
                }`}
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">New Estimation</span>
              </Link>
              
              {/* Admin Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isAdminPath
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Admin</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdminMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {showAdminMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    {adminItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowAdminMenu(false)}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-gray-600">
            &copy; 2025 HelioSmart. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

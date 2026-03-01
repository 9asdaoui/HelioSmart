import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Shield, Store, ArrowLeft } from 'lucide-react'

const ProtectedRoute = ({
  children,
  requireAuth = true,
  allowedRoles = [],
  requireVendor = false,
  requireAdmin = false
}) => {
  const { isAuthenticated, isLoading, user, isVendor, isAdmin } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center max-w-md">
          <div className="inline-flex p-4 bg-red-50 rounded-2xl mb-6">
            <Shield className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500 mb-6">You don't have permission to access this page.</p>
          <button onClick={() => window.history.back()} className="btn-primary">
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </button>
        </div>
      </div>
    )
  }

  if (requireVendor && !isVendor && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center max-w-md">
          <div className="inline-flex p-4 bg-solar-50 rounded-2xl mb-6">
            <Store className="w-10 h-10 text-solar-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Vendor Access Required</h2>
          <p className="text-slate-500 mb-6">This page is only accessible to registered vendors.</p>
          <div className="flex gap-3 justify-center">
            <a href="/register-vendor" className="btn-primary">
              Register as Vendor
            </a>
            <button onClick={() => window.history.back()} className="btn-secondary">
              <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center max-w-md">
          <div className="inline-flex p-4 bg-helio-50 rounded-2xl mb-6">
            <Shield className="w-10 h-10 text-helio-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Admin Access Required</h2>
          <p className="text-slate-500 mb-6">This page is only accessible to administrators.</p>
          <button onClick={() => window.history.back()} className="btn-primary">
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </button>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute

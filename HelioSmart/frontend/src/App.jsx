import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Home from './pages/Home'
import Estimations from './pages/Estimations'
import CreateEstimation from './pages/CreateEstimation'
import EstimationDetails from './pages/EstimationDetails'
import Panels from './pages/Panels'
import Inverters from './pages/Inverters'
import Utilities from './pages/Utilities'
import Configurations from './pages/Configurations'
import Login from './pages/Login'
import Register from './pages/Register'
import RegisterVendor from './pages/RegisterVendor'
import VendorDashboard from './pages/VendorDashboard'
import VendorList from './pages/VendorList'
import VendorDetails from './pages/VendorDetails'
import AdminDashboard from './pages/AdminDashboard'
import CatalogImport from './pages/CatalogImport'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/estimations" element={<Estimations />} />
            <Route path="/estimations/create" element={<CreateEstimation />} />
            <Route path="/estimations/:id" element={<EstimationDetails />} />
            
            {/* Vendor public routes */}
            <Route path="/vendors" element={<VendorList />} />
            <Route path="/vendors/:vendorId" element={<VendorDetails />} />
            
            {/* Auth routes (redirect if already logged in) */}
            <Route path="/login" element={
              <ProtectedRoute requireAuth={false}>
                <Login />
              </ProtectedRoute>
            } />
            <Route path="/register" element={
              <ProtectedRoute requireAuth={false}>
                <Register />
              </ProtectedRoute>
            } />
            <Route path="/register-vendor" element={
              <ProtectedRoute requireAuth={false}>
                <RegisterVendor />
              </ProtectedRoute>
            } />
            
            {/* Vendor protected routes */}
            <Route path="/vendor/dashboard" element={
              <ProtectedRoute requireVendor={true}>
                <VendorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/vendor/catalog-import" element={
              <ProtectedRoute requireVendor={true}>
                <CatalogImport />
              </ProtectedRoute>
            } />
            
            {/* Admin CRUD routes (require admin role) */}
            <Route path="/admin/panels" element={
              <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                <Panels />
              </ProtectedRoute>
            } />
            <Route path="/admin/inverters" element={
              <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                <Inverters />
              </ProtectedRoute>
            } />
            <Route path="/admin/utilities" element={
              <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                <Utilities />
              </ProtectedRoute>
            } />
            <Route path="/admin/configurations" element={
              <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                <Configurations />
              </ProtectedRoute>
            } />
            
            {/* Legacy routes for backward compatibility */}
            <Route path="/panels" element={
              <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                <Panels />
              </ProtectedRoute>
            } />
            <Route path="/inverters" element={
              <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                <Inverters />
              </ProtectedRoute>
            } />
            <Route path="/utilities" element={
              <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                <Utilities />
              </ProtectedRoute>
            } />
            <Route path="/configurations" element={
              <ProtectedRoute allowedRoles={['admin', 'engineer']}>
                <Configurations />
              </ProtectedRoute>
            } />
            
            {/* Admin Dashboard */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  )
}

export default App

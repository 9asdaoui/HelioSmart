import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Estimations from './pages/Estimations'
import CreateEstimation from './pages/CreateEstimation'
import EstimationDetails from './pages/EstimationDetails'
import Panels from './pages/Panels'
import Inverters from './pages/Inverters'
import Utilities from './pages/Utilities'
import Configurations from './pages/Configurations'
import Chatbot from './pages/Chatbot'
import Marketplace from './pages/Marketplace'
import VendorDashboard from './pages/VendorDashboard'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <Router>
      <AuthProvider>
      <Layout>
        <Routes>
          {/* Customer-facing routes */}
          <Route path="/" element={<Home />} />
          <Route path="/estimations" element={<Estimations />} />
          <Route path="/estimations/create" element={<CreateEstimation />} />
          <Route path="/estimations/:id" element={<EstimationDetails />} />
          <Route path="/chatbot" element={<Chatbot />} />
          
          {/* Marketplace + Auth */}
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/vendor" element={<VendorDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin CRUD routes */}
          <Route path="/admin/panels" element={<Panels />} />
          <Route path="/admin/inverters" element={<Inverters />} />
          <Route path="/admin/utilities" element={<Utilities />} />
          <Route path="/admin/configurations" element={<Configurations />} />
          
          {/* Legacy routes for backward compatibility */}
          <Route path="/panels" element={<Panels />} />
          <Route path="/inverters" element={<Inverters />} />
          <Route path="/utilities" element={<Utilities />} />
          <Route path="/configurations" element={<Configurations />} />
        </Routes>
      </Layout>
      </AuthProvider>
    </Router>
  )
}

export default App

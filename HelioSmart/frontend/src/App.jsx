import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Estimations from './pages/Estimations'
import CreateEstimation from './pages/CreateEstimation'
import EstimationDetails from './pages/EstimationDetails'
import Panels from './pages/Panels'
import Inverters from './pages/Inverters'
import Utilities from './pages/Utilities'
import Configurations from './pages/Configurations'
import Chatbot from './pages/Chatbot'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Customer-facing routes */}
          <Route path="/" element={<Home />} />
          <Route path="/estimations" element={<Estimations />} />
          <Route path="/estimations/create" element={<CreateEstimation />} />
          <Route path="/estimations/:id" element={<EstimationDetails />} />
          <Route path="/chatbot" element={<Chatbot />} />
          
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
    </Router>
  )
}

export default App

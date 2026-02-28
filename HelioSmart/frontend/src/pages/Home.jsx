import { Link } from 'react-router-dom'
import { Sun, FileText, TrendingUp, Zap } from 'lucide-react'

export default function Home() {
  const features = [
    {
      icon: FileText,
      title: 'Solar Estimations',
      description: 'Create detailed solar panel installation estimates with precise calculations',
      link: '/estimations',
    },
    {
      icon: Sun,
      title: 'Panel Management',
      description: 'Manage your solar panel inventory with comprehensive specifications',
      link: '/panels',
    },
    {
      icon: Zap,
      title: 'Inverter Selection',
      description: 'Choose the best inverter for your solar installation needs',
      link: '/inverters',
    },
    {
      icon: TrendingUp,
      title: 'Production Analysis',
      description: 'Analyze energy production with PVWatts integration',
      link: '/estimations/create',
    },
  ]
  
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <Sun className="w-20 h-20 text-primary-600" />
        </div>
        <h1 className="text-5xl font-bold text-gray-800">
          Welcome to HelioSmart
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Professional solar energy estimation platform for accurate, data-driven solar installations
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/estimations/create"
            className="btn-primary text-lg px-8 py-3"
          >
            Create Estimation
          </Link>
          <Link
            to="/estimations"
            className="btn-secondary text-lg px-8 py-3"
          >
            View Projects
          </Link>
        </div>
      </div>
      
      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <Link
              key={index}
              to={feature.link}
              className="card hover:shadow-xl transition-shadow cursor-pointer group"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-primary-100 rounded-full group-hover:bg-primary-200 transition-colors">
                  <Icon className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
      
      {/* Stats Section */}
      <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold mb-2">100+</div>
            <div className="text-primary-100">Panel Options</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">50+</div>
            <div className="text-primary-100">Inverter Models</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">Accurate</div>
            <div className="text-primary-100">Production Estimates</div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Sun, FileText, TrendingUp, Zap, ArrowRight, Shield, Cpu, BarChart3, Users } from 'lucide-react'

export default function Home() {
  const features = [
    {
      icon: FileText,
      title: 'Solar Estimations',
      description: 'Create detailed solar panel installation estimates with precise AI-powered calculations',
      link: '/estimations',
      color: 'from-solar-400 to-primary-500',
    },
    {
      icon: Sun,
      title: 'Panel Management',
      description: 'Manage your solar panel inventory with comprehensive specifications and tracking',
      link: '/panels',
      color: 'from-primary-400 to-primary-600',
    },
    {
      icon: Zap,
      title: 'Inverter Selection',
      description: 'Choose the best inverter for your solar installation with smart recommendations',
      link: '/inverters',
      color: 'from-eco-400 to-eco-600',
    },
    {
      icon: TrendingUp,
      title: 'Production Analysis',
      description: 'Analyze energy production with PVWatts integration and AI forecasting',
      link: '/estimations/create',
      color: 'from-helio-400 to-helio-600',
    },
  ]

  const steps = [
    { num: '01', title: 'Capture Location', desc: 'Pinpoint your property on satellite view and capture roof imagery' },
    { num: '02', title: 'AI Analysis', desc: 'Our AI detects roof boundaries and calculates optimal panel placement' },
    { num: '03', title: 'Get Results', desc: 'Receive detailed production estimates, financial projections, and ROI analysis' },
  ]

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="hero-section py-20 md:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8 animate-slide-up">
              <div className="w-2 h-2 bg-eco-400 rounded-full animate-pulse" />
              <span className="text-sm text-slate-300 font-medium">AI-Powered Solar Estimation Platform</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6 animate-slide-up">
              <span className="text-white">Smart Solar</span>
              <br />
              <span className="bg-gradient-to-r from-solar-300 via-solar-400 to-primary-400 bg-clip-text text-transparent">
                Starts Here
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up animate-delay-100">
              Professional solar energy estimation platform for accurate, data-driven installations. Powered by AI roof detection and real-time production analysis.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-slide-up animate-delay-200">
              <Link
                to="/estimations/create"
                className="btn-primary text-lg px-8 py-4 shadow-glow"
              >
                <Sun className="w-5 h-5 mr-2" />
                Create Estimation
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                to="/estimations"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
              >
                View Projects
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative floating elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-solar-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-float animate-delay-300" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-helio-500/5 rounded-full blur-3xl" />
      </section>

      {/* Features Grid */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-header">Everything You Need</h2>
            <p className="section-subtitle mx-auto">Comprehensive tools for solar professionals and homeowners</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Link
                  key={index}
                  to={feature.link}
                  className="card-hover group cursor-pointer"
                >
                  <div className="flex flex-col items-start space-y-4">
                    <div className={`p-3 bg-gradient-to-br ${feature.color} rounded-xl text-white shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-display font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {feature.description}
                    </p>
                    <span className="text-sm font-semibold text-primary-500 flex items-center group-hover:translate-x-1 transition-transform">
                      Learn more <ArrowRight className="w-4 h-4 ml-1" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-slate-50/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-header">How It Works</h2>
            <p className="section-subtitle mx-auto">Three simple steps to your solar estimation</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                <div className="card-hover text-center">
                  <div className="text-5xl font-display font-bold gradient-text mb-4">{step.num}</div>
                  <h3 className="text-lg font-display font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500">{step.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-solar-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hero-section rounded-3xl p-10 md:p-14 relative overflow-hidden">
            <div className="relative z-10">
              <div className="grid md:grid-cols-4 gap-8">
                {[
                  { icon: Sun, value: '100+', label: 'Panel Options', color: 'from-solar-300 to-solar-500' },
                  { icon: Zap, value: '50+', label: 'Inverter Models', color: 'from-primary-300 to-primary-500' },
                  { icon: Cpu, value: 'AI', label: 'Roof Detection', color: 'from-eco-300 to-eco-500' },
                  { icon: BarChart3, value: '99%', label: 'Accuracy Rate', color: 'from-helio-300 to-helio-500' },
                ].map((stat, i) => {
                  const Icon = stat.icon
                  return (
                    <div key={i} className="text-center group">
                      <div className={`inline-flex p-3 bg-gradient-to-br ${stat.color} rounded-2xl mb-4 shadow-glow-sm group-hover:shadow-glow transition-all duration-300`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-4xl font-display font-bold text-white mb-1">{stat.value}</div>
                      <div className="text-slate-400 text-sm font-medium">{stat.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-80 h-80 bg-solar-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-50/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="section-header mb-4">Ready to Go Solar?</h2>
          <p className="text-lg text-slate-500 mb-8">Start your solar journey today with an AI-powered estimation</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/estimations/create" className="btn-primary text-lg px-8 py-4">
              <Sun className="w-5 h-5 mr-2" />
              Get Started Free
            </Link>
            <Link to="/vendors" className="btn-secondary text-lg px-8 py-4">
              Browse Vendors
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

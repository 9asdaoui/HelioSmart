import { Zap } from 'lucide-react'

export default function Inverters() {
  return (
    <div className="page-container animate-fade-in">
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="relative mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-eco-400 to-eco-600 rounded-2xl flex items-center justify-center shadow-glow-eco animate-float">
            <Zap className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-display font-bold gradient-text mb-3">Inverters Management</h1>
        <p className="text-slate-500 text-lg mb-2">Coming Soon</p>
        <p className="text-slate-400 text-sm max-w-md text-center">
          Browse and manage inverter options with smart recommendations for your solar systems.
        </p>
      </div>
    </div>
  )
}

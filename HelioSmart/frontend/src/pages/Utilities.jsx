import { Building } from 'lucide-react'

export default function Utilities() {
  return (
    <div className="page-container animate-fade-in">
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="relative mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-helio-500 to-helio-700 rounded-2xl flex items-center justify-center shadow-glow animate-float">
            <Building className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-display font-bold gradient-text mb-3">Utilities Management</h1>
        <p className="text-slate-500 text-lg mb-2">Coming Soon</p>
        <p className="text-slate-400 text-sm max-w-md text-center">
          Manage energy utility providers, rates, and regional configurations.
        </p>
      </div>
    </div>
  )
}

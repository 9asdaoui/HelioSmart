import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { estimationsAPI } from '@/services/api'
import { Plus, Eye, Trash2, FileText, Sun, Zap, ArrowRight } from 'lucide-react'

const STATUS_STYLES = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending:   'bg-amber-50   text-amber-700   border-amber-200',
  failed:    'bg-red-50     text-red-600     border-red-200',
  draft:     'bg-gray-50    text-gray-500    border-gray-200',
}

const STATUS_DOT = {
  completed: 'bg-emerald-500',
  pending:   'bg-amber-500',
  failed:    'bg-red-500',
  draft:     'bg-gray-400',
}

const FILTERS = ['', 'draft', 'pending', 'completed', 'failed']

export default function Estimations() {
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['estimations', statusFilter],
    queryFn: () => estimationsAPI.getAll({ status: statusFilter || undefined }),
  })

  const handleDelete = async (id) => {
    if (window.confirm('Delete this estimation?')) {
      try { await estimationsAPI.delete(id); refetch() }
      catch (e) { console.error(e) }
    }
  }

  const estimations = data?.data?.estimations || []

  return (
    <div className="space-y-6">

      {/*  Header  */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-0"
        style={{ animation: 'slideUpFade 0.5s ease-out 0.05s forwards' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-widest">My Projects</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Solar Estimations</h1>
          <p className="text-gray-400 text-sm mt-0.5">Your saved project reports &amp; analyses</p>
        </div>

        <Link
          to="/estimations/create"
          className="relative inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-300/40 text-sm overflow-hidden group/cta self-start sm:self-auto"
        >
          <span className="relative z-10 flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Estimation
          </span>
          <span className="absolute inset-0 translate-x-[-100%] group-hover/cta:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        </Link>
      </div>

      {/*  Filter bar  */}
      <div
        className="bg-white rounded-2xl border border-gray-100 px-5 py-3.5 flex items-center gap-2 flex-wrap shadow-sm opacity-0"
        style={{ animation: 'slideUpFade 0.5s ease-out 0.12s forwards' }}
      >
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">Filter</span>
        {FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border ${
              statusFilter === s
                ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                : 'text-gray-400 border-transparent hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}

        {estimations.length > 0 && (
          <span className="ml-auto text-xs text-gray-400 font-medium">
            {estimations.length} result{estimations.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/*  Table card  */}
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden opacity-0"
        style={{ animation: 'slideUpFade 0.55s ease-out 0.2s forwards' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <span className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-400 text-sm">Loading estimations</span>
          </div>

        ) : estimations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-5 text-center px-6">
            {/* Decorative sun */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-amber-300/30 animate-ping" style={{ width: 72, height: 72 }} />
              <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-300/50">
                <Sun className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-base">No estimations yet</p>
              <p className="text-gray-400 text-sm mt-1">Create your first solar estimation to get started</p>
            </div>
            <Link
              to="/estimations/create"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-amber-300/40"
            >
              <Plus className="w-4 h-4" /> Create Estimation
            </Link>
          </div>

        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {['ID', 'Account', 'Location', 'System Size', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {estimations.map((est, i) => (
                  <tr
                    key={est.id}
                    className="border-b border-gray-50 hover:bg-amber-50/40 transition-colors duration-150 opacity-0"
                    style={{ animation: `slideUpFade 0.45s ease-out ${i * 55}ms forwards` }}
                  >
                    <td className="px-5 py-4 text-sm text-gray-400 font-mono">#{est.id}</td>
                    <td className="px-5 py-4 text-sm text-gray-700 font-medium">
                      {est.email || est.customer_name || 'N/A'}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {est.city || 'N/A'}{est.state ? `, ${est.state}` : ''}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-gray-900 font-semibold">{est.system_capacity ?? ''}</span>
                        <span className="text-gray-400 text-xs">kW</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                        STATUS_STYLES[est.status] || STATUS_STYLES.draft
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[est.status] || STATUS_DOT.draft}`} />
                        {est.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/estimations/${est.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-100 hover:border-amber-200 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </Link>
                        <button
                          onClick={() => handleDelete(est.id)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}

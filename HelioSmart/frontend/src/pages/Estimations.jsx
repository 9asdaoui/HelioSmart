import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { estimationsAPI } from '@/services/api'
import { Plus, Eye, Trash2, FileText, CheckCircle, Clock, AlertTriangle, Filter } from 'lucide-react'

export default function Estimations() {
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['estimations', statusFilter],
    queryFn: () => estimationsAPI.getAll({ status: statusFilter || undefined }),
  })

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this estimation?')) {
      try {
        await estimationsAPI.delete(id)
        refetch()
      } catch (error) {
        console.error('Error deleting estimation:', error)
      }
    }
  }

  const estimations = data?.data?.estimations || []
  const completed = estimations.filter(e => e.status === 'completed').length
  const pending = estimations.filter(e => e.status === 'pending').length
  const draft = estimations.filter(e => e.status === 'draft').length

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return 'badge-success'
      case 'pending': return 'badge-warning'
      case 'failed': return 'badge-danger'
      default: return 'badge-neutral'
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="page-title">Solar Estimations</h1>
          <p className="page-subtitle">Manage and track your solar installation projects</p>
        </div>
        <Link to="/estimations/create" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          New Estimation
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: estimations.length, icon: FileText, color: 'text-helio-600', bg: 'bg-helio-100' },
          { label: 'Completed', value: completed, icon: CheckCircle, color: 'text-eco-600', bg: 'bg-eco-100' },
          { label: 'Pending', value: pending, icon: Clock, color: 'text-solar-600', bg: 'bg-solar-100' },
          { label: 'Draft', value: draft, icon: AlertTriangle, color: 'text-slate-600', bg: 'bg-slate-100' },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                  <p className="text-2xl font-display font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-2.5 ${stat.bg} rounded-xl`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field max-w-xs"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Estimations Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="spinner-lg mx-auto mb-4"></div>
            <p className="text-slate-500">Loading estimations...</p>
          </div>
        ) : estimations.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No estimations found</p>
            <p className="text-sm text-slate-400 mt-1">Create your first solar estimation to get started</p>
            <Link to="/estimations/create" className="btn-primary mt-4 inline-flex">
              <Plus className="w-4 h-4 mr-2" />
              Create Estimation
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Location</th>
                  <th>System Size</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {estimations.map((estimation) => (
                  <tr key={estimation.id}>
                    <td className="font-mono text-xs text-slate-500">#{estimation.id}</td>
                    <td>
                      <span className="font-semibold text-slate-900">{estimation.customer_name || 'N/A'}</span>
                    </td>
                    <td>{estimation.city || 'N/A'}, {estimation.state || 'N/A'}</td>
                    <td>
                      <span className="font-semibold">{estimation.system_capacity}</span>
                      <span className="text-slate-400 ml-1">kW</span>
                    </td>
                    <td>
                      <span className={getStatusBadge(estimation.status)}>
                        {estimation.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/estimations/${estimation.id}`}
                          className="p-2 rounded-lg text-helio-600 hover:bg-helio-50 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(estimation.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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

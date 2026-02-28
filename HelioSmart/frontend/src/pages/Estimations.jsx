import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { estimationsAPI } from '@/services/api'
import { Plus, Eye, Trash2 } from 'lucide-react'

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
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Solar Estimations</h1>
        <Link to="/estimations/create" className="btn-primary flex items-center space-x-2">
          <Plus className="w-5 h-5" />
          <span>New Estimation</span>
        </Link>
      </div>
      
      {/* Filters */}
      <div className="card">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="label">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Estimations List */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading estimations...</div>
        ) : data?.data?.estimations?.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No estimations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">System Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data?.data?.estimations?.map((estimation) => (
                  <tr key={estimation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{estimation.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{estimation.customer_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{estimation.city || 'N/A'}, {estimation.state || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{estimation.system_capacity} kW</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        estimation.status === 'completed' ? 'bg-green-100 text-green-800' :
                        estimation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        estimation.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {estimation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <Link
                          to={`/estimations/${estimation.id}`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(estimation.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
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

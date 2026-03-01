import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { publicVendorAPI } from '../services/authApi'
import { Search, Store, MapPin, Package, ArrowLeft, ArrowRight } from 'lucide-react'

const VendorList = () => {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [vendorType, setVendorType] = useState('')
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0 })

  const vendorTypes = [
    { value: '', label: 'All Types' },
    { value: 'installer', label: 'Solar Installer' },
    { value: 'distributor', label: 'Equipment Distributor' },
    { value: 'manufacturer', label: 'Manufacturer' },
    { value: 'consultant', label: 'Solar Consultant' },
    { value: 'other', label: 'Other' },
  ]

  useEffect(() => { loadVendors() }, [pagination.page, vendorType])

  const loadVendors = async () => {
    try {
      setLoading(true)
      const response = await publicVendorAPI.listVendors({ search: search || undefined, vendor_type: vendorType || undefined, page: pagination.page, page_size: pagination.page_size })
      setVendors(response.data.items)
      setPagination(prev => ({ ...prev, total: response.data.total }))
    } catch (err) {
      setError('Failed to load vendors')
      console.error(err)
    } finally { setLoading(false) }
  }

  const handleSearch = (e) => { e.preventDefault(); setPagination(prev => ({ ...prev, page: 1 })); loadVendors() }

  const getSpecializationLabel = (spec) => spec.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  if (loading && vendors.length === 0) {
    return (<div className="flex items-center justify-center min-h-[60vh]"><div className="spinner-lg"></div></div>)
  }

  return (
    <div className="animate-fade-in">
      {/* Hero Header */}
      <div className="hero-section py-14 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-4xl font-display font-bold text-white mb-3">Our Vendor Partners</h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">Browse our network of trusted solar equipment vendors, installers, and distributors.</p>
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-solar-500/10 rounded-full blur-3xl" />
      </div>

      <div className="page-container -mt-8 relative z-10">
        {/* Search */}
        <div className="card mb-8 shadow-glass-lg">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 input-group">
              <Search className="input-icon w-5 h-5" />
              <input type="text" placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-11" />
            </div>
            <select value={vendorType} onChange={(e) => setVendorType(e.target.value)} className="input-field md:w-64">
              {vendorTypes.map(type => (<option key={type.value} value={type.value}>{type.label}</option>))}
            </select>
            <button type="submit" className="btn-primary px-8">Search</button>
          </form>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">{error}</div>}

        {vendors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="card-hover group">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-display font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{vendor.business_name}</h3>
                    {vendor.vendor_type && (
                      <span className="badge-info mt-2 inline-block">{vendorTypes.find(t => t.value === vendor.vendor_type)?.label || vendor.vendor_type}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-display font-bold gradient-text">{vendor.total_products}</span>
                    <p className="text-xs text-slate-400">products</p>
                  </div>
                </div>

                {vendor.specializations && vendor.specializations.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-slate-500 mb-2">Specializations:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {vendor.specializations.map((spec) => (
                        <span key={spec} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg font-medium">{getSpecializationLabel(spec)}</span>
                      ))}
                    </div>
                  </div>
                )}

                {vendor.country && (
                  <p className="text-sm text-slate-500 mb-4 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {vendor.country}</p>
                )}

                <Link to={`/vendors/${vendor.id}`} className="btn-secondary w-full justify-center">
                  <Package className="w-4 h-4 mr-2" /> View Products
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Store className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No vendors found matching your criteria.</p>
          </div>
        )}

        {pagination.total > pagination.page_size && (
          <div className="flex justify-center mt-8">
            <nav className="flex items-center gap-2">
              <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1} className="btn-secondary px-4 py-2 disabled:opacity-50">
                <ArrowLeft className="w-4 h-4 mr-1" /> Previous
              </button>
              <span className="px-4 py-2 text-slate-600 font-medium">Page {pagination.page} of {Math.ceil(pagination.total / pagination.page_size)}</span>
              <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page >= Math.ceil(pagination.total / pagination.page_size)} className="btn-secondary px-4 py-2 disabled:opacity-50">
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  )
}

export default VendorList

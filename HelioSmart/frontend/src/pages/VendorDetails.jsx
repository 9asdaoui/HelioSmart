import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicVendorAPI } from '../services/authApi'
import { ArrowLeft, ArrowRight, Package, Store, MapPin, Tag } from 'lucide-react'

const VendorDetails = () => {
  const { vendorId } = useParams()
  const [vendor, setVendor] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('')
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0 })

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'panels', label: 'Solar Panels' },
    { value: 'inverters', label: 'Inverters' },
    { value: 'batteries', label: 'Batteries' },
    { value: 'mounting', label: 'Mounting Systems' },
    { value: 'accessories', label: 'Accessories' },
  ]

  useEffect(() => { loadVendorData() }, [vendorId])
  useEffect(() => { loadProducts() }, [vendorId, pagination.page, category])

  const loadVendorData = async () => {
    try { const response = await publicVendorAPI.getVendor(vendorId); setVendor(response.data) }
    catch (err) { setError('Failed to load vendor information'); console.error(err) }
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await publicVendorAPI.getVendorProducts(vendorId, { category: category || undefined, page: pagination.page, page_size: pagination.page_size })
      setProducts(response.data.items)
      setPagination(prev => ({ ...prev, total: response.data.total }))
    } catch (err) { setError('Failed to load products'); console.error(err) }
    finally { setLoading(false) }
  }

  const getSpecializationLabel = (spec) => spec.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  const getCategoryLabel = (cat) => categories.find(c => c.value === cat)?.label || cat

  if (loading && !vendor) {
    return (<div className="flex items-center justify-center min-h-[60vh]"><div className="spinner-lg"></div></div>)
  }

  if (!vendor && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Store className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold text-slate-800 mb-2">Vendor Not Found</h2>
          <p className="text-slate-500 mb-4">The vendor you're looking for doesn't exist.</p>
          <Link to="/vendors" className="btn-primary"><ArrowLeft className="w-4 h-4 mr-2" /> Browse all vendors</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Vendor Banner */}
      <div className="hero-section py-10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
            <Link to="/vendors" className="hover:text-white transition-colors">Vendors</Link>
            <span>/</span>
            <span className="text-white">{vendor?.business_name}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-white">{vendor?.business_name}</h1>
              {vendor?.vendor_type && <span className="badge-warning mt-2 inline-block">{vendor?.vendor_type}</span>}
            </div>
            <div className="mt-4 md:mt-0">
              <span className="text-3xl font-display font-bold text-solar-400">{vendor?.total_products}</span>
              <p className="text-sm text-slate-400">products available</p>
            </div>
          </div>
          {vendor?.specializations && vendor.specializations.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {vendor.specializations.map((spec) => (
                <span key={spec} className="px-3 py-1 bg-white/10 backdrop-blur-sm text-slate-200 text-sm rounded-full border border-white/10">{getSpecializationLabel(spec)}</span>
              ))}
            </div>
          )}
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-solar-500/10 rounded-full blur-3xl" />
      </div>

      {/* Products Section */}
      <div className="page-container -mt-6 relative z-10">
        <div className="card mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-glass-lg">
          <h2 className="text-xl font-display font-bold text-slate-900">Products</h2>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPagination(prev => ({ ...prev, page: 1 })) }} className="input-field sm:w-64">
            {categories.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
          </select>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">{error}</div>}

        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="card-hover">
                <div className="flex items-start justify-between mb-3">
                  <span className="badge-neutral"><Tag className="w-3 h-3 mr-1" /> {getCategoryLabel(product.category)}</span>
                  {product.subcategory && <span className="text-xs text-slate-400">{product.subcategory}</span>}
                </div>
                <h3 className="text-lg font-display font-bold text-slate-900 mb-2">{product.name}</h3>
                {product.sku && <p className="text-sm text-slate-400 mb-2 font-mono">SKU: {product.sku}</p>}
                {product.description && <p className="text-slate-500 text-sm mb-4 line-clamp-2">{product.description}</p>}
                {product.price ? (
                  <div className="mb-4">
                    <span className="text-2xl font-display font-bold gradient-text">{product.price} {product.currency}</span>
                    {product.unit && <span className="text-slate-400 text-sm ml-1">/ {product.unit}</span>}
                  </div>
                ) : (
                  <p className="text-slate-400 mb-4 italic">Price on request</p>
                )}
                {product.specifications && Object.keys(product.specifications).length > 0 && (
                  <div className="border-t border-slate-100 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Specifications</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(product.specifications).slice(0, 4).map(([key, value]) => (
                        <div key={key}><span className="text-slate-400">{key}:</span> <span className="text-slate-700 font-medium">{value}</span></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 card">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No products found in this category.</p>
          </div>
        )}

        {pagination.total > pagination.page_size && (
          <div className="flex justify-center mt-8">
            <nav className="flex items-center gap-2">
              <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1} className="btn-secondary px-4 py-2 disabled:opacity-50"><ArrowLeft className="w-4 h-4 mr-1" /> Previous</button>
              <span className="px-4 py-2 text-slate-600 font-medium">Page {pagination.page} of {Math.ceil(pagination.total / pagination.page_size)}</span>
              <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page >= Math.ceil(pagination.total / pagination.page_size)} className="btn-secondary px-4 py-2 disabled:opacity-50">Next <ArrowRight className="w-4 h-4 ml-1" /></button>
            </nav>
          </div>
        )}
      </div>
    </div>
  )
}

export default VendorDetails

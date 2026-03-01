import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { vendorAPI } from '../services/authApi'
import { Package, FileText, Upload, CheckCircle, Clock, AlertTriangle, Cpu } from 'lucide-react'

const VendorDashboard = () => {
  const { vendor, user } = useAuth()
  const [stats, setStats] = useState(null)
  const [documents, setDocuments] = useState([])
  const [products, setProducts] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [processingDoc, setProcessingDoc] = useState(null)

  useEffect(() => { loadDashboardData() }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      const [statsRes, docsRes, productsRes] = await Promise.all([
        vendorAPI.getDashboardStats(),
        vendorAPI.listDocuments(),
        vendorAPI.listProducts(),
      ])
      setStats(statsRes.data)
      setDocuments(docsRes.data)
      setProducts(productsRes.data.items)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setUploadError('File size must be less than 50MB')
        return
      }
      setUploadFile(file)
      setUploadError('')
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!uploadFile) return
    setUploadError('')
    setUploadSuccess('')
    try {
      await vendorAPI.uploadDocument(uploadFile)
      setUploadSuccess('Document uploaded successfully!')
      setUploadFile(null)
      const docsRes = await vendorAPI.listDocuments()
      setDocuments(docsRes.data)
      const statsRes = await vendorAPI.getDashboardStats()
      setStats(statsRes.data)
    } catch (error) {
      setUploadError(error.response?.data?.detail || 'Upload failed')
    }
  }

  const handleProcessDocument = async (docId) => {
    setProcessingDoc(docId)
    try {
      await vendorAPI.processDocument(docId)
      const docsRes = await vendorAPI.listDocuments()
      setDocuments(docsRes.data)
      const statsRes = await vendorAPI.getDashboardStats()
      setStats(statsRes.data)
    } catch (error) {
      console.error('Failed to process document:', error)
    } finally {
      setProcessingDoc(null)
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      uploaded: 'badge-neutral',
      processing: 'badge-warning',
      extracted: 'badge-info',
      approved: 'badge-success',
      rejected: 'badge-danger',
      error: 'badge-danger',
    }
    return <span className={map[status] || 'badge-neutral'}>{status}</span>
  }

  if (isLoading) {
    return (<div className="flex items-center justify-center min-h-[60vh]"><div className="spinner-lg"></div></div>)
  }

  const tabs = ['overview', 'documents', 'products']

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="hero-section py-10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Vendor Dashboard</h1>
              <p className="text-slate-300 mt-1">{vendor?.business_name}</p>
            </div>
            <span className={vendor?.is_approved ? 'badge-success' : 'badge-warning'}>
              {vendor?.is_approved ? 'Approved' : 'Pending Approval'}
            </span>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-solar-500/10 rounded-full blur-3xl" />
      </div>

      <div className="page-container -mt-6 relative z-10">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Products', value: stats?.total_products || 0, icon: Package, color: 'text-helio-600', bg: 'bg-helio-100' },
            { label: 'Approved', value: stats?.approved_products || 0, icon: CheckCircle, color: 'text-eco-600', bg: 'bg-eco-100' },
            { label: 'Pending', value: stats?.pending_products || 0, icon: Clock, color: 'text-solar-600', bg: 'bg-solar-100' },
            { label: 'Documents', value: stats?.total_documents || 0, icon: FileText, color: 'text-primary-600', bg: 'bg-primary-100' },
          ].map((s, i) => {
            const Icon = s.icon
            return (
              <div key={i} className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{s.label}</p>
                    <p className="text-2xl font-display font-bold text-slate-900 mt-1">{s.value}</p>
                  </div>
                  <div className={`p-2.5 ${s.bg} rounded-xl`}><Icon className={`w-5 h-5 ${s.color}`} /></div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tabs */}
        <div className="card p-0 mb-6 overflow-hidden">
          <div className="border-b border-slate-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 px-6 border-b-2 font-semibold text-sm capitalize transition-colors ${activeTab === tab ? 'border-solar-500 text-solar-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-display font-bold text-slate-900 mb-4">Quick Actions</h3>
                  <div className="flex gap-3 flex-wrap">
                    <label className="btn-primary cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" /> Upload Document
                      <input type="file" className="hidden" accept=".pdf,.csv,.xlsx,.xls,.doc,.docx,.txt" onChange={handleFileChange} />
                    </label>
                    <Link to="/vendor/catalog-import" className="btn-eco"><Cpu className="w-4 h-4 mr-2" /> AI Catalog Import</Link>
                    <button className="btn-secondary"><Package className="w-4 h-4 mr-2" /> Add Product Manually</button>
                  </div>

                  {uploadFile && (
                    <form onSubmit={handleUpload} className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-sm text-slate-600 mb-2">Selected: <span className="font-semibold">{uploadFile.name}</span></p>
                      {uploadError && <p className="text-red-600 text-sm mb-2">{uploadError}</p>}
                      {uploadSuccess && <p className="text-eco-600 text-sm mb-2">{uploadSuccess}</p>}
                      <div className="flex gap-2">
                        <button type="submit" className="btn-eco text-sm">Upload</button>
                        <button type="button" onClick={() => setUploadFile(null)} className="btn-secondary text-sm">Cancel</button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-display font-bold text-slate-900 mb-4">Recent Products</h3>
                    {stats?.recent_products?.length > 0 ? (
                      <div className="space-y-2">
                        {stats.recent_products.slice(0, 5).map((product) => (
                          <div key={product.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div><p className="font-semibold text-slate-900 text-sm">{product.name}</p><p className="text-xs text-slate-500">{product.category}</p></div>
                            {getStatusBadge(product.status)}
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-slate-400 text-sm">No products yet</p>}
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-slate-900 mb-4">Recent Documents</h3>
                    {stats?.recent_documents?.length > 0 ? (
                      <div className="space-y-2">
                        {stats.recent_documents.slice(0, 5).map((doc) => (
                          <div key={doc.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div><p className="font-semibold text-slate-900 text-sm truncate max-w-[200px]">{doc.original_filename}</p><p className="text-xs text-slate-500">{new Date(doc.uploaded_at).toLocaleDateString()}</p></div>
                            {getStatusBadge(doc.status)}
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-slate-400 text-sm">No documents yet</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div>
                <h3 className="text-lg font-display font-bold text-slate-900 mb-4">Document Management</h3>
                {documents.length > 0 ? (
                  <div className="overflow-x-auto"><table className="premium-table"><thead><tr><th>Filename</th><th>Status</th><th>Uploaded</th><th>Actions</th></tr></thead><tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td className="font-medium text-slate-900">{doc.original_filename}</td>
                        <td>{getStatusBadge(doc.status)}</td>
                        <td>{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                        <td>
                          {doc.status === 'uploaded' && (
                            <button onClick={() => handleProcessDocument(doc.id)} disabled={processingDoc === doc.id} className="text-primary-600 hover:text-primary-800 font-semibold text-sm disabled:opacity-50">
                              {processingDoc === doc.id ? 'Processing...' : 'Process'}
                            </button>
                          )}
                          {doc.status === 'extracted' && (
                            <button className="text-eco-600 hover:text-eco-800 font-semibold text-sm">
                              Review ({doc.extracted_products?.length || 0} products)
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody></table></div>
                ) : <p className="text-slate-400 text-sm">No documents uploaded yet</p>}
              </div>
            )}

            {activeTab === 'products' && (
              <div>
                <h3 className="text-lg font-display font-bold text-slate-900 mb-4">Product Catalog</h3>
                {products.length > 0 ? (
                  <div className="overflow-x-auto"><table className="premium-table"><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Status</th></tr></thead><tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className="font-medium text-slate-900">{product.name}</td>
                        <td>{product.category}</td>
                        <td>{product.price ? `${product.price} ${product.currency}` : 'N/A'}</td>
                        <td>{getStatusBadge(product.status)}</td>
                      </tr>
                    ))}
                  </tbody></table></div>
                ) : <p className="text-slate-400 text-sm">No products yet</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VendorDashboard

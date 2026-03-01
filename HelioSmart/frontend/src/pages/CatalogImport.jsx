import { useState, useEffect } from 'react';
import { Upload, History, AlertCircle, Cpu } from 'lucide-react';
import CatalogUpload from '../components/CatalogUpload';
import ProductReview from '../components/ProductReview';
import catalogApi from '../services/catalogApi';

export default function CatalogImport() {
  const [view, setView] = useState('upload');
  const [currentUploadId, setCurrentUploadId] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOllamaStatus();
    loadUploads();
  }, []);

  const checkOllamaStatus = async () => {
    try {
      const status = await catalogApi.checkOllamaStatus();
      setOllamaStatus(status);
    } catch (err) {
      setOllamaStatus({ available: false, error: err.message });
    }
  };

  const loadUploads = async () => {
    try {
      setLoading(true);
      const response = await catalogApi.getUploads();
      setUploads(response.uploads || []);
    } catch (err) {
      console.error('Failed to load uploads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (uploadId, productCount) => {
    setCurrentUploadId(uploadId);
    setView('review');
    loadUploads();
  };

  const handleReviewComplete = () => {
    setCurrentUploadId(null);
    setView('upload');
    loadUploads();
  };

  const getStatusBadge = (status) => {
    const map = {
      completed: 'badge-success',
      review: 'badge-success',
      failed: 'badge-danger',
      processing: 'badge-info',
      extracting: 'badge-info',
    };
    return map[status] || 'badge-neutral';
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="hero-section py-10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm"><Cpu className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Product Catalog Import</h1>
              <p className="text-slate-300 text-sm">Upload your product catalogs and let AI extract and organize your products</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-solar-500/10 rounded-full blur-3xl" />
      </div>

      <div className="page-container -mt-6 relative z-10">
        {/* Ollama Status */}
        {ollamaStatus && !ollamaStatus.available && (
          <div className="mb-6 bg-solar-50 border border-solar-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-solar-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-solar-800">AI Service Not Available</p>
              <p className="text-sm text-solar-700">{ollamaStatus.error || 'Please ensure Ollama is running locally.'}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button onClick={() => setView('upload')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${view === 'upload' || view === 'review' ? 'bg-gradient-to-r from-solar-400 to-primary-500 text-white shadow-glow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <Upload className="w-4 h-4" /> New Import
          </button>
          <button onClick={() => setView('history')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${view === 'history' ? 'bg-gradient-to-r from-solar-400 to-primary-500 text-white shadow-glow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <History className="w-4 h-4" /> Import History ({uploads.length})
          </button>
        </div>

        {/* Content */}
        <div className="card">
          {view === 'upload' && (
            <div className="max-w-2xl mx-auto py-8">
              <h2 className="text-xl font-display font-bold text-slate-900 text-center mb-6">Upload Product Catalog</h2>
              <CatalogUpload
                onUploadComplete={handleUploadComplete}
                onError={(error) => alert(error)}
              />
              <div className="mt-8 text-center text-sm text-slate-400">
                <p>Supported formats: PDF, CSV, Excel (.xlsx, .xls)</p>
                <p className="mt-1">Maximum file size: 50MB</p>
              </div>
            </div>
          )}

          {view === 'review' && currentUploadId && (
            <ProductReview
              uploadId={currentUploadId}
              onComplete={handleReviewComplete}
              onBack={() => setView('upload')}
            />
          )}

          {view === 'history' && (
            <div>
              <h2 className="text-xl font-display font-bold text-slate-900 mb-4">Import History</h2>
              {loading ? (
                <div className="flex justify-center py-12"><div className="spinner-lg"></div></div>
              ) : uploads.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500">No imports yet</p>
                  <button onClick={() => setView('upload')} className="mt-4 text-primary-500 hover:text-primary-600 font-semibold text-sm">Start your first import</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="premium-table">
                    <thead><tr><th>Document</th><th>Status</th><th>Progress</th><th>Products</th><th>Date</th><th>Actions</th></tr></thead>
                    <tbody>
                      {uploads.map((upload) => (
                        <tr key={upload.id}>
                          <td>
                            <div className="font-medium text-slate-900">{upload.document_name}</div>
                            <div className="text-sm text-slate-400 uppercase">{upload.document_type}</div>
                          </td>
                          <td><span className={getStatusBadge(upload.status)}>{upload.status}</span></td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-solar-400 to-eco-500 rounded-full transition-all" style={{ width: `${upload.progress}%` }}></div>
                              </div>
                              <span className="text-sm text-slate-500">{upload.progress}%</span>
                            </div>
                          </td>
                          <td>
                            <div className="text-sm"><span className="font-semibold">{upload.extracted_count}</span> extracted</div>
                            {upload.validated_count > 0 && (
                              <div className="text-sm text-eco-600"><span className="font-semibold">{upload.validated_count}</span> approved</div>
                            )}
                          </td>
                          <td className="text-sm text-slate-500">{new Date(upload.created_at).toLocaleDateString()}</td>
                          <td>
                            {upload.status === 'review' && (
                              <button onClick={() => { setCurrentUploadId(upload.id); setView('review'); }} className="text-primary-600 hover:text-primary-800 text-sm font-semibold">Review Products</button>
                            )}
                            {upload.status === 'completed' && (
                              <span className="text-eco-600 text-sm font-semibold">{upload.imported_count} imported</span>
                            )}
                            {upload.error && (
                              <span className="text-red-500 text-sm" title={upload.error}>Error</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* How It Works */}
        {view === 'upload' && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: '01', title: 'Upload Catalog', desc: 'Upload your product catalog in PDF, CSV, or Excel format' },
              { num: '02', title: 'AI Extraction', desc: 'Our AI analyzes the document and extracts product information' },
              { num: '03', title: 'Review & Import', desc: 'Review extracted products and approve them for your store' },
            ].map((step, i) => (
              <div key={i} className="card-hover text-center">
                <div className="text-3xl font-display font-bold gradient-text mb-3">{step.num}</div>
                <h3 className="font-display font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

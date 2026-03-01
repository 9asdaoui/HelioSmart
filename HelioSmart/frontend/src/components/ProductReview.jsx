import { useState, useEffect } from 'react';
import { Check, X, Edit2, Save, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import catalogApi from '../services/catalogApi';

export default function ProductReview({ uploadId, onComplete, onBack }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [uploadId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await catalogApi.getProducts(uploadId);
      setProducts(response.products || []);
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setEditForm({ ...product });
  };

  const handleSave = async () => {
    try {
      await catalogApi.updateProduct(editingId, editForm);
      setEditingId(null);
      loadProducts();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleValidate = async (action) => {
    if (selectedProducts.size === 0) {
      alert('Please select at least one product');
      return;
    }

    try {
      await catalogApi.validateProducts(Array.from(selectedProducts), action);
      setSelectedProducts(new Set());
      loadProducts();
    } catch (err) {
      alert('Failed to validate: ' + err.message);
    }
  };

  const handleImport = async () => {
    const approvedProducts = products.filter(
      p => p.status === 'approved' && !selectedProducts.has(p.id)
    );

    if (approvedProducts.length === 0) {
      alert('No approved products to import');
      return;
    }

    try {
      setImporting(true);
      const result = await catalogApi.importProducts(approvedProducts.map(p => p.id));
      alert(`Successfully imported ${result.imported} products!`);
      onComplete?.();
    } catch (err) {
      alert('Failed to import: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const toggleSelection = (id) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const toggleAll = () => {
    const pendingProducts = products.filter(p => p.status === 'pending');
    if (selectedProducts.size === pendingProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(pendingProducts.map(p => p.id)));
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Rejected</span>;
      case 'modified':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Modified</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Pending</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error: {error}
      </div>
    );
  }

  const pendingCount = products.filter(p => p.status === 'pending').length;
  const approvedCount = products.filter(p => p.status === 'approved').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <h2 className="text-xl font-semibold">
            Review Extracted Products ({products.length})
          </h2>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-gray-600">Pending: {pendingCount}</span>
          <span className="text-green-600">Approved: {approvedCount}</span>
        </div>
      </div>

      {/* Bulk Actions */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedProducts.size === pendingCount && pendingCount > 0}
              onChange={toggleAll}
              className="w-4 h-4"
            />
            <span className="text-sm">
              Select All Pending ({selectedProducts.size} selected)
            </span>
          </label>
          <div className="flex-1"></div>
          <button
            onClick={() => handleValidate('approve')}
            disabled={selectedProducts.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            Approve Selected
          </button>
          <button
            onClick={() => handleValidate('reject')}
            disabled={selectedProducts.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            Reject Selected
          </button>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left w-10"></th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Confidence</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product) => (
                <tr 
                  key={product.id}
                  className={product.status !== 'pending' ? 'bg-gray-50' : ''}
                >
                  <td className="px-4 py-3">
                    {product.status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => toggleSelection(product.id)}
                        className="w-4 h-4"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === product.id ? (
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.brand && (
                          <div className="text-sm text-gray-500">{product.brand}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === product.id ? (
                      <select
                        value={editForm.category || ''}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full px-2 py-1 border rounded"
                      >
                        <option value="solar_panel">Solar Panel</option>
                        <option value="inverter">Inverter</option>
                        <option value="battery">Battery</option>
                        <option value="mounting_system">Mounting System</option>
                        <option value="cable">Cable</option>
                        <option value="connector">Connector</option>
                        <option value="monitoring_system">Monitoring System</option>
                        <option value="other">Other</option>
                      </select>
                    ) : (
                      <span className="capitalize">
                        {product.category?.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === product.id ? (
                      <input
                        type="text"
                        value={editForm.price || ''}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        className="w-24 px-2 py-1 border rounded"
                      />
                    ) : (
                      <span>
                        {product.price} {product.currency}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${getConfidenceColor(product.extraction_confidence)}`}>
                      {Math.round((product.extraction_confidence || 0) * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(product.status)}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === product.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(product)}
                        disabled={product.status !== 'pending'}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Button */}
      {approvedCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Importing...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Import {approvedCount} Approved Products
              </>
            )}
          </button>
        </div>
      )}

      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No products extracted from this catalog.
        </div>
      )}
    </div>
  );
}

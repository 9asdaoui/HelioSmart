/** Catalog Import API Service */
import { api } from './api';

export const catalogApi = {
  /** Upload a catalog file */
  uploadCatalog: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/catalog/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /** Start AI extraction */
  extractProducts: async (uploadId) => {
    const response = await api.post(`/catalog/${uploadId}/extract`);
    return response.data;
  },

  /** Get extraction status */
  getStatus: async (uploadId) => {
    const response = await api.get(`/catalog/${uploadId}/status`);
    return response.data;
  },

  /** Get extracted products */
  getProducts: async (uploadId, status = null) => {
    const params = status ? { status } : {};
    const response = await api.get(`/catalog/${uploadId}/products`, { params });
    return response.data;
  },

  /** Update a staging product */
  updateProduct: async (stagingId, updates) => {
    const response = await api.put(`/catalog/products/${stagingId}`, updates);
    return response.data;
  },

  /** Validate (approve/reject) products */
  validateProducts: async (stagingIds, action) => {
    const response = await api.post('/catalog/products/validate', {
      staging_ids: stagingIds,
      action,
    });
    return response.data;
  },

  /** Import approved products */
  importProducts: async (stagingIds) => {
    const response = await api.post('/catalog/products/import', {
      staging_ids: stagingIds,
    });
    return response.data;
  },

  /** Get all uploads for vendor */
  getUploads: async () => {
    const response = await api.get('/catalog/uploads');
    return response.data;
  },

  /** Check Ollama status */
  checkOllamaStatus: async () => {
    const response = await api.get('/catalog/ollama/status');
    return response.data;
  },
};

export default catalogApi;

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// Create axios instance with auth interceptors
export const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle token expiration
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Authentication API
export const authAPI = {
  register: (data) => authApi.post('/auth/register', data),
  login: (data) => authApi.post('/auth/login', data),
  logout: () => authApi.post('/auth/logout'),
  getMe: () => authApi.get('/auth/me'),
  updateProfile: (data) => authApi.put('/auth/me', data),
  changePassword: (data) => authApi.post('/auth/change-password', data),
  createGuest: (sessionId) => authApi.post('/auth/guest', null, { params: { session_id: sessionId } }),
}

// Vendor API
export const vendorAPI = {
  // Vendor profile
  registerAsVendor: (data) => authApi.post('/auth/vendor/register', data),
  getVendorProfile: () => authApi.get('/auth/vendor/profile'),
  updateVendorProfile: (data) => authApi.put('/auth/vendor/profile', data),
  
  // Dashboard
  getDashboardStats: () => authApi.get('/vendors/dashboard/stats'),
  
  // Documents
  uploadDocument: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return authApi.post('/vendors/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  listDocuments: (status) => authApi.get('/vendors/documents', { params: { status } }),
  getDocument: (id) => authApi.get(`/vendors/documents/${id}`),
  processDocument: (id) => authApi.post(`/vendors/documents/${id}/process`),
  approveExtractedProducts: (id, data) => authApi.post(`/vendors/documents/${id}/approve`, data),
  deleteDocument: (id) => authApi.delete(`/vendors/documents/${id}`),
  
  // Products
  listProducts: (params) => authApi.get('/vendors/products', { params }),
  getProduct: (id) => authApi.get(`/vendors/products/${id}`),
  createProduct: (data) => authApi.post('/vendors/products', data),
  updateProduct: (id, data) => authApi.put(`/vendors/products/${id}`, data),
  deleteProduct: (id) => authApi.delete(`/vendors/products/${id}`),
}

// Public Vendor API
export const publicVendorAPI = {
  listVendors: (params) => axios.get(`${API_BASE_URL}/vendors/public`, { params }),
  getVendor: (id) => axios.get(`${API_BASE_URL}/vendors/${id}/public`),
  getVendorProducts: (id, params) => axios.get(`${API_BASE_URL}/vendors/${id}/products/public`, { params }),
}

// Admin API
export const adminAPI = {
  listUsers: (params) => authApi.get('/auth/users', { params }),
  listPendingVendors: () => authApi.get('/auth/vendors/pending'),
  approveVendor: (id) => authApi.post(`/auth/vendors/${id}/approve`),
  deleteUser: (id) => authApi.delete(`/auth/users/${id}`),
  listAllProducts: (params) => authApi.get('/vendors/admin/products', { params }),
  approveProduct: (id, isApproved) => authApi.post(`/vendors/admin/products/${id}/approve`, null, { params: { is_approved: isApproved } }),
}

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Estimations
export const estimationsAPI = {
  getAll: (params) => api.get('/estimations', { params }),
  getById: (id) => api.get(`/estimations/${id}`),
  getVisualization: (id) => api.get(`/estimations/${id}/visualization`),
  create: (data) => api.post('/estimations', data),
  createProject: (formData) => {
    // Use FormData for the comprehensive estimation creation
    const formDataObj = new FormData()
    
    // Add all fields to FormData
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null && formData[key] !== undefined) {
        // JSON stringify arrays and objects (like roof_points)
        if (Array.isArray(formData[key]) || (typeof formData[key] === 'object' && !(formData[key] instanceof File))) {
          formDataObj.append(key, JSON.stringify(formData[key]))
        } else {
          formDataObj.append(key, formData[key])
        }
      }
    })
    
    return api.post('/estimations/create-project', formDataObj, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  update: (id, data) => api.put(`/estimations/${id}`, data),
  delete: (id) => api.delete(`/estimations/${id}`),
}

// Panels
export const panelsAPI = {
  getAll: (params) => api.get('/panels', { params }),
  getById: (id) => api.get(`/panels/${id}`),
  create: (data) => api.post('/panels', data),
  update: (id, data) => api.put(`/panels/${id}`, data),
  delete: (id) => api.delete(`/panels/${id}`),
}

// Inverters
export const invertersAPI = {
  getAll: (params) => api.get('/inverters', { params }),
  getById: (id) => api.get(`/inverters/${id}`),
  create: (data) => api.post('/inverters', data),
  update: (id, data) => api.put(`/inverters/${id}`, data),
  delete: (id) => api.delete(`/inverters/${id}`),
}

// Utilities
export const utilitiesAPI = {
  getAll: (params) => api.get('/utilities', { params }),
  getById: (id) => api.get(`/utilities/${id}`),
  create: (data) => api.post('/utilities', data),
  update: (id, data) => api.put(`/utilities/${id}`, data),
  delete: (id) => api.delete(`/utilities/${id}`),
}

// Solar Configurations
export const configurationsAPI = {
  getAll: (params) => api.get('/solar-configurations', { params }),
  getById: (id) => api.get(`/solar-configurations/${id}`),
  getByKey: (key) => api.get(`/solar-configurations/key/${key}`),
  create: (data) => api.post('/solar-configurations', data),
  update: (id, data) => api.put(`/solar-configurations/${id}`, data),
  bulkUpdate: (data) => api.put('/solar-configurations/bulk', data),
  delete: (id) => api.delete(`/solar-configurations/${id}`),
}

// Chatbot
export const chatbotAPI = {
  getStatus: () => api.get('/chatbot/status'),
  chat: (query, language = 'en', maxTokens = 400, useRag = true, history = [], sessionId = null) =>
    api.post('/chatbot/chat', {
      query,
      language,
      max_tokens: maxTokens,
      use_rag: useRag,
      history,
      session_id: sessionId,
    }),
  chatWithTTS: (query, language = 'en', maxTokens = 400, useRag = true, history = [], sessionId = null) =>
    api.post('/chatbot/chat-with-tts', {
      query,
      language,
      max_tokens: maxTokens,
      use_rag: useRag,
      history,
      session_id: sessionId,
    }),
  textToSpeech: (text, language = 'en') =>
    api.post('/chatbot/tts', { text, language }, { responseType: 'arraybuffer' }),
  uploadAudio: (audioFile, language = 'en', sessionId = null) => {
    const formData = new FormData()
    formData.append('audio', audioFile)
    formData.append('language', language)
    if (sessionId) formData.append('session_id', sessionId)
    return api.post('/chatbot/upload-audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadSessionDocument: (sessionId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('session_id', sessionId)
    return api.post('/chatbot/upload-session-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getSessionInfo: (sessionId) => api.get(`/chatbot/session/${sessionId}`),
  clearSession: (sessionId) => api.delete(`/chatbot/session/${sessionId}`),
}

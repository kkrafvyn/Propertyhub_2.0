import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('baytmiftah_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('baytmiftah_user')
      localStorage.removeItem('baytmiftah_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth endpoints
export const authApi = {
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }),
  signup: (name, email, password, role) =>
    apiClient.post('/auth/signup', { name, email, password, role }),
  logout: () => apiClient.post('/auth/logout'),
  getProfile: () => apiClient.get('/auth/profile'),
}

// Properties endpoints
export const propertyApi = {
  getAll: (filters = {}) =>
    apiClient.get('/properties', { params: filters }),
  getById: (id) =>
    apiClient.get(`/properties/${id}`),
  create: (data) =>
    apiClient.post('/properties', data),
  update: (id, data) =>
    apiClient.put(`/properties/${id}`, data),
  delete: (id) =>
    apiClient.delete(`/properties/${id}`),
  search: (query) =>
    apiClient.get('/properties/search', { params: { q: query } }),
}

// Messages endpoints
export const messageApi = {
  getConversations: () =>
    apiClient.get('/messages/conversations'),
  getMessages: (conversationId) =>
    apiClient.get(`/messages/conversations/${conversationId}`),
  sendMessage: (conversationId, content) =>
    apiClient.post(`/messages/conversations/${conversationId}`, { content }),
  createConversation: (userId) =>
    apiClient.post('/messages/conversations', { userId }),
}

// Favorites endpoints
export const favoriteApi = {
  getAll: () =>
    apiClient.get('/favorites'),
  add: (propertyId) =>
    apiClient.post('/favorites', { propertyId }),
  remove: (propertyId) =>
    apiClient.delete(`/favorites/${propertyId}`),
}

// Admin endpoints
export const adminApi = {
  getUsers: (page = 1, limit = 10) =>
    apiClient.get('/admin/users', { params: { page, limit } }),
  getUserById: (id) =>
    apiClient.get(`/admin/users/${id}`),
  updateUser: (id, data) =>
    apiClient.put(`/admin/users/${id}`, data),
  deleteUser: (id) =>
    apiClient.delete(`/admin/users/${id}`),
  getListings: (page = 1, limit = 10) =>
    apiClient.get('/admin/listings', { params: { page, limit } }),
  approveListing: (id) =>
    apiClient.post(`/admin/listings/${id}/approve`),
  rejectListing: (id) =>
    apiClient.post(`/admin/listings/${id}/reject`),
  getAnalytics: () =>
    apiClient.get('/admin/analytics'),
}

export default apiClient

/**
 * Enhanced API Service with Backend Integration
 * Handles all HTTP requests with JWT authentication, error handling, and retry logic
 */

import axios from 'axios'
import { getConfig, AUTH_CONFIG, RATE_LIMIT_CONFIG, getRetryConfig } from '../config'
import { errorHandler, AppError, AuthenticationError } from '../utils/errors'

const config = getConfig()

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: config.apiUrl,
  timeout: config.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Add JWT token to headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_CONFIG.tokenStorageKey)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add request ID for tracking
    config.headers['X-Request-ID'] = generateRequestId()

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle tokens and errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 Unauthorized - Try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const newToken = await refreshAccessToken()
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed, logout user
        handleAuthFailure()
        return Promise.reject(refreshError)
      }
    }

    // Handle 429 Rate Limited
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || RATE_LIMIT_CONFIG.retryAfter
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(apiClient(originalRequest))
        }, parseInt(retryAfter))
      })
    }

    return Promise.reject(error)
  }
)

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(AUTH_CONFIG.refreshTokenStorageKey)

  if (!refreshToken) {
    throw new AuthenticationError('No refresh token available')
  }

  try {
    const response = await axios.post(`${config.authServiceUrl}/auth/refresh`, {
      refreshToken,
    })

    const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data

    // Store new tokens
    localStorage.setItem(AUTH_CONFIG.tokenStorageKey, accessToken)
    localStorage.setItem(AUTH_CONFIG.refreshTokenStorageKey, newRefreshToken)
    localStorage.setItem(AUTH_CONFIG.tokenExpiryKey, Date.now() + expiresIn * 1000)

    return accessToken
  } catch (error) {
    throw new AuthenticationError('Failed to refresh token')
  }
}

/**
 * Handle authentication failure
 */
function handleAuthFailure() {
  localStorage.removeItem(AUTH_CONFIG.tokenStorageKey)
  localStorage.removeItem(AUTH_CONFIG.refreshTokenStorageKey)
  localStorage.removeItem(AUTH_CONFIG.userStorageKey)
  window.location.href = '/login'
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Retry request with exponential backoff
 */
async function retryRequest(requestFn, maxRetries = 3, delay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      if (attempt === maxRetries - 1) throw error

      const backoffDelay = delay * Math.pow(2, attempt)
      await new Promise((resolve) => setTimeout(resolve, backoffDelay))
    }
  }
}

// ============================================================================
// AUTH API
// ============================================================================

export const authApi = {
  /**
   * User login
   * POST /auth/login
   */
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password })
      const { accessToken, refreshToken, expiresIn, user } = response.data

      // Store tokens
      localStorage.setItem(AUTH_CONFIG.tokenStorageKey, accessToken)
      localStorage.setItem(AUTH_CONFIG.refreshTokenStorageKey, refreshToken)
      localStorage.setItem(AUTH_CONFIG.userStorageKey, JSON.stringify(user))
      localStorage.setItem(AUTH_CONFIG.tokenExpiryKey, Date.now() + expiresIn * 1000)

      return { accessToken, user }
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * User signup
   * POST /auth/signup
   */
  signup: async (email, password, name, role) => {
    try {
      const response = await apiClient.post('/auth/signup', { email, password, name, role })
      const { accessToken, refreshToken, expiresIn, user } = response.data

      // Store tokens
      localStorage.setItem(AUTH_CONFIG.tokenStorageKey, accessToken)
      localStorage.setItem(AUTH_CONFIG.refreshTokenStorageKey, refreshToken)
      localStorage.setItem(AUTH_CONFIG.userStorageKey, JSON.stringify(user))
      localStorage.setItem(AUTH_CONFIG.tokenExpiryKey, Date.now() + expiresIn * 1000)

      return { accessToken, user }
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * User logout
   * POST /auth/logout
   */
  logout: async () => {
    try {
      await apiClient.post('/auth/logout')
      handleAuthFailure()
    } catch (error) {
      // Logout client-side even if server fails
      handleAuthFailure()
    }
  },

  /**
   * Get current user profile
   * GET /auth/me
   */
  getProfile: async () => {
    try {
      const response = await apiClient.get('/auth/me')
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Update user profile
   * PUT /auth/me
   */
  updateProfile: async (profileData) => {
    try {
      const response = await apiClient.put('/auth/me', profileData)
      const user = response.data
      localStorage.setItem(AUTH_CONFIG.userStorageKey, JSON.stringify(user))
      return user
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Change password
   * POST /auth/change-password
   */
  changePassword: async (currentPassword, newPassword) => {
    try {
      await apiClient.post('/auth/change-password', { currentPassword, newPassword })
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Request password reset
   * POST /auth/forgot-password
   */
  forgotPassword: async (email) => {
    try {
      await apiClient.post('/auth/forgot-password', { email })
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Reset password with token
   * POST /auth/reset-password
   */
  resetPassword: async (token, newPassword) => {
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword })
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },
}

// ============================================================================
// PROPERTY API
// ============================================================================

export const propertyApi = {
  /**
   * Get all properties with filters
   * GET /properties?page=1&limit=20&filters=...
   */
  getAll: async (filters = {}, page = 1, limit = 20) => {
    try {
      const response = await apiClient.get('/properties', {
        params: { page, limit, ...filters },
      })
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Get single property by ID
   * GET /properties/:id
   */
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/properties/${id}`)
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Create new property listing
   * POST /properties
   */
  create: async (propertyData) => {
    try {
      const response = await apiClient.post('/properties', propertyData)
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Update property
   * PUT /properties/:id
   */
  update: async (id, propertyData) => {
    try {
      const response = await apiClient.put(`/properties/${id}`, propertyData)
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Delete property
   * DELETE /properties/:id
   */
  delete: async (id) => {
    try {
      await apiClient.delete(`/properties/${id}`)
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Search properties
   * GET /properties/search?q=...
   */
  search: async (query, filters = {}) => {
    try {
      const response = await apiClient.get('/properties/search', {
        params: { q: query, ...filters },
      })
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Get featured properties
   * GET /properties/featured
   */
  getFeatured: async () => {
    try {
      const response = await apiClient.get('/properties/featured')
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Get similar properties
   * GET /properties/:id/similar
   */
  getSimilar: async (id) => {
    try {
      const response = await apiClient.get(`/properties/${id}/similar`)
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },
}

// ============================================================================
// MESSAGE API
// ============================================================================

export const messageApi = {
  /**
   * Get conversations
   * GET /messages/conversations
   */
  getConversations: async (page = 1, limit = 20) => {
    try {
      const response = await apiClient.get('/messages/conversations', {
        params: { page, limit },
      })
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Get conversation by ID with messages
   * GET /messages/conversations/:id
   */
  getConversation: async (conversationId, page = 1, limit = 50) => {
    try {
      const response = await apiClient.get(`/messages/conversations/${conversationId}`, {
        params: { page, limit },
      })
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Get messages in conversation
   * GET /messages/conversations/:id/messages
   */
  getMessages: async (conversationId, page = 1, limit = 50) => {
    try {
      const response = await apiClient.get(`/messages/conversations/${conversationId}/messages`, {
        params: { page, limit },
      })
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Send message
   * POST /messages/send
   */
  sendMessage: async (conversationId, content, attachments = []) => {
    try {
      const response = await apiClient.post('/messages/send', {
        conversationId,
        content,
        attachments,
      })
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Create conversation
   * POST /messages/conversations
   */
  createConversation: async (recipientId) => {
    try {
      const response = await apiClient.post('/messages/conversations', { recipientId })
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Mark conversation as read
   * PUT /messages/conversations/:id/read
   */
  markAsRead: async (conversationId) => {
    try {
      const response = await apiClient.put(`/messages/conversations/${conversationId}/read`)
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Delete message
   * DELETE /messages/:id
   */
  deleteMessage: async (messageId) => {
    try {
      await apiClient.delete(`/messages/${messageId}`)
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },
}

// ============================================================================
// FAVORITE API
// ============================================================================

export const favoriteApi = {
  /**
   * Get favorite properties
   * GET /favorites
   */
  getAll: async (page = 1, limit = 20) => {
    try {
      const response = await apiClient.get('/favorites', {
        params: { page, limit },
      })
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Add property to favorites
   * POST /favorites
   */
  add: async (propertyId) => {
    try {
      const response = await apiClient.post('/favorites', { propertyId })
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Remove property from favorites
   * DELETE /favorites/:propertyId
   */
  remove: async (propertyId) => {
    try {
      await apiClient.delete(`/favorites/${propertyId}`)
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Check if property is favorited
   * GET /favorites/:propertyId/check
   */
  isFavorited: async (propertyId) => {
    try {
      const response = await apiClient.get(`/favorites/${propertyId}/check`)
      return response.data.isFavorited
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },
}

// ============================================================================
// ADMIN API
// ============================================================================

export const adminApi = {
  /**
   * Get all users
   * GET /admin/users
   */
  getUsers: async (page = 1, limit = 20, filters = {}) => {
    try {
      const response = await apiClient.get('/admin/users', {
        params: { page, limit, ...filters },
      })
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Get user details
   * GET /admin/users/:id
   */
  getUser: async (userId) => {
    try {
      const response = await apiClient.get(`/admin/users/${userId}`)
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Get all listings
   * GET /admin/listings
   */
  getListings: async (page = 1, limit = 20, filters = {}) => {
    try {
      const response = await apiClient.get('/admin/listings', {
        params: { page, limit, ...filters },
      })
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Approve listing
   * PUT /admin/listings/:id/approve
   */
  approveListing: async (listingId) => {
    try {
      const response = await apiClient.put(`/admin/listings/${listingId}/approve`)
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Reject listing
   * PUT /admin/listings/:id/reject
   */
  rejectListing: async (listingId, reason) => {
    try {
      const response = await apiClient.put(`/admin/listings/${listingId}/reject`, { reason })
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Get analytics
   * GET /admin/analytics
   */
  getAnalytics: async (period = 'month') => {
    try {
      const response = await apiClient.get('/admin/analytics', {
        params: { period },
      })
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Get system health
   * GET /admin/health
   */
  getHealth: async () => {
    try {
      const response = await apiClient.get('/admin/health')
      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },
}

// ============================================================================
// UPLOAD API
// ============================================================================

export const uploadApi = {
  /**
   * Upload single file
   * POST /upload
   */
  uploadFile: async (file, fileType = 'image') => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', fileType)

      const response = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          return percentCompleted
        },
      })

      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Upload multiple files
   * POST /upload/batch
   */
  uploadFiles: async (files, fileType = 'image') => {
    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })
      formData.append('type', fileType)

      const response = await apiClient.post('/upload/batch', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      return response.data
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },

  /**
   * Delete uploaded file
   * DELETE /upload/:id
   */
  deleteFile: async (fileId) => {
    try {
      await apiClient.delete(`/upload/${fileId}`)
    } catch (error) {
      throw errorHandler.handle(error)
    }
  },
}

export default apiClient

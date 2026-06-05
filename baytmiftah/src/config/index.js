/**
 * Backend API Configuration
 * Manages environment-specific settings and API gateway configuration
 */

const ENV = import.meta.env.MODE || 'development'
const isDevelopment = ENV === 'development'
const isProduction = ENV === 'production'
const isTesting = ENV === 'test'

const CONFIG = {
  development: {
    apiUrl: 'http://localhost:3001/api',
    authServiceUrl: 'http://localhost:3001',
    storageServiceUrl: 'http://localhost:3002',
    wsUrl: 'ws://localhost:3001',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    enableMocking: false,
  },
  production: {
    apiUrl: import.meta.env.VITE_API_URL || 'https://api.baytmiftah.com/api',
    authServiceUrl: import.meta.env.VITE_AUTH_SERVICE_URL || 'https://api.baytmiftah.com',
    storageServiceUrl: import.meta.env.VITE_STORAGE_SERVICE_URL || 'https://storage.baytmiftah.com',
    wsUrl: import.meta.env.VITE_WS_URL || 'wss://api.baytmiftah.com',
    timeout: 20000,
    retryAttempts: 2,
    retryDelay: 2000,
    enableMocking: false,
  },
  test: {
    apiUrl: 'http://localhost:3001/api',
    authServiceUrl: 'http://localhost:3001',
    storageServiceUrl: 'http://localhost:3002',
    wsUrl: 'ws://localhost:3001',
    timeout: 5000,
    retryAttempts: 1,
    retryDelay: 100,
    enableMocking: true,
  },
}

const currentConfig = CONFIG[ENV] || CONFIG.development

/**
 * File upload configuration
 */
export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedDocumentTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  allowedVideoTypes: ['video/mp4', 'video/quicktime'],
  chunkSize: 1024 * 1024, // 1MB chunks for large uploads
}

/**
 * Authentication configuration
 */
export const AUTH_CONFIG = {
  tokenStorageKey: 'baytmiftah_token',
  refreshTokenStorageKey: 'baytmiftah_refresh_token',
  userStorageKey: 'baytmiftah_user',
  tokenExpiryKey: 'baytmiftah_token_expiry',
  tokenRefreshBuffer: 5 * 60 * 1000, // Refresh 5 min before expiry
  maxRefreshRetries: 3,
}

/**
 * Pagination configuration
 */
export const PAGINATION_CONFIG = {
  defaultPageSize: 20,
  maxPageSize: 100,
  defaultPage: 1,
}

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
  maxRequests: 100,
  timeWindow: 60 * 1000, // 1 minute
  retryAfter: 30 * 1000, // 30 seconds
}

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  enabled: true,
  ttl: 5 * 60 * 1000, // 5 minutes
  keyPrefix: 'baytmiftah_cache_',
  storage: 'localStorage', // or 'sessionStorage' or 'memory'
}

/**
 * WebSocket configuration
 */
export const WS_CONFIG = {
  reconnectAttempts: 5,
  reconnectDelay: 3000,
  messageBufferSize: 100,
  heartbeatInterval: 30000,
}

/**
 * Feature flags
 */
export const FEATURE_FLAGS = {
  enableRealTimeMessaging: true,
  enableOfflineMode: true,
  enablePushNotifications: true,
  enableAnalytics: !isDevelopment,
  enableErrorReporting: isProduction,
  enableMockData: isTesting,
  enable2FA: true,
  enableBiometric: true,
  enableAdminPanel: true,
  enableAdvancedSearch: true,
}

/**
 * API endpoint versioning
 */
export const API_VERSIONS = {
  current: 'v1',
  supported: ['v1'],
}

/**
 * Get current configuration
 */
export function getConfig() {
  return {
    ...currentConfig,
    env: ENV,
    isDevelopment,
    isProduction,
    isTesting,
  }
}

/**
 * Get API base URL
 */
export function getApiUrl() {
  return currentConfig.apiUrl
}

/**
 * Get auth service URL
 */
export function getAuthServiceUrl() {
  return currentConfig.authServiceUrl
}

/**
 * Get WebSocket URL
 */
export function getWebSocketUrl() {
  return currentConfig.wsUrl
}

/**
 * Get timeout value
 */
export function getTimeout() {
  return currentConfig.timeout
}

/**
 * Get retry configuration
 */
export function getRetryConfig() {
  return {
    attempts: currentConfig.retryAttempts,
    delay: currentConfig.retryDelay,
  }
}

export default {
  getConfig,
  getApiUrl,
  getAuthServiceUrl,
  getWebSocketUrl,
  getTimeout,
  getRetryConfig,
  UPLOAD_CONFIG,
  AUTH_CONFIG,
  PAGINATION_CONFIG,
  RATE_LIMIT_CONFIG,
  CACHE_CONFIG,
  WS_CONFIG,
  FEATURE_FLAGS,
  API_VERSIONS,
}

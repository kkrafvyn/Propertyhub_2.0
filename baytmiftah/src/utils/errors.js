// Error classes and handling utilities

export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date()
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
    }
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, null)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Permission denied') {
    super(message, 403, null)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, null)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 409, details)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', retryAfter = 60) {
    super(message, 429, { retryAfter })
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

export class ServerError extends AppError {
  constructor(message = 'Internal server error', details = null) {
    super(message, 500, details)
    this.name = 'ServerError'
  }
}

// Error handler utility
export const errorHandler = {
  handle: (error) => {
    if (error instanceof AppError) {
      return {
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
      }
    }

    if (error.response) {
      // API error
      const { status, data } = error.response
      return {
        message: data?.message || 'An error occurred',
        statusCode: status,
        details: data?.details,
      }
    }

    if (error.request) {
      // Network error
      return {
        message: 'Network error. Please check your connection.',
        statusCode: 0,
        details: null,
      }
    }

    // Unknown error
    return {
      message: error.message || 'An unexpected error occurred',
      statusCode: 500,
      details: null,
    }
  },

  isClientError: (statusCode) => statusCode >= 400 && statusCode < 500,
  isServerError: (statusCode) => statusCode >= 500,
  isNetworkError: (statusCode) => statusCode === 0,

  isRetryable: (error) => {
    if (error instanceof RateLimitError) return true
    if (error.response?.status === 408) return true // Request timeout
    if (error.response?.status === 429) return true // Rate limit
    if (error.response?.status >= 500) return true // Server error
    return false
  },
}

// Error logging utility
export const errorLogger = {
  log: (error, context = {}) => {
    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }

    console.error('Error logged:', errorData)

    // Send to error tracking service (e.g., Sentry)
    if (window.__errorTracker) {
      window.__errorTracker.captureException(error, {
        tags: context,
      })
    }
  },

  warn: (message, context = {}) => {
    console.warn(message, context)
  },

  info: (message, context = {}) => {
    console.info(message, context)
  },
}

// Async error wrapper for API calls
export const asyncHandler = (fn) => {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      errorLogger.log(error)
      throw errorHandler.handle(error)
    }
  }
}

// Retry utility
export const retryWithExponentialBackoff = async (
  fn,
  maxRetries = 3,
  baseDelay = 1000
) => {
  let lastError

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (!errorHandler.isRetryable(error) || i === maxRetries - 1) {
        throw error
      }

      const delay = baseDelay * Math.pow(2, i)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Form validation error handler
export const getValidationErrors = (error) => {
  if (error instanceof ValidationError && error.details) {
    return error.details
  }

  if (error.response?.data?.errors) {
    return error.response.data.errors
  }

  return {}
}

// User-friendly error messages
export const getUserMessage = (error) => {
  const handled = errorHandler.handle(error)

  const messages = {
    400: 'Invalid input. Please check your data.',
    401: 'Please log in to continue.',
    403: 'You do not have permission for this action.',
    404: 'The requested resource was not found.',
    409: 'This resource already exists.',
    429: 'Too many requests. Please try again later.',
    500: 'Server error. Please try again later.',
    0: 'Network error. Please check your connection.',
  }

  return messages[handled.statusCode] || handled.message
}

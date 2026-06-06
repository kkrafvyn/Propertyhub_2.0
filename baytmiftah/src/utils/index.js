// Format currency in USD
export const formatCurrency = (amount) => {
  if (!amount) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

// Format large numbers (e.g., 1.2M, 1K)
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}

// Format date
export const formatDate = (date) => {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

// Format relative time (e.g., "2 mins ago")
export const formatRelativeTime = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + 'y ago'
  
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + ' months ago'
  
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + 'd ago'
  
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + 'h ago'
  
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + 'min ago'
  
  return Math.floor(seconds) + 's ago'
}

// Validation functions
export const validators = {
  email: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email) ? '' : 'Invalid email address'
  },
  password: (password) => {
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(password)) return 'Password must contain uppercase letter'
    if (!/[0-9]/.test(password)) return 'Password must contain number'
    return ''
  },
  phone: (phone) => {
    const regex = /^[\d+\-\s()]+$/
    return regex.test(phone) ? '' : 'Invalid phone number'
  },
  required: (value) => {
    return value && value.trim() ? '' : 'This field is required'
  },
  minLength: (value, min) => {
    return value && value.length >= min ? '' : `Minimum ${min} characters`
  },
  maxLength: (value, max) => {
    return value && value.length <= max ? '' : `Maximum ${max} characters`
  },
  price: (price) => {
    return price && parseFloat(price) > 0 ? '' : 'Price must be greater than 0'
  },
}

// Deep clone object
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}

// Check if object is empty
export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0
}

// Merge objects
export const mergeObjects = (target, source) => {
  return { ...target, ...source }
}

// Get query parameters from URL
export const getQueryParams = () => {
  const params = new URLSearchParams(window.location.search)
  const result = {}
  for (let [key, value] of params) {
    result[key] = value
  }
  return result
}

// Set query parameters in URL
export const setQueryParams = (params) => {
  const query = new URLSearchParams(params).toString()
  window.history.replaceState({}, '', `${window.location.pathname}?${query}`)
}

// Truncate text
export const truncateText = (text, length = 100) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

// Generate unique ID
export const generateId = () => {
  return '_' + Math.random().toString(36).substr(2, 9)
}

// Debounce function
export const debounce = (func, delay = 300) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Throttle function
export const throttle = (func, limit = 300) => {
  let inThrottle
  return (...args) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Sleep/delay utility
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Local storage utilities
export const storage = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error saving to localStorage: ${error}`)
    }
  },
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`Error reading from localStorage: ${error}`)
      return defaultValue
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Error removing from localStorage: ${error}`)
    }
  },
  clear: () => {
    try {
      localStorage.clear()
    } catch (error) {
      console.error(`Error clearing localStorage: ${error}`)
    }
  },
}

// HTTP methods
export const http = {
  buildUrl: (baseUrl, params) => {
    const url = new URL(baseUrl)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value)
      }
    })
    return url.toString()
  },
}

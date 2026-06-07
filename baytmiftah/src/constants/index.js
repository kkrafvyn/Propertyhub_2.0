export {
  AGENCY_MANAGER_ROLES,
  AGENCY_ROLES,
  PLATFORM_ADMIN_ROLES,
  SELF_SERVE_ROLES,
  USER_ROLES,
  normalizeRole,
} from '../lib/roles'

// Property Types
export const PROPERTY_TYPES = {
  VILLA: 'villa',
  PENTHOUSE: 'penthouse',
  APARTMENT: 'apartment',
  TOWNHOUSE: 'townhouse',
  OFFICE: 'office',
  RETAIL: 'retail',
  LAND: 'land',
}

// Listing Status
export const LISTING_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  UNDER_OFFER: 'under_offer',
  SOLD: 'sold',
  REMOVED: 'removed',
}

// Verification Status
export const VERIFICATION_STATUS = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
}

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  DOCUMENT: 'document',
  SYSTEM: 'system',
}

// Price Ranges
export const PRICE_RANGES = [
  { label: 'Under 500K', min: 0, max: 500000 },
  { label: '500K - 1M', min: 500000, max: 1000000 },
  { label: '1M - 2M', min: 1000000, max: 2000000 },
  { label: '2M - 5M', min: 2000000, max: 5000000 },
  { label: 'Above 5M', min: 5000000, max: Infinity },
]

// Amenities
export const AMENITIES = [
  { id: 'gym', label: 'Gym', icon: 'fitness_center' },
  { id: 'pool', label: 'Swimming Pool', icon: 'pool' },
  { id: 'garden', label: 'Garden', icon: 'grass' },
  { id: 'parking', label: 'Parking', icon: 'local_parking' },
  { id: 'security', label: '24/7 Security', icon: 'security' },
  { id: 'concierge', label: 'Concierge', icon: 'support_agent' },
  { id: 'restaurant', label: 'Restaurant', icon: 'restaurant' },
  { id: 'spa', label: 'Spa', icon: 'self_care' },
]

// Navigation Routes
export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  HOME: '/',
  EXPLORE: '/explore',
  PROPERTY_DETAILS: '/property/:id',
  MESSAGES: '/messages',
  FAVORITES: '/favorites',
  BOOKINGS: '/bookings',
  SUPPORT: '/support',
  NOTIFICATIONS: '/notifications',
  AGENT_DASHBOARD: '/agent/dashboard',
  PORTFOLIO: '/portfolio',
  PROFILE: '/profile',
  MY_LISTINGS: '/my-listings',
  CREATE_LISTING: '/create-listing',
  AGENCY: '/agency',
  AGENCY_ONBOARDING: '/agency/onboarding',
  AGENCY_DASHBOARD: '/agency/dashboard',
  AGENCY_PROPERTIES: '/agency/properties',
  AGENCY_TEAM: '/agency/team',
  AGENCY_LEADS: '/agency/leads',
  AGENCY_ANALYTICS: '/agency/analytics',
  SMART_PROPERTY: '/smart-property',
  SMART_DEVICES: '/smart-property/devices',
  SMART_ADD_DEVICE: '/smart-property/add-device',
  SMART_DEVICE_DETAILS: '/smart-property/device/:deviceId',
  SMART_AUTOMATION: '/smart-property/automation',
  SMART_ALERTS: '/smart-property/alerts',
  SMART_LOGS: '/smart-property/logs',
  ADMIN: '/admin',
  ADMIN_AGENCIES: '/admin/agencies',
}

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  LOGOUT: '/auth/logout',
  PROFILE: '/auth/profile',

  // Properties
  PROPERTIES: '/properties',
  PROPERTY_BY_ID: '/properties/:id',
  SEARCH_PROPERTIES: '/properties/search',

  // Messages
  CONVERSATIONS: '/messages/conversations',
  MESSAGES_BY_CONVERSATION: '/messages/conversations/:conversationId',

  // Favorites
  FAVORITES: '/favorites',
  FAVORITE_BY_ID: '/favorites/:id',

  // Admin
  ADMIN_USERS: '/admin/users',
  ADMIN_USER_BY_ID: '/admin/users/:id',
  ADMIN_LISTINGS: '/admin/listings',
  ADMIN_ANALYTICS: '/admin/analytics',
}

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
}

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
}

// Debounce & Throttle Delays
export const DELAYS = {
  SEARCH_DEBOUNCE: 300,
  SCROLL_THROTTLE: 150,
  FORM_DEBOUNCE: 500,
}

// Local Storage Keys
export const STORAGE_KEYS = {
  USER: 'baytmiftah_user',
  TOKEN: 'baytmiftah_token',
  FAVORITES: 'baytmiftah_favorites',
  PREFERENCES: 'baytmiftah_preferences',
  RECENT_SEARCHES: 'baytmiftah_recent_searches',
}

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  DEFAULT_SORT: 'created_at',
  DEFAULT_SORT_ORDER: 'desc',
}

// Timeouts
export const TIMEOUTS = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 10000,
}

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_2FA: true,
  ENABLE_BIOMETRIC: true,
  ENABLE_MESSAGING: true,
  ENABLE_ADMIN_PANEL: true,
  ENABLE_ANALYTICS: true,
  USE_MOCK_API: false,
}

// Default Values
export const DEFAULTS = {
  ITEMS_PER_PAGE: 10,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGES_COUNT: 10,
  SEARCH_DEBOUNCE: 300,
}

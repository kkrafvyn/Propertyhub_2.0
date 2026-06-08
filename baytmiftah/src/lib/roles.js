export const USER_ROLES = {
  BUYER: 'buyer',
  RENTER: 'renter',
  PROPERTY_OWNER: 'property_owner',
  INDEPENDENT_AGENT: 'independent_agent',
  AGENCY_OWNER: 'agency_owner',
  AGENCY_MANAGER: 'agency_manager',
  AGENCY_AGENT: 'agency_agent',
  AGENCY_SUPPORT: 'agency_support',
  PROPERTY_DEVELOPER: 'property_developer',
  PROPERTY_MANAGER: 'property_manager',
  PLATFORM_ADMIN: 'platform_admin',
  SUPER_ADMIN: 'super_admin',
}

export const LEGACY_ROLE_MAP = {
  admin: USER_ROLES.PLATFORM_ADMIN,
  agency_admin: USER_ROLES.AGENCY_MANAGER,
  agent: USER_ROLES.INDEPENDENT_AGENT,
  owner: USER_ROLES.PROPERTY_OWNER,
}

export const PLATFORM_ADMIN_ROLES = [
  USER_ROLES.PLATFORM_ADMIN,
  USER_ROLES.SUPER_ADMIN,
]

export const CUSTOMER_ROLES = [
  USER_ROLES.BUYER,
  USER_ROLES.RENTER,
]

export const OWNER_ROLES = [
  USER_ROLES.PROPERTY_OWNER,
  USER_ROLES.PROPERTY_MANAGER,
]

export const AGENT_ROLES = [
  USER_ROLES.INDEPENDENT_AGENT,
  USER_ROLES.AGENCY_AGENT,
  USER_ROLES.AGENCY_SUPPORT,
]

export const AGENCY_ROLES = [
  USER_ROLES.AGENCY_OWNER,
  USER_ROLES.AGENCY_MANAGER,
  USER_ROLES.AGENCY_AGENT,
  USER_ROLES.AGENCY_SUPPORT,
]

export const AGENCY_MANAGER_ROLES = [
  USER_ROLES.AGENCY_OWNER,
  USER_ROLES.AGENCY_MANAGER,
]

export const SELF_SERVE_ROLES = [
  USER_ROLES.BUYER,
  USER_ROLES.RENTER,
  USER_ROLES.PROPERTY_OWNER,
  USER_ROLES.INDEPENDENT_AGENT,
  USER_ROLES.PROPERTY_DEVELOPER,
  USER_ROLES.PROPERTY_MANAGER,
]

export function normalizeRole(role) {
  return LEGACY_ROLE_MAP[role] || role || USER_ROLES.BUYER
}

export function getRoleGroup(role) {
  const normalizedRole = normalizeRole(role)

  if (PLATFORM_ADMIN_ROLES.includes(normalizedRole)) return 'admin'
  if (AGENCY_ROLES.includes(normalizedRole)) return 'agency'
  if (OWNER_ROLES.includes(normalizedRole)) return 'owner'
  if (normalizedRole === USER_ROLES.PROPERTY_DEVELOPER) return 'developer'
  if (normalizedRole === USER_ROLES.INDEPENDENT_AGENT) return 'agent'
  if (CUSTOMER_ROLES.includes(normalizedRole)) return 'customer'

  return 'customer'
}

export function getRoleHomePath(role) {
  const roleGroup = getRoleGroup(role)

  return {
    admin: '/admin',
    agency: '/agency/dashboard',
    owner: '/owner',
    developer: '/developer-launch',
    agent: '/agent/dashboard',
    customer: '/',
  }[roleGroup]
}

import { USER_ROLES, ROLE_HOME_PATHS } from '../platform/registry'

export function getUserRole(user, profile) {
  if (!user) return null
  return (
    profile?.role ||
    user.app_metadata?.role ||
    user.user_metadata?.role ||
    USER_ROLES.CONSUMER
  )
}

export function getRoleHomePath(user, profile) {
  const role = getUserRole(user, profile)
  return ROLE_HOME_PATHS[role] || '/'
}

export function isAgentRole(role) {
  return [
    USER_ROLES.INDEPENDENT_AGENT,
    USER_ROLES.AGENCY_AGENT,
  ].includes(role)
}

export function isAgencyRole(role) {
  return [
    USER_ROLES.AGENCY_OWNER,
    USER_ROLES.AGENCY_MANAGER,
    USER_ROLES.AGENCY_AGENT,
  ].includes(role)
}

/** Full platform admin — all admin capabilities including user promotion */
export function isFullAdminRole(role) {
  return role === USER_ROLES.PLATFORM_ADMIN
}

/** Limited platform moderator — trust & safety tasks only */
export function isLimitedAdminRole(role) {
  return role === USER_ROLES.PLATFORM_MODERATOR
}

/** Any platform staff (full admin or limited moderator) */
export function isStaffRole(role) {
  return isFullAdminRole(role) || isLimitedAdminRole(role)
}

/** @deprecated Use isFullAdminRole or isStaffRole */
export function isAdminRole(role) {
  return isFullAdminRole(role)
}

export function isManageRole(role) {
  return [
    USER_ROLES.PROPERTY_OWNER,
    USER_ROLES.PROPERTY_MANAGER,
  ].includes(role)
}

export function isRenterRole(role) {
  return role === USER_ROLES.RENTER
}

/** Personal-use roles — unified consumer experience (not real estate professionals) */
export function isConsumerPersona(role) {
  return [
    USER_ROLES.CONSUMER,
    USER_ROLES.BUYER,
    USER_ROLES.RENTER,
    USER_ROLES.INVESTOR,
  ].includes(role)
}

/** Agent, agency, PMS, developer, enterprise, platform staff */
export function isProfessionalRole(role) {
  return !isConsumerPersona(role) && role != null
}

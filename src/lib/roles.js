import { USER_ROLES, ROLE_HOME_PATHS } from '../platform/registry'

export function getUserRole(user, profile) {
  if (!user) return null
  return (
    profile?.role ||
    user.app_metadata?.role ||
    user.user_metadata?.role ||
    USER_ROLES.BUYER
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

export function isAdminRole(role) {
  return role === USER_ROLES.PLATFORM_ADMIN
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

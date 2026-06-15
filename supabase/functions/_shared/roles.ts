export const FULL_ADMIN_ROLES = new Set(['platform_admin'])
export const STAFF_ROLES = new Set(['platform_admin', 'platform_moderator'])

export const MODERATOR_ROLES = new Set([
  'agency_owner',
  'agency_manager',
  'platform_admin',
  'platform_moderator',
])

export const PROMOTABLE_ROLES = [
  'consumer',
  'buyer',
  'renter',
  'investor',
  'independent_agent',
  'agency_owner',
  'agency_manager',
  'agency_agent',
  'property_owner',
  'property_manager',
  'developer',
  'enterprise_operator',
  'platform_moderator',
  'platform_admin',
]

export async function getProfileRole(
  // deno-lint-ignore no-explicit-any
  admin: any,
  userId: string,
) {
  const { data } = await admin.from('user_profiles').select('role').eq('id', userId).maybeSingle()
  return data?.role ?? ''
}

export function isStaffRole(role: string) {
  return STAFF_ROLES.has(role)
}

export function isFullAdminRole(role: string) {
  return FULL_ADMIN_ROLES.has(role)
}

export function canAssignRole(actorRole: string, targetRole: string) {
  if (!isFullAdminRole(actorRole)) return false
  if (!PROMOTABLE_ROLES.includes(targetRole)) return false
  return true
}

import { fetchUserProfile } from './supabase-db'
import { getRoleHomePath } from './roles'

const GENERIC_PATHS = new Set(['/', '/login', '/signup', '/auth/callback', '/forgot-password'])

/** True when the user was sent to login from a specific page worth returning to. */
export function isReturnPath(path) {
  if (!path || typeof path !== 'string') return false
  if (!path.startsWith('/')) return false
  return !GENERIC_PATHS.has(path)
}

/** After sign-in, go back to the protected page or the user's role dashboard. */
export async function resolvePostLoginPath(user, { from, profile } = {}) {
  if (isReturnPath(from)) return from

  const resolvedProfile = profile ?? (user?.id ? await fetchUserProfile(user.id) : null)
  return getRoleHomePath(user, resolvedProfile) || '/'
}

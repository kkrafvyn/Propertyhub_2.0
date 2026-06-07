export function normalizeSupabaseUser(user) {
  if (!user) return null

  const metadata = user.user_metadata || {}
  const appMetadata = user.app_metadata || {}

  return {
    ...user,
    name: metadata.display_name || metadata.name || user.email,
    role: appMetadata.role || 'buyer',
    agency_id: appMetadata.agency_id || null,
    verified: Boolean(appMetadata.verified || metadata.verified || user.email_confirmed_at),
  }
}

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MANAGE_ROLES = new Set([
  'property_owner',
  'property_manager',
  'independent_agent',
  'agency_agent',
  'agency_manager',
  'agency_owner',
  'platform_moderator',
  'platform_admin',
])

const AGENCY_WIDE_ROLES = new Set(['agency_owner', 'agency_manager', 'platform_moderator', 'platform_admin'])

export async function canManageListing(
  admin: SupabaseClient,
  userId: string,
  listingId: string,
) {
  const { data: listing } = await admin
    .from('listings')
    .select('submitted_by, owner_id')
    .eq('id', listingId)
    .maybeSingle()

  if (!listing) return false
  if (listing.submitted_by === userId || listing.owner_id === userId) return true

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', userId).maybeSingle()
  const role = profile?.role ?? ''
  if (!MANAGE_ROLES.has(role)) return false
  if (AGENCY_WIDE_ROLES.has(role)) return true
  return listing.submitted_by === userId
}

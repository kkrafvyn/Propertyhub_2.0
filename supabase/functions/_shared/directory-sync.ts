/** Sync public directory_profiles from live agency/agent data */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

function slugId(prefix: string, name: string) {
  return `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}`
}

export async function syncDirectoryProfiles(admin: SupabaseClient) {
  let agenciesSynced = 0
  let agentsSynced = 0

  const { data: agencyUsers } = await admin
    .from('user_profiles')
    .select('id, email, display_name, role, agency_id')
    .in('role', ['agency', 'admin'])
    .limit(100)

  for (const profile of agencyUsers ?? []) {
    const name = profile.display_name || profile.email?.split('@')[0] || 'Agency'
    const id = profile.agency_id || slugId('agency', name)
    const { count: listings } = await admin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('submitted_by', profile.id)
      .eq('status', 'active')

    const { data: kyc } = await admin
      .from('kyc_records')
      .select('status, entity_type')
      .eq('user_id', profile.id)
      .eq('status', 'verified')
      .limit(1)
      .maybeSingle()

    await admin.from('directory_profiles').upsert({
      id,
      profile_type: 'agency',
      name,
      location: 'Accra, Ghana',
      bio: `${name} on BaytMiftah`,
      verified: Boolean(kyc),
      specialties: ['Residential', 'Commercial'],
      active_listings: listings ?? 0,
      rating: 4.5,
      user_id: profile.id,
    })
    agenciesSynced += 1
  }

  const { data: team } = await admin.from('agency_team').select('*').limit(200)
  for (const member of team ?? []) {
    const id = slugId('agent', member.name || member.email || member.id)
    let userId = member.user_id ?? null
    if (!userId && member.email) {
      const { data: prof } = await admin.from('user_profiles').select('id').eq('email', member.email).maybeSingle()
      userId = prof?.id ?? null
    }

    await admin.from('directory_profiles').upsert({
      id,
      profile_type: 'agent',
      name: member.name || member.email?.split('@')[0] || 'Agent',
      agency_id: member.agency_id,
      agency_name: member.agency_id?.replace(/-/g, ' ') ?? 'Agency',
      bio: `${member.role || 'Agent'} at BaytMiftah`,
      verified: member.status === 'active',
      specialties: [member.role || 'Sales'],
      deals_closed: 0,
      rating: 4.6,
      phone: member.phone ?? null,
      user_id: userId,
    })
    agentsSynced += 1
  }

  return { agenciesSynced, agentsSynced }
}

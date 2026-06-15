import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import { demoOrganizations } from '../data/os-platform'

export async function fetchOrganizations() {
  try {
    const payload = await callEdgeFunction('organizations', { allowAnonymous: false, query: { action: 'list' } })
    if (payload?.organizations) return payload
  } catch { /* fallback */ }

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('org_id, role, organizations(*)')
        .eq('user_id', user.id)
      if (memberships?.length) {
        return {
          organizations: memberships.map((m) => ({
            ...m.organizations,
            memberRole: m.role,
          })),
          source: 'supabase',
        }
      }
    }
  }

  return { organizations: demoOrganizations, source: 'local' }
}

export async function fetchOrganizationMembers(orgId) {
  try {
    const payload = await callEdgeFunction('organizations', {
      allowAnonymous: false,
      query: { action: 'members', org_id: orgId },
    })
    if (payload?.members) return payload
  } catch { /* fallback */ }
  return { members: [], source: 'local' }
}

export async function createOrganization({ name, slug, country = 'GH' }) {
  return callEdgeFunction('organizations', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'create', name, slug, country },
  })
}

export async function inviteOrganizationMember({ orgId, email, role = 'member' }) {
  return callEdgeFunction('organizations', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'invite', org_id: orgId, email, role },
  })
}

export async function fetchOrganizationPermissions(orgId) {
  try {
    const payload = await callEdgeFunction('organizations', {
      allowAnonymous: false,
      query: { action: 'permissions', org_id: orgId },
    })
    if (payload?.permissions) return payload
  } catch { /* fallback */ }
  return {
    permissions: [
      { role: 'owner', permission: 'manage_all' },
      { role: 'admin', permission: 'manage_members' },
      { role: 'member', permission: 'view_portfolios' },
    ],
    source: 'local',
  }
}

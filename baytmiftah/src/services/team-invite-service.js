import { callEdgeFunction } from './edge-client'

const INVITE_KEY = 'baytmiftah_team_invites'

const syncTeamInvite = (invite) =>
  callEdgeFunction('persistence', {
    method: 'POST',
    query: { action: 'save', type: 'team_invite' },
    body: invite,
  })

export function getTeamInvites() {
  try {
    return JSON.parse(localStorage.getItem(INVITE_KEY) || '[]')
  } catch {
    return []
  }
}

export async function createTeamInvite(payload) {
  const invite = {
    id: `invite-${Date.now()}`,
    status: 'pending',
    created_at: new Date().toISOString(),
    ...payload,
  }
  const next = [invite, ...getTeamInvites()].slice(0, 20)
  localStorage.setItem(INVITE_KEY, JSON.stringify(next))

  try {
    const remote = await syncTeamInvite(invite)
    return { invite: { ...invite, ...remote }, source: 'supabase' }
  } catch (error) {
    return { invite, source: 'local', error: error.message }
  }
}

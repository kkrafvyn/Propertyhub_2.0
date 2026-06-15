import { callEdgeFunction } from '../lib/edge-client'
import { fetchDeveloperUnitsFromDb } from '../lib/supabase-db'
import { developerProfile, developerProjects, constructionMilestones, developerBuyers, developerUnits } from '../data/developer'

export async function fetchDeveloperDashboard() {
  try {
    const payload = await callEdgeFunction('developer', {
      allowAnonymous: false,
      query: { action: 'dashboard' },
    })
    if (payload?.profile) return { ...payload, source: 'supabase' }
  } catch { /* fallback */ }
  return { profile: developerProfile, source: 'local' }
}

export async function fetchProjects() {
  try {
    const payload = await callEdgeFunction('developer', {
      allowAnonymous: false,
      query: { action: 'projects' },
    })
    if (payload?.projects?.length) return { projects: payload.projects, source: 'supabase' }
  } catch { /* fallback */ }
  return { projects: developerProjects, source: 'local' }
}

export async function fetchProjectUnits(projectId) {
  const rows = await fetchDeveloperUnitsFromDb(projectId)
  if (rows?.length) return { units: rows, source: 'supabase' }

  try {
    const payload = await callEdgeFunction('developer', {
      allowAnonymous: false,
      query: { action: 'units', project_id: projectId },
    })
    if (payload?.units?.length) return { units: payload.units, source: 'supabase' }
  } catch { /* fallback */ }

  const filtered = projectId
    ? developerUnits.filter((u) => u.project_id === projectId)
    : developerUnits
  return { units: filtered, source: 'local' }
}

export async function fetchConstruction() {
  try {
    const payload = await callEdgeFunction('developer', {
      allowAnonymous: false,
      query: { action: 'construction' },
    })
    if (payload?.milestones?.length) return { milestones: payload.milestones, source: 'supabase' }
  } catch { /* fallback */ }
  return { milestones: constructionMilestones, source: 'local' }
}

export async function fetchDeveloperBuyers() {
  try {
    const payload = await callEdgeFunction('developer', {
      allowAnonymous: false,
      query: { action: 'buyers' },
    })
    if (payload?.buyers?.length) return { buyers: payload.buyers, source: 'supabase' }
  } catch { /* fallback */ }
  return { buyers: developerBuyers, source: 'local' }
}

export async function notifyBuyersOfMilestone(milestone) {
  try {
    return await callEdgeFunction('developer', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'notify_milestone', milestone },
    })
  } catch {
    const { sendEmail } = await import('./email-service')
    const buyers = developerBuyers.filter((b) => b.project === milestone.project)
    await Promise.all(
      buyers.map((b) =>
        sendEmail({
          to: `${b.name.replace(/\s/g, '').toLowerCase()}@example.com`,
          subject: `Construction update — ${milestone.milestone}`,
          body: `<p>${milestone.project}: <strong>${milestone.milestone}</strong> is now <strong>${milestone.status.replace('_', ' ')}</strong>.</p><p>View your buyer portal for payment schedule updates.</p>`,
        }),
      ),
    )
    return { ok: true, notified: buyers.length, source: 'local' }
  }
}

export default { fetchDeveloperDashboard, fetchProjects, fetchProjectUnits, fetchConstruction, fetchDeveloperBuyers, notifyBuyersOfMilestone }

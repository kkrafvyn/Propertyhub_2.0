import { callEdgeFunction } from '../lib/edge-client'
import { enterpriseOrg, portfolios, esgMetrics, revenueForecast } from '../data/enterprise-platform'

export async function fetchEnterpriseDashboard() {
  try {
    const payload = await callEdgeFunction('enterprise', {
      allowAnonymous: false,
      query: { action: 'dashboard' },
    })
    if (payload?.org) return { ...payload, source: 'supabase' }
  } catch { /* fallback */ }
  return { org: enterpriseOrg, source: 'local' }
}

export async function fetchPortfolios() {
  try {
    const payload = await callEdgeFunction('enterprise', {
      allowAnonymous: false,
      query: { action: 'portfolios' },
    })
    if (payload?.portfolios) return { portfolios: payload.portfolios, source: 'supabase' }
  } catch { /* fallback */ }
  return { portfolios, source: 'local' }
}

export async function fetchOrgLinks() {
  try {
    const payload = await callEdgeFunction('enterprise', {
      allowAnonymous: false,
      query: { action: 'org_links' },
    })
    return { links: payload?.links ?? [], source: 'supabase' }
  } catch {
    return { links: [], source: 'local' }
  }
}

export async function linkOrgPortfolio(orgId, portfolioId) {
  return callEdgeFunction('enterprise', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'link_org_portfolio', org_id: orgId, portfolio_id: portfolioId },
  })
}

export async function createPortfolio(data) {
  return callEdgeFunction('enterprise', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'create_portfolio', ...data },
  })
}

export async function fetchEsgMetrics() {
  try {
    const payload = await callEdgeFunction('enterprise', {
      allowAnonymous: false,
      query: { action: 'esg' },
    })
    if (payload?.esg) return { esg: payload.esg, source: 'supabase' }
  } catch { /* fallback */ }
  return { esg: esgMetrics, source: 'local' }
}

export async function fetchRevenueForecast() {
  try {
    const payload = await callEdgeFunction('enterprise', {
      allowAnonymous: false,
      query: { action: 'forecast' },
    })
    if (payload?.forecast?.length) return { forecast: payload.forecast, source: 'supabase' }
  } catch { /* fallback */ }
  return { forecast: revenueForecast, source: 'local' }
}

export default { fetchEnterpriseDashboard, fetchPortfolios, fetchEsgMetrics, fetchRevenueForecast, fetchOrgLinks, linkOrgPortfolio, createPortfolio }

import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import {
  demoInvestmentPortfolio,
  demoPortfolioHoldings,
} from '../data/os-platform'

export async function fetchInvestmentDashboard() {
  try {
    const payload = await callEdgeFunction('investment', { allowAnonymous: false, query: { action: 'dashboard' } })
    if (payload?.portfolio) return payload
  } catch { /* fallback */ }

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: portfolios } = await supabase.from('investment_portfolios').select('*').eq('user_id', user.id).limit(1)
      if (portfolios?.length) {
        const portfolio = portfolios[0]
        const { data: holdings } = await supabase.from('portfolio_holdings').select('*').eq('portfolio_id', portfolio.id)
        return {
          portfolio: {
            name: portfolio.name,
            holdings: holdings?.length ?? 0,
            totalValue: holdings?.reduce((s, h) => s + Number(h.cost_basis || 0), 0) ?? 0,
          },
          holdings: holdings ?? [],
          source: 'supabase',
        }
      }
    }
  }

  return {
    portfolio: demoInvestmentPortfolio,
    holdings: demoPortfolioHoldings,
    source: 'local',
  }
}

export async function runInvestmentScenario({ listingId, assumptions }) {
  try {
    return await callEdgeFunction('investment', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'scenario', listing_id: listingId, assumptions },
    })
  } catch {
    const price = assumptions?.price ?? 500000
    const rent = assumptions?.monthlyRent ?? 3500
    const capRate = ((rent * 12) / price) * 100
    return {
      projections: {
        capRate: capRate.toFixed(2),
        annualCashFlow: rent * 12,
        fiveYearAppreciation: (price * 1.28).toFixed(0),
      },
      source: 'local',
    }
  }
}

export async function savePortfolioHolding({ portfolioId, listingId, costBasis, assetRef }) {
  return callEdgeFunction('investment', {
    method: 'POST',
    allowAnonymous: false,
    body: {
      action: 'add_holding',
      portfolio_id: portfolioId,
      listing_id: listingId,
      cost_basis: costBasis,
      asset_ref: assetRef,
    },
  })
}

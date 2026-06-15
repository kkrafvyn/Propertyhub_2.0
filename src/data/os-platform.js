/** Local fallbacks when Supabase OS tables are unavailable */

export const demoWallet = {
  id: 'wal-demo',
  currency: 'GHS',
  availableBalance: 12450,
  pendingBalance: 3200,
}

export const demoWalletTransactions = [
  { id: 'wt-1', type: 'deposit', amount: 5000, status: 'completed', description: 'Rent collection', created_at: '2026-06-01' },
  { id: 'wt-2', type: 'hold', amount: 15000, status: 'pending', description: 'Escrow — Cantonments Villa', created_at: '2026-06-05' },
  { id: 'wt-3', type: 'payout', amount: 2800, status: 'completed', description: 'Host payout', created_at: '2026-06-10' },
]

export const demoHostDashboard = {
  listings: 3,
  upcomingReservations: 2,
  monthlyEarnings: 18600,
  occupancyRate: 78,
}

export const demoReservations = [
  { id: 'res-1', listing: 'East Legon Studio', guest: 'Ama K.', check_in: '2026-06-20', check_out: '2026-06-23', status: 'confirmed', total: 2400 },
  { id: 'res-2', listing: 'Airport Residential Suite', guest: 'Kwame O.', check_in: '2026-06-25', check_out: '2026-06-28', status: 'pending', total: 4200 },
]

export const demoHostPayouts = [
  { id: 'hp-1', amount: 12400, status: 'paid', created_at: '2026-06-01' },
  { id: 'hp-2', amount: 6200, status: 'pending', created_at: '2026-06-12' },
]

export const demoVisitorPasses = [
  { id: 'vp-1', guest_name: 'Sarah Mensah', valid_from: '2026-06-15T09:00:00Z', valid_to: '2026-06-15T18:00:00Z', access_code: '4829', status: 'active' },
]

export const demoAnnouncements = [
  { id: 'ann-1', title: 'Water maintenance — Block B', body: 'Scheduled maintenance on Sunday 8am–12pm.', published_at: '2026-06-10' },
]

export const demoInvestmentPortfolio = {
  name: 'Accra Core Portfolio',
  holdings: 4,
  totalValue: 2850000,
  avgCapRate: 7.2,
}

export const demoPortfolioHoldings = [
  { id: 'ph-1', listing_id: 'lst-1', asset_ref: 'East Legon 3BR', cost_basis: 850000, acquired_at: '2024-03-01' },
  { id: 'ph-2', listing_id: 'lst-2', asset_ref: 'Cantonments Commercial', cost_basis: 1200000, acquired_at: '2023-11-15' },
]

export const demoOrganizations = [
  { id: 'org-1', name: 'BaytMiftah REIT Ghana', slug: 'bm-reit-gh', country: 'GH', plan: 'enterprise', members: 12 },
  { id: 'org-2', name: 'West Africa Housing Fund', slug: 'wahf', country: 'GH', plan: 'professional', members: 8 },
]

export const demoResidentAccess = {
  doors: [{ id: 'd-1', name: 'Main entrance', status: 'locked' }, { id: 'd-2', name: 'Unit 4B', status: 'unlocked' }],
  energyKwh: 142,
  energyCost: 89,
}

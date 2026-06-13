export const LEAD_STAGES = ['lead', 'contacted', 'viewing', 'offer', 'closed']

export const agentLeads = [
  { id: 'al1', name: 'Daniel K.', property: 'Cantonments Sky Villa', stage: 'viewing', value: 125000, updated: '2h ago' },
  { id: 'al2', name: 'Sarah A.', property: 'Labone Penthouse', stage: 'offer', value: 4200000, updated: '5h ago' },
  { id: 'al3', name: 'Michael T.', property: 'East Legon Family Home', stage: 'contacted', value: 58000, updated: '1d ago' },
  { id: 'al4', name: 'Grace M.', property: 'Airport Townhouse', stage: 'lead', value: 6850000, updated: '2d ago' },
  { id: 'al5', name: 'James O.', property: 'Osu Office Suite', stage: 'closed', value: 42000, updated: '1w ago' },
]

export const agentStats = {
  activeListings: 12,
  leadsThisWeek: 8,
  viewingsScheduled: 3,
  commissionPipeline: 'GHS 142,000',
  conversionRate: '24%',
}

export const agentCalendar = [
  { id: 'c1', title: 'Viewing — Cantonments Sky Villa', date: '2026-06-14', time: '10:00', type: 'viewing' },
  { id: 'c2', title: 'Call — Sarah A.', date: '2026-06-14', time: '14:30', type: 'call' },
  { id: 'c3', title: 'Viewing — East Legon', date: '2026-06-15', time: '11:00', type: 'viewing' },
]

export const agentTasks = [
  { id: 't1', title: 'Send ownership docs to Sarah A.', due: '2026-06-13', priority: 'high', done: false },
  { id: 't2', title: 'Update Labone Penthouse photos', due: '2026-06-14', priority: 'medium', done: false },
  { id: 't3', title: 'Follow up with Daniel K.', due: '2026-06-13', priority: 'high', done: true },
]

export const agentCommissions = [
  { id: 'cm1', property: 'Osu Office Suite', amount: 8400, status: 'paid', closed: '2026-05-28' },
  { id: 'cm2', property: 'Labone Penthouse', amount: 62000, status: 'pending', closed: '—' },
  { id: 'cm3', property: 'East Legon Family Home', amount: 5800, status: 'pipeline', closed: '—' },
]

export const agentAnalytics = {
  listingViews: 1842,
  inquiries: 47,
  viewings: 12,
  offers: 5,
  closeRate: '24%',
  avgDaysOnMarket: 18,
  topListing: 'Cantonments Sky Villa',
}

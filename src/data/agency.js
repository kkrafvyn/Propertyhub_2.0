export const agencyProfile = {
  id: 'agency-gold-coast',
  name: 'Gold Coast Realty',
  verified: true,
  license: 'GRA-2024-8891',
  teamCount: 8,
  activeListings: 24,
  leadsThisMonth: 17,
  trustScore: 94,
}

export const teamMembers = [
  { id: 't1', name: 'Ama Serwaa', role: 'Agency Manager', email: 'ama@goldcoast.gh', status: 'active' },
  { id: 't2', name: 'Kwame Osei', role: 'Senior Agent', email: 'kwame@goldcoast.gh', status: 'active' },
  { id: 't3', name: 'Efua Mensah', role: 'Agent', email: 'efua@goldcoast.gh', status: 'invited' },
]

export const leads = [
  { id: 'l1', name: 'Daniel K.', property: 'Cantonments Sky Villa', stage: 'viewing', value: 'GHS 125K/mo', updated: '2h ago' },
  { id: 'l2', name: 'Sarah A.', property: 'Labone Penthouse', stage: 'offer', value: 'GHS 4.2M', updated: '1d ago' },
  { id: 'l3', name: 'Michael T.', property: 'East Legon Family Home', stage: 'new', value: 'GHS 58K/mo', updated: '3d ago' },
]

export const agencyListings = [
  { id: 'cantonments-sky-villa', title: 'Cantonments Sky Villa', status: 'active', views: 342 },
  { id: 'labone-penthouse', title: 'Labone Penthouse', status: 'active', views: 218 },
]

export const agencyBranches = [
  { id: 'b1', name: 'Accra HQ', location: 'Cantonments, Accra', manager: 'Ama Serwaa', agents: 5, listings: 14, status: 'active' },
  { id: 'b2', name: 'East Legon', location: 'East Legon, Accra', manager: 'Kwame Osei', agents: 3, listings: 8, status: 'active' },
  { id: 'b3', name: 'Kumasi', location: 'Nhyiaeso, Kumasi', manager: 'Efua Mensah', agents: 2, listings: 5, status: 'opening' },
]

export const agencyPayroll = [
  { id: 'p1', name: 'Kwame Osei', role: 'Senior Agent', base: 4500, commission: 12400, status: 'paid', period: 'May 2026' },
  { id: 'p2', name: 'Efua Mensah', role: 'Agent', base: 3200, commission: 6800, status: 'pending', period: 'May 2026' },
  { id: 'p3', name: 'Ama Serwaa', role: 'Agency Manager', base: 8500, commission: 2100, status: 'paid', period: 'May 2026' },
]

export const agencyAnalytics = {
  revenueMtd: 284000,
  revenueYtd: 1840000,
  closedDeals: 7,
  avgCommission: 6200,
  leadConversion: '18%',
  revenueByMonth: [
    { month: 'Jan', revenue: 210000 },
    { month: 'Feb', revenue: 245000 },
    { month: 'Mar', revenue: 268000 },
    { month: 'Apr', revenue: 292000 },
    { month: 'May', revenue: 284000 },
  ],
  topAgents: [
    { name: 'Kwame Osei', revenue: 98000 },
    { name: 'Efua Mensah', revenue: 72000 },
    { name: 'Ama Serwaa', revenue: 54000 },
  ],
}

export const agencyTrust = {
  score: 94,
  trend: '+2',
  factors: [
    { label: 'Verified listings', score: 98, weight: '30%' },
    { label: 'Response time', score: 92, weight: '20%' },
    { label: 'Document compliance', score: 96, weight: '25%' },
    { label: 'Client reviews', score: 89, weight: '15%' },
    { label: 'Dispute resolution', score: 91, weight: '10%' },
  ],
  badges: ['Verified agency', 'Fast responder', 'Top rated'],
  lastReview: '2026-06-01',
}

export const agencyCompliance = [
  { id: 'c1', item: 'Agency license renewal', due: '2026-08-15', status: 'compliant', owner: 'Ama Serwaa' },
  { id: 'c2', item: 'Agent KYC — Efua Mensah', due: '2026-06-20', status: 'due_soon', owner: 'HR' },
  { id: 'c3', item: 'Anti-money laundering training', due: '2026-07-01', status: 'compliant', owner: 'All agents' },
  { id: 'c4', item: 'Data protection audit', due: '2026-09-30', status: 'pending', owner: 'IT' },
]

export const documents = [
  { id: 'd1', name: 'Title deed — Cantonments Sky Villa', type: 'title', property: 'Cantonments Sky Villa', status: 'verified', updated: '2026-06-01' },
  { id: 'd2', name: 'Offer letter — Labone Penthouse', type: 'offer', property: 'Labone Penthouse', status: 'pending_signature', updated: '2026-06-10' },
  { id: 'd3', name: 'Agency license — Gold Coast Realty', type: 'license', property: '—', status: 'verified', updated: '2026-05-15' },
  { id: 'd4', name: 'Inspection report — East Legon', type: 'inspection', property: 'East Legon Family Home', status: 'draft', updated: '2026-06-11' },
]

export const pendingAgencies = [
  { id: 'a1', name: 'Horizon Estates', license: 'GRA-2026-1102', submitted: '2026-06-10', risk: 'low' },
  { id: 'a2', name: 'Cityline Properties', license: 'GRA-2026-0988', submitted: '2026-06-08', risk: 'medium' },
]

export const moderationQueue = [
  { id: 'mq1', title: 'Tema Community 25 Villa', agency: 'New Horizon', reason: 'Incomplete media', submitted: '2026-06-12' },
  { id: 'mq2', title: 'Spintex Warehouse', agency: 'Cedar Commercial', reason: 'Price mismatch', submitted: '2026-06-11' },
]

export const auditEvents = [
  { id: 'e1', action: 'agency.approved', actor: 'platform_admin', target: 'Gold Coast Realty', at: '2026-06-09T16:00:00Z' },
  { id: 'e2', action: 'listing.flagged', actor: 'system', target: 'Spintex Warehouse', at: '2026-06-11T08:30:00Z' },
]

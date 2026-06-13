export const pmsPortfolio = {
  name: 'Anchorstone Properties',
  buildings: 4,
  units: 28,
  occupancy: '89%',
  collectedMtd: 486000,
  outstanding: 42000,
}

export const tenants = [
  { id: 'tn1', name: 'Daniel K.', unit: 'Cantonments 4B', rent: 125000, leaseEnd: '2026-08-31', status: 'current', balance: 0 },
  { id: 'tn2', name: 'Sarah A.', unit: 'Labone Penthouse', rent: 4200000, leaseEnd: '2027-03-15', status: 'current', balance: 0 },
  { id: 'tn3', name: 'Michael T.', unit: 'East Legon 2A', rent: 58000, leaseEnd: '2026-06-30', status: 'notice', balance: 58000 },
  { id: 'tn4', name: 'Grace M.', unit: 'Osu Suite 12', rent: 42000, leaseEnd: '2026-12-01', status: 'current', balance: 0 },
]

export const workOrders = [
  { id: 'wo1', unit: 'Cantonments 4B', issue: 'AC repair', vendor: 'CoolAir Ghana', priority: 'high', status: 'in_progress', cost: 850, created: '2026-06-10' },
  { id: 'wo2', unit: 'East Legon 2A', issue: 'Plumbing — kitchen tap', vendor: 'FlowFix Ltd', priority: 'medium', status: 'scheduled', cost: 320, created: '2026-06-08' },
  { id: 'wo3', unit: 'Osu Suite 12', issue: 'Electrical — outlet fix', vendor: 'VoltPro', priority: 'low', status: 'completed', cost: 180, created: '2026-06-02' },
]

export const vendors = [
  { id: 'v1', name: 'CoolAir Ghana', specialty: 'HVAC', rating: 4.8, jobs: 24 },
  { id: 'v2', name: 'FlowFix Ltd', specialty: 'Plumbing', rating: 4.6, jobs: 18 },
  { id: 'v3', name: 'VoltPro', specialty: 'Electrical', rating: 4.9, jobs: 31 },
]

export const rentCollection = [
  { id: 'rc1', unit: 'Cantonments 4B', tenant: 'Daniel K.', amount: 125000, due: '2026-06-01', status: 'pending' },
  { id: 'rc2', unit: 'Labone Penthouse', tenant: 'Sarah A.', amount: 350000, due: '2026-06-01', status: 'paid' },
  { id: 'rc3', unit: 'East Legon 2A', tenant: 'Michael T.', amount: 58000, due: '2026-06-01', status: 'overdue' },
]

export const expenses = [
  { id: 'ex1', category: 'Maintenance', description: 'AC repair — Cantonments 4B', amount: 850, date: '2026-06-11' },
  { id: 'ex2', category: 'Utilities', description: 'Compound water — East Legon', amount: 2400, date: '2026-06-05' },
  { id: 'ex3', category: 'Security', description: 'Monthly guard service', amount: 12000, date: '2026-06-01' },
]

export const inspections = [
  { id: 'in1', unit: 'Cantonments 4B', type: 'Move-in', date: '2025-09-01', inspector: 'Ama Serwaa', status: 'completed', score: 96 },
  { id: 'in2', unit: 'East Legon 2A', type: 'Quarterly', date: '2026-06-15', inspector: 'Kwame Osei', status: 'scheduled', score: null },
  { id: 'in3', unit: 'Osu Suite 12', type: 'Move-out', date: '2026-05-20', inspector: 'Efua Mensah', status: 'completed', score: 88 },
]

export const renterProfile = {
  name: 'Daniel K.',
  unit: 'Cantonments Sky Villa — Unit 4B',
  landlord: 'Gold Coast Realty',
  leaseStart: '2025-09-01',
  leaseEnd: '2026-08-31',
  rentAmount: 125000,
  rentDueDay: 1,
}

export const leases = [
  {
    id: 'lease-1',
    property: 'Cantonments Sky Villa — Unit 4B',
    landlord: 'Gold Coast Realty',
    start: '2025-09-01',
    end: '2026-08-31',
    rent: 125000,
    status: 'active',
    signed: true,
  },
  {
    id: 'lease-2',
    property: 'Osu Arc Office Suite',
    landlord: 'Cedar Commercial',
    start: '2024-03-01',
    end: '2025-02-28',
    rent: 42000,
    status: 'expired',
    signed: true,
  },
]

export const rentPayments = [
  { id: 'rp1', period: 'June 2026', amount: 125000, due: '2026-06-01', status: 'due', method: null },
  { id: 'rp2', period: 'May 2026', amount: 125000, due: '2026-05-01', status: 'paid', method: 'Mobile money' },
  { id: 'rp3', period: 'April 2026', amount: 125000, due: '2026-04-01', status: 'paid', method: 'Bank transfer' },
]

export const maintenanceRequests = [
  { id: 'mr1', title: 'AC not cooling in master bedroom', category: 'HVAC', priority: 'high', status: 'in_progress', submitted: '2026-06-10', updated: '2026-06-11' },
  { id: 'mr2', title: 'Kitchen tap leaking', category: 'Plumbing', priority: 'medium', status: 'open', submitted: '2026-06-08', updated: '2026-06-08' },
  { id: 'mr3', title: 'Gate remote battery replacement', category: 'Security', priority: 'low', status: 'resolved', submitted: '2026-05-28', updated: '2026-05-30' },
]

export const leaseDocuments = [
  { id: 'ld1', name: 'Residential lease agreement', status: 'signed', signedAt: '2025-08-28' },
  { id: 'ld2', name: 'Move-in inspection checklist', status: 'signed', signedAt: '2025-09-01' },
  { id: 'ld3', name: 'Renewal offer — 2026/27', status: 'pending_signature', signedAt: null },
]

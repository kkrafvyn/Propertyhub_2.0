export const transactions = [
  {
    id: 'tx1',
    property: 'Labone Penthouse',
    stage: 'negotiation',
    offer: 'GHS 4,000,000',
    counter: 'GHS 4,150,000',
    closingDate: '2026-07-15',
    checklist: [
      { id: 'c1', label: 'Offer submitted', done: true },
      { id: 'c2', label: 'Counter-offer received', done: true },
      { id: 'c3', label: 'Document review', done: false },
      { id: 'c4', label: 'Escrow funded', done: false },
      { id: 'c5', label: 'Closing', done: false },
    ],
  },
  {
    id: 'tx2',
    property: 'Cantonments Sky Villa',
    stage: 'viewing',
    offer: 'GHS 120,000/mo',
    counter: null,
    closingDate: null,
    checklist: [
      { id: 'c1', label: 'Viewing scheduled', done: true },
      { id: 'c2', label: 'Offer preparation', done: false },
    ],
  },
]

export const offerHistory = [
  { id: 'o1', property: 'Labone Penthouse', amount: 4000000, status: 'counter', counterAmount: 4150000, updated: '2026-06-11' },
  { id: 'o2', property: 'Cantonments Sky Villa', amount: 120000, status: 'pending', counterAmount: null, updated: '2026-06-10' },
]

export const financingPartners = [
  { id: 'f1', name: 'GCB Bank', type: 'Mortgage', rate: 'From 18% APR', badge: 'Partner' },
  { id: 'f2', name: 'Ecobank Ghana', type: 'Mortgage', rate: 'From 17.5% APR', badge: 'Partner' },
  { id: 'f3', name: 'BaytMiftah Finance', type: 'Pre-qualification', rate: 'Instant estimate', badge: 'In-app' },
]

export const aiAdvisorResponses = {
  overpriced: 'Based on comparable sales in Labone, this listing is ~4% above median. Negotiation room likely.',
  neighborhood: 'East Legon shows +6.5% annual growth with strong school ratings and rental demand.',
  yield: 'Estimated rental yield: 7.4% at current asking rent vs. similar units.',
}

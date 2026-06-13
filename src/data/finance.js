export const mortgageProducts = [
  { id: 'm1', lender: 'GCB Bank', rate: '17.5% APR', maxLtv: '80%', term: 'Up to 25 years', minAmount: 500000, badge: 'Partner' },
  { id: 'm2', lender: 'Ecobank Ghana', rate: '17.0% APR', maxLtv: '75%', term: 'Up to 20 years', minAmount: 300000, badge: 'Partner' },
  { id: 'm3', lender: 'BaytMiftah Finance', rate: 'Pre-qual in 5 min', maxLtv: '—', term: 'Flexible', minAmount: 0, badge: 'Instant' },
]

export const escrowAccounts = [
  { id: 'e1', property: 'Labone Penthouse', buyer: 'Sarah A.', amount: 4200000, funded: 2100000, status: 'partial', provider: 'paystack' },
  { id: 'e2', property: 'East Legon Family Home', buyer: 'Michael T.', amount: 580000, funded: 580000, status: 'funded', provider: 'paystack' },
]

export const insuranceProducts = [
  { id: 'i1', name: 'Homeowners cover', provider: 'SIC Insurance', premium: 'From GHS 1,200/yr', coverage: 'Fire, theft, liability' },
  { id: 'i2', name: 'Landlord protection', provider: 'Enterprise Insurance', premium: 'From GHS 2,400/yr', coverage: 'Rent default, damage' },
  { id: 'i3', name: 'Tenant contents', provider: 'BaytMiftah Shield', premium: 'From GHS 480/yr', coverage: 'Personal property' },
]

export const commissionSettlements = [
  { id: 'cs1', agent: 'Kwame Osei', property: 'Osu Office Suite', amount: 8400, status: 'paid', provider: 'paystack', paidAt: '2026-05-28' },
  { id: 'cs2', agent: 'Efua Mensah', property: 'Labone Penthouse', amount: 62000, status: 'pending', provider: 'stripe', paidAt: null },
  { id: 'cs3', agent: 'Ama Serwaa', property: 'Cantonments Sky Villa', amount: 12500, status: 'processing', provider: 'paystack', paidAt: null },
]

export const rentCollectionRails = {
  paystack: { label: 'Paystack', region: 'Africa', methods: ['Mobile money', 'Bank transfer', 'Card'], currency: 'GHS' },
  stripe: { label: 'Stripe', region: 'International', methods: ['Card', 'Apple Pay', 'Google Pay'], currency: 'GHS / USD' },
}

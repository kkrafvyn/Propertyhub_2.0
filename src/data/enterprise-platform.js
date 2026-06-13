export const enterpriseOrg = {
  name: 'Miftah Capital REIT',
  countries: 3,
  assets: 142,
  aum: 'GHS 2.4B',
  occupancy: '91%',
}

export const portfolios = [
  { id: 'pf1', name: 'Ghana Residential', country: 'GH', assets: 68, value: 'GHS 1.2B', yield: '7.2%', risk: 'low' },
  { id: 'pf2', name: 'Ghana Commercial', country: 'GH', assets: 34, value: 'GHS 890M', yield: '8.1%', risk: 'medium' },
  { id: 'pf3', name: 'Nigeria Mixed-Use', country: 'NG', assets: 28, value: 'NGN 18B', yield: '9.4%', risk: 'medium' },
  { id: 'pf4', name: 'Kenya Retail', country: 'KE', assets: 12, value: 'KES 4.2B', yield: '6.8%', risk: 'low' },
]

export const esgMetrics = {
  score: 78,
  carbonIntensity: '42 kg CO₂/m²',
  renewableShare: '28%',
  socialHousingUnits: 124,
  governanceRating: 'A-',
  metrics: [
    { label: 'Energy efficiency upgrades', value: '34 buildings', trend: '+12%' },
    { label: 'Water recycling', value: '18 sites', trend: '+8%' },
    { label: 'Community programs', value: '6 active', trend: 'stable' },
  ],
}

export const revenueForecast = [
  { quarter: 'Q3 2026', revenue: 420000000, expenses: 98000000, noi: 322000000 },
  { quarter: 'Q4 2026', revenue: 445000000, expenses: 102000000, noi: 343000000 },
  { quarter: 'Q1 2027', revenue: 468000000, expenses: 105000000, noi: 363000000 },
  { quarter: 'Q2 2027', revenue: 492000000, expenses: 108000000, noi: 384000000 },
]

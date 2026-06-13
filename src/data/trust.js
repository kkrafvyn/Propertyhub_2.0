export const kycQueue = [
  { id: 'k1', name: 'Horizon Estates', type: 'agency', status: 'pending_review', submitted: '2026-06-12', documents: 4 },
  { id: 'k2', name: 'Daniel K.', type: 'buyer', status: 'verified', submitted: '2026-06-08', documents: 3 },
  { id: 'k3', name: 'Cityline Properties', type: 'agency', status: 'flagged', submitted: '2026-06-10', documents: 2 },
  { id: 'k4', name: 'Sarah A.', type: 'investor', status: 'pending_review', submitted: '2026-06-11', documents: 5 },
]

export const fraudAlerts = [
  { id: 'f1', target: 'Spintex Warehouse listing', type: 'price_anomaly', riskScore: 78, status: 'investigating', detected: '2026-06-11' },
  { id: 'f2', target: 'New agent — rapid listings', type: 'velocity', riskScore: 65, status: 'monitoring', detected: '2026-06-10' },
  { id: 'f3', target: 'Duplicate photos across listings', type: 'media_fraud', riskScore: 82, status: 'blocked', detected: '2026-06-09' },
]

export const aiModules = [
  { id: 'ai1', name: 'Buyer advisor', route: '/buyer/advisor', status: 'active', requests24h: 47 },
  { id: 'ai2', name: 'Listing coach', route: '/agent/coach', status: 'active', requests24h: 23 },
  { id: 'ai3', name: 'Valuation engine', route: '/intelligence/valuation', status: 'active', requests24h: 31 },
  { id: 'ai4', name: 'Fraud classifier', route: '/admin/fraud', status: 'active', requests24h: 156 },
  { id: 'ai5', name: 'Natural language search', route: '/', status: 'active', requests24h: 892 },
]

export const supportedRegions = [
  { code: 'GH', name: 'Ghana', currency: 'GHS', status: 'live', listings: 1240 },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', status: 'beta', listings: 420 },
  { code: 'KE', name: 'Kenya', currency: 'KES', status: 'beta', listings: 180 },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', status: 'planned', listings: 0 },
  { code: 'AE', name: 'UAE', currency: 'AED', status: 'planned', listings: 0 },
]

export const valuationApiDocs = {
  endpoint: '/functions/v1/intelligence?action=valuation',
  method: 'POST',
  sampleRequest: { action: 'valuation', address: 'Cantonments, Accra', bedrooms: 4, sqft: 3200 },
  sampleResponse: { estimated: 5200000, range: '4.9M – 5.5M', confidence: 92, currency: 'GHS' },
}

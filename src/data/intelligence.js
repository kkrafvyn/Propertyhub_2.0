export const marketSummary = {
  region: 'Greater Accra',
  medianPrice: 2850000,
  priceChangeYoY: '+7.2%',
  avgDaysOnMarket: 22,
  transactionVolume: 1842,
  hotZones: ['East Legon', 'Cantonments', 'Airport Residential'],
}

export const priceTrends = [
  { month: 'Jan', median: 2650000, volume: 142 },
  { month: 'Feb', median: 2680000, volume: 156 },
  { month: 'Mar', median: 2720000, volume: 168 },
  { month: 'Apr', median: 2780000, volume: 175 },
  { month: 'May', median: 2820000, volume: 181 },
  { month: 'Jun', median: 2850000, volume: 190 },
]

export const heatmapZones = [
  { id: 'h1', name: 'Cantonments', lat: 5.556, lng: -0.182, intensity: 0.95, avgPrice: 4200000, growth: '+8.2%' },
  { id: 'h2', name: 'East Legon', lat: 5.635, lng: -0.15, intensity: 0.88, avgPrice: 2100000, growth: '+6.5%' },
  { id: 'h3', name: 'Airport Residential', lat: 5.605, lng: -0.168, intensity: 0.91, avgPrice: 6850000, growth: '+7.1%' },
  { id: 'h4', name: 'Labone', lat: 5.565, lng: -0.175, intensity: 0.82, avgPrice: 3800000, growth: '+5.9%' },
  { id: 'h5', name: 'Osu', lat: 5.555, lng: -0.176, intensity: 0.71, avgPrice: 1200000, growth: '+4.8%' },
  { id: 'h6', name: 'Tema', lat: 5.669, lng: -0.017, intensity: 0.65, avgPrice: 980000, growth: '+9.1%' },
]

export const valuationSamples = [
  { id: 'v1', address: 'Cantonments Sky Villa', estimated: 5200000, range: '4.9M – 5.5M', confidence: 92, method: 'AI comparables' },
  { id: 'v2', address: 'East Legon Family Home', estimated: 1850000, range: '1.7M – 2.0M', confidence: 88, method: 'AI comparables' },
]

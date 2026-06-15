/** Client-side plugin registry — mirrors server, enables offline/demo fallback */

export const MARKET_TIERS = {
  AFRICA: 'africa',
  ASIA: 'asia',
  WESTERN: 'western',
}

export const DEFAULT_REGION_ID = 'africa_ghana'

export const COUNTRY_TO_REGION = {
  GH: 'africa_ghana',
  NG: 'africa_ghana',
  KE: 'africa_ghana',
  IN: 'asia_india',
  PH: 'asia_india',
  ID: 'asia_india',
  US: 'western_us',
  EU: 'western_eu',
  DE: 'western_eu',
  FR: 'western_eu',
  GB: 'western_eu',
}

export const MARKET_REGIONS = [
  {
    id: 'africa_ghana',
    name: 'Ghana & West Africa',
    tier: MARKET_TIERS.AFRICA,
    default_country: 'GH',
    default_currency: 'GHS',
    launch_phase: 1,
    tagline: 'Manual utilities + mobile money — fast adoption',
  },
  {
    id: 'asia_india',
    name: 'India & Southeast Asia',
    tier: MARKET_TIERS.ASIA,
    default_country: 'IN',
    default_currency: 'INR',
    launch_phase: 2,
    tagline: 'Prepaid utilities + high-volume rentals',
  },
  {
    id: 'western_us',
    name: 'United States',
    tier: MARKET_TIERS.WESTERN,
    default_country: 'US',
    default_currency: 'USD',
    launch_phase: 3,
    tagline: 'Compliance-heavy, high revenue per user',
  },
  {
    id: 'western_eu',
    name: 'European Union',
    tier: MARKET_TIERS.WESTERN,
    default_country: 'EU',
    default_currency: 'EUR',
    launch_phase: 3,
    tagline: 'Rent control + smart meter integrations',
  },
]

export const WALLET_PURPOSES = ['general', 'rent', 'utility', 'escrow']

export const CORE_API_SERVICES = [
  { id: 'property', name: 'Property Service', fn: 'marketplace' },
  { id: 'booking', name: 'Booking Service', fn: 'reservations' },
  { id: 'utility', name: 'Utility Engine', fn: 'utilities' },
  { id: 'billing', name: 'Billing Engine', fn: 'utilities' },
  { id: 'payment', name: 'Payment Engine', fn: 'payments' },
  { id: 'wallet', name: 'Money Layer', fn: 'wallet' },
  { id: 'tenant', name: 'Tenant Intelligence', fn: 'tenant' },
  { id: 'events', name: 'Event Bus', fn: 'events' },
  { id: 'identity', name: 'Identity & Scoring', fn: 'trust' },
  { id: 'platform', name: 'Platform Config', fn: 'platform' },
  { id: 'intelligence', name: 'AI Intelligence', fn: 'intelligence' },
]

export function resolveRegionId(country, regionId) {
  if (regionId) return regionId
  if (country && COUNTRY_TO_REGION[country.toUpperCase()]) {
    return COUNTRY_TO_REGION[country.toUpperCase()]
  }
  return DEFAULT_REGION_ID
}

export function getRegionById(id) {
  return MARKET_REGIONS.find((r) => r.id === id) ?? MARKET_REGIONS[0]
}

export function getDefaultPaymentProvider(regionConfig) {
  const def = regionConfig?.plugins?.payment?.default
    ?? regionConfig?.modules?.payment?.default
  if (def) return def
  const currency = regionConfig?.region?.default_currency ?? 'GHS'
  if (currency === 'GHS' || currency === 'NGN') return 'paystack'
  if (currency === 'INR') return 'razorpay'
  return 'stripe'
}

export function getShortStayMaxDays(rules) {
  const rule = (rules ?? []).find(
    (r) => r.category === 'utilities' && r.rule_key === 'short_stay_inclusive',
  )
  return rule?.rule_value?.max_days ?? 30
}

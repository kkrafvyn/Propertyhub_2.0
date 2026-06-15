import { callEdgeFunction } from '../lib/edge-client'
import {
  MARKET_REGIONS,
  CORE_API_SERVICES,
  DEFAULT_REGION_ID,
  getRegionById,
} from '../platform/plugins/registry.js'
import { applyRegionConfig } from '../lib/market-context.js'

export async function fetchPlatformServices() {
  try {
    const payload = await callEdgeFunction('platform', {
      query: { action: 'services' },
      allowAnonymous: true,
    })
    if (payload?.services) return payload
  } catch { /* fallback */ }
  return { services: CORE_API_SERVICES, architecture: 'api-first', source: 'local' }
}

export async function fetchPlatformArchitecture() {
  try {
    const payload = await callEdgeFunction('platform', {
      query: { action: 'architecture' },
      allowAnonymous: true,
    })
    if (payload?.core) return payload
  } catch { /* fallback */ }
  return {
    clients: ['Web App', 'Mobile App', 'Landlord Dashboard', 'Admin Console'],
    gateway: { id: 'api_gateway', name: 'API Gateway', path: '/functions/v1' },
    core: CORE_API_SERVICES,
    philosophy: 'Everything is a service. Nothing is hardcoded per country.',
    source: 'local',
  }
}

export async function fetchAnalyticsFacts() {
  try {
    const payload = await callEdgeFunction('platform', {
      query: { action: 'analytics' },
      allowAnonymous: true,
    })
    if (payload?.facts) return payload
  } catch { /* fallback */ }
  return { facts: [], source: 'local' }
}

export async function fetchMarketRegions() {
  try {
    const payload = await callEdgeFunction('platform', {
      query: { action: 'regions' },
      allowAnonymous: true,
    })
    if (payload?.regions?.length) return payload
  } catch { /* fallback */ }
  return { regions: MARKET_REGIONS, source: 'local' }
}

export async function fetchRegionPlugins({ country, regionId } = {}) {
  try {
    const query = { action: 'plugins' }
    if (country) query.country = country
    if (regionId) query.region = regionId
    const payload = await callEdgeFunction('platform', { query, allowAnonymous: true })
    if (payload?.modules) return payload
  } catch { /* fallback */ }
  const region = getRegionById(regionId ?? DEFAULT_REGION_ID)
  return {
    region_id: region.id,
    modules: buildLocalModules(region),
    source: 'local',
  }
}

export async function resolveRegionConfig({ country, regionId } = {}) {
  try {
    const query = { action: 'resolve' }
    if (country) query.country = country
    if (regionId) query.region = regionId
    const payload = await callEdgeFunction('platform', { query, allowAnonymous: true })
    if (payload?.region) {
      applyRegionConfig(payload)
      return payload
    }
  } catch { /* fallback */ }

  const region = getRegionById(regionId ?? DEFAULT_REGION_ID)
  const local = {
    region,
    plugins: buildLocalModules(region),
    scaling: { strategy: 'region_by_region', tiers: ['africa', 'asia', 'western'], current: region.tier },
    source: 'local',
  }
  applyRegionConfig(local)
  return local
}

function buildLocalModules(region) {
  const byTier = {
    africa: {
      utility: { default: 'manual_metered', adapters: [{ adapter_id: 'manual_metered', name: 'Manual metered' }, { adapter_id: 'ecg_ghana', name: 'ECG Ghana' }] },
      payment: { default: 'paystack', adapters: [{ adapter_id: 'paystack', name: 'Paystack' }, { adapter_id: 'stripe', name: 'Stripe' }] },
      compliance: { default: 'ghana_housing', rules: [{ category: 'utilities', rule_key: 'short_stay_inclusive', rule_value: { max_days: 30 } }] },
    },
    asia: {
      utility: { default: 'prepaid_digital', adapters: [{ adapter_id: 'prepaid_digital', name: 'Prepaid digital' }] },
      payment: { default: 'razorpay', adapters: [{ adapter_id: 'razorpay', name: 'Razorpay' }] },
      compliance: { default: 'india_rent', rules: [{ category: 'utilities', rule_key: 'default_billing', rule_value: { mode: 'prepaid' } }] },
    },
    western: {
      utility: { default: region.default_country === 'US' ? 'us_utility_api' : 'eu_smart_meter', adapters: [] },
      payment: { default: 'stripe', adapters: [{ adapter_id: 'stripe', name: 'Stripe' }] },
      compliance: { default: region.default_country === 'US' ? 'us_tenant_law' : 'eu_rent_control', rules: [] },
    },
  }
  return byTier[region.tier] ?? byTier.africa
}

export async function ensureMoneyLayerWallets(currency) {
  try {
    return await callEdgeFunction('platform', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'ensure_wallets', currency, purposes: ['general', 'rent', 'utility', 'escrow'] },
    })
  } catch (error) {
    return { ok: false, error: error.message, demo: true }
  }
}

export default {
  fetchPlatformServices,
  fetchMarketRegions,
  fetchRegionPlugins,
  resolveRegionConfig,
  ensureMoneyLayerWallets,
}

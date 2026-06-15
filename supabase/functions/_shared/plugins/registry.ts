/** In-memory fallback when DB plugins unavailable — mirrors migration seeds */

import type { MarketRegion, PlatformPlugin, RegionConfig, ComplianceRule } from './types.ts'
import { DEFAULT_REGION_ID, resolveRegionId } from './types.ts'
import type { createAdminClient } from '../supabase.ts'

const FALLBACK_REGIONS: MarketRegion[] = [
  {
    id: 'africa_ghana',
    name: 'Ghana & West Africa',
    tier: 'africa',
    default_country: 'GH',
    default_currency: 'GHS',
    launch_phase: 1,
    config: { utility_mode: 'manual_metered', payment_mode: 'mobile_money' },
  },
  {
    id: 'asia_india',
    name: 'India & Southeast Asia',
    tier: 'asia',
    default_country: 'IN',
    default_currency: 'INR',
    launch_phase: 2,
    config: { utility_mode: 'prepaid', payment_mode: 'upi' },
  },
  {
    id: 'western_us',
    name: 'United States',
    tier: 'western',
    default_country: 'US',
    default_currency: 'USD',
    launch_phase: 3,
    config: { utility_mode: 'api_metered', payment_mode: 'ach' },
  },
  {
    id: 'western_eu',
    name: 'European Union',
    tier: 'western',
    default_country: 'EU',
    default_currency: 'EUR',
    launch_phase: 3,
    config: { utility_mode: 'smart_meter', payment_mode: 'sepa' },
  },
]

const FALLBACK_PLUGINS: PlatformPlugin[] = [
  { id: 'util-gh-manual', module: 'utility', adapter_id: 'manual_metered', name: 'Manual metered billing', countries: ['GH'], api_available: false, fallback: true, config: {}, is_default: true },
  { id: 'util-gh-ecg', module: 'utility', adapter_id: 'ecg_ghana', name: 'ECG Ghana', countries: ['GH'], partner: 'ECG', api_available: false, fallback: false, config: {} },
  { id: 'util-in-prepaid', module: 'utility', adapter_id: 'prepaid_digital', name: 'Prepaid digital', countries: ['IN'], api_available: false, fallback: false, config: {}, is_default: true },
  { id: 'util-us-utility', module: 'utility', adapter_id: 'us_utility_api', name: 'US utility API', countries: ['US'], api_available: true, fallback: false, config: {}, is_default: true },
  { id: 'util-eu-smart', module: 'utility', adapter_id: 'eu_smart_meter', name: 'EU smart meter', countries: ['EU'], api_available: true, fallback: false, config: {}, is_default: true },
  { id: 'util-manual-fallback', module: 'utility', adapter_id: 'manual_fallback', name: 'Manual fallback', countries: [], api_available: false, fallback: true, config: {} },
  { id: 'pay-paystack', module: 'payment', adapter_id: 'paystack', name: 'Paystack', countries: ['GH'], partner: 'Paystack', api_available: true, fallback: false, config: {}, is_default: true },
  { id: 'pay-stripe', module: 'payment', adapter_id: 'stripe', name: 'Stripe', countries: ['US', 'EU'], partner: 'Stripe', api_available: true, fallback: false, config: {} },
  { id: 'pay-razorpay', module: 'payment', adapter_id: 'razorpay', name: 'Razorpay', countries: ['IN'], partner: 'Razorpay', api_available: true, fallback: false, config: {}, is_default: true },
  { id: 'pay-bank-transfer', module: 'payment', adapter_id: 'bank_transfer', name: 'Bank transfer', countries: [], api_available: false, fallback: true, config: {} },
  { id: 'comp-gh', module: 'compliance', adapter_id: 'ghana_housing', name: 'Ghana housing rules', countries: ['GH'], api_available: false, fallback: false, config: { short_stay_max_days: 30 }, is_default: true },
  { id: 'comp-in', module: 'compliance', adapter_id: 'india_rent', name: 'India rent control', countries: ['IN'], api_available: false, fallback: false, config: {}, is_default: true },
  { id: 'comp-us', module: 'compliance', adapter_id: 'us_tenant_law', name: 'US tenant law', countries: ['US'], api_available: false, fallback: false, config: {}, is_default: true },
  { id: 'comp-eu', module: 'compliance', adapter_id: 'eu_rent_control', name: 'EU rent control', countries: ['EU'], api_available: false, fallback: false, config: {}, is_default: true },
]

const REGION_BINDINGS: Record<string, string[]> = {
  africa_ghana: ['util-gh-manual', 'util-gh-ecg', 'util-manual-fallback', 'pay-paystack', 'pay-stripe', 'comp-gh'],
  asia_india: ['util-in-prepaid', 'util-manual-fallback', 'pay-razorpay', 'pay-stripe', 'comp-in'],
  western_us: ['util-us-utility', 'util-manual-fallback', 'pay-stripe', 'comp-us'],
  western_eu: ['util-eu-smart', 'util-manual-fallback', 'pay-stripe', 'comp-eu'],
}

const FALLBACK_COMPLIANCE: ComplianceRule[] = [
  { country: 'GH', category: 'utilities', rule_key: 'short_stay_inclusive', rule_value: { max_days: 30, mode: 'inclusive' } },
  { country: 'IN', category: 'utilities', rule_key: 'default_billing', rule_value: { mode: 'prepaid' } },
  { country: 'US', category: 'eviction', rule_key: 'notice_days', rule_value: { days: 30, varies_by_state: true } },
  { country: 'EU', category: 'rent', rule_key: 'rent_control_cities', rule_value: { enabled: true } },
]

function pluginsForRegion(regionId: string, module: PlatformPlugin['module']): PlatformPlugin[] {
  const ids = REGION_BINDINGS[regionId] ?? REGION_BINDINGS[DEFAULT_REGION_ID]
  return FALLBACK_PLUGINS.filter((p) => ids.includes(p.id) && p.module === module)
}

function defaultAdapter(plugins: PlatformPlugin[]): string | null {
  return plugins.find((p) => p.is_default)?.adapter_id ?? plugins[0]?.adapter_id ?? null
}

export function buildFallbackRegionConfig(regionId: string): RegionConfig {
  const region = FALLBACK_REGIONS.find((r) => r.id === regionId) ?? FALLBACK_REGIONS[0]
  const country = region.default_country
  const utility = pluginsForRegion(regionId, 'utility')
  const payment = pluginsForRegion(regionId, 'payment')
  const compliance = pluginsForRegion(regionId, 'compliance')
  const rules = FALLBACK_COMPLIANCE.filter((r) => r.country === country || regionId.startsWith(r.country.toLowerCase()))

  return {
    region,
    modules: {
      utility: { adapters: utility, default: defaultAdapter(utility) },
      payment: { adapters: payment, default: defaultAdapter(payment) },
      compliance: { adapters: compliance, default: defaultAdapter(compliance), rules },
    },
  }
}

export async function loadRegionConfigFromDb(
  admin: ReturnType<typeof createAdminClient>,
  country?: string | null,
  regionId?: string | null,
): Promise<RegionConfig> {
  const resolvedId = resolveRegionId(country, regionId)

  const { data: region } = await admin
    .from('market_regions')
    .select('*')
    .eq('id', resolvedId)
    .eq('active', true)
    .maybeSingle()

  if (!region) return buildFallbackRegionConfig(resolvedId)

  const { data: bindings } = await admin
    .from('region_plugin_bindings')
    .select('is_default, priority, plugin_id, platform_plugins(*)')
    .eq('region_id', resolvedId)
    .eq('enabled', true)
    .order('priority')

  const plugins: PlatformPlugin[] = (bindings ?? [])
    .map((b: { is_default: boolean; priority: number; platform_plugins: PlatformPlugin | null }) => {
      const p = b.platform_plugins
      if (!p) return null
      return { ...p, is_default: b.is_default, priority: b.priority }
    })
    .filter(Boolean) as PlatformPlugin[]

  const byModule = (mod: PlatformPlugin['module']) => plugins.filter((p) => p.module === mod)
  const utility = byModule('utility')
  const payment = byModule('payment')
  const compliance = byModule('compliance')

  const { data: rules } = await admin
    .from('housing_compliance_rules')
    .select('country, category, rule_key, rule_value')
    .eq('country', region.default_country)

  return {
    region: region as MarketRegion,
    modules: {
      utility: { adapters: utility, default: defaultAdapter(utility) },
      payment: { adapters: payment, default: defaultAdapter(payment) },
      compliance: {
        adapters: compliance,
        default: defaultAdapter(compliance),
        rules: (rules ?? []) as ComplianceRule[],
      },
    },
  }
}

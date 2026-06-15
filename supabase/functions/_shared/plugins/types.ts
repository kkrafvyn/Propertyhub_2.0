/** Platform plugin types — region-by-region modular architecture */

export type PluginModule = 'utility' | 'payment' | 'compliance'
export type MarketTier = 'africa' | 'asia' | 'western'
export type WalletPurpose = 'general' | 'rent' | 'utility' | 'escrow'

export interface MarketRegion {
  id: string
  name: string
  tier: MarketTier
  default_country: string
  default_currency: string
  launch_phase: number
  config: Record<string, unknown>
}

export interface PlatformPlugin {
  id: string
  module: PluginModule
  adapter_id: string
  name: string
  description?: string
  countries: string[]
  partner?: string
  api_available: boolean
  fallback: boolean
  config: Record<string, unknown>
  is_default?: boolean
  priority?: number
}

export interface RegionConfig {
  region: MarketRegion
  modules: {
    utility: { adapters: PlatformPlugin[]; default: string | null }
    payment: { adapters: PlatformPlugin[]; default: string | null }
    compliance: { adapters: PlatformPlugin[]; default: string | null; rules: ComplianceRule[] }
  }
}

export interface ComplianceRule {
  country: string
  category: string
  rule_key: string
  rule_value: Record<string, unknown>
}

export const DEFAULT_REGION_ID = 'africa_ghana'

export const COUNTRY_TO_REGION: Record<string, string> = {
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

export function resolveRegionId(country?: string | null, regionId?: string | null): string {
  if (regionId) return regionId
  if (country && COUNTRY_TO_REGION[country.toUpperCase()]) {
    return COUNTRY_TO_REGION[country.toUpperCase()]
  }
  return DEFAULT_REGION_ID
}

export function getComplianceValue(
  rules: ComplianceRule[],
  category: string,
  ruleKey: string,
  fallback: unknown,
): unknown {
  const match = rules.find((r) => r.category === category && r.rule_key === ruleKey)
  return match?.rule_value ?? fallback
}

export function getShortStayMaxDays(rules: ComplianceRule[]): number {
  const val = getComplianceValue(rules, 'utilities', 'short_stay_inclusive', { max_days: 30 })
  if (val && typeof val === 'object' && 'max_days' in val) {
    return Number((val as { max_days: number }).max_days) || 30
  }
  return 30
}

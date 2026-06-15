/** Utility adapter router — ECG, smart meters, prepaid, manual fallback */

import type { RegionConfig } from './types.ts'

export type UtilityAdapterId = 'manual_metered' | 'ecg_ghana' | 'prepaid_digital' | 'us_utility_api' | 'eu_smart_meter' | 'manual_fallback'

export function resolveUtilityAdapter(regionConfig: RegionConfig): UtilityAdapterId {
  const def = regionConfig.modules.utility.default
  const valid: UtilityAdapterId[] = [
    'manual_metered', 'ecg_ghana', 'prepaid_digital', 'us_utility_api', 'eu_smart_meter', 'manual_fallback',
  ]
  if (def && valid.includes(def as UtilityAdapterId)) return def as UtilityAdapterId
  return 'manual_fallback'
}

export function utilityAdapterSupportsApi(adapter: UtilityAdapterId): boolean {
  return adapter === 'us_utility_api' || adapter === 'eu_smart_meter'
}

/** Region-aware utility type labels — no global ECG hardcoding */
export function utilityLabelForRegion(
  utilityType: string,
  regionConfig: RegionConfig,
): string {
  const adapter = resolveUtilityAdapter(regionConfig)
  const labels: Record<string, Record<string, string>> = {
    manual_metered: { electricity: 'Electricity', water: 'Water', internet: 'Internet', gas: 'Gas' },
    ecg_ghana: { electricity: 'ECG Electricity', water: 'Water', internet: 'Internet', gas: 'Gas' },
    prepaid_digital: { electricity: 'Prepaid electricity', water: 'Prepaid water', internet: 'Broadband', gas: 'Gas' },
    us_utility_api: { electricity: 'Electric utility', water: 'Water utility', internet: 'Internet', gas: 'Gas' },
    eu_smart_meter: { electricity: 'Smart meter electricity', water: 'Water', internet: 'Broadband', gas: 'Gas' },
    manual_fallback: { electricity: 'Electricity', water: 'Water', internet: 'Internet', gas: 'Gas' },
  }
  return labels[adapter]?.[utilityType] ?? utilityType
}

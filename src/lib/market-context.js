/** Market / region context — drives plugin resolution client-side */

import {
  DEFAULT_REGION_ID,
  resolveRegionId,
  getRegionById,
  getDefaultPaymentProvider,
  getShortStayMaxDays,
} from '../platform/plugins/registry.js'

const STORAGE_KEY = 'baytmiftah_market_region'

let cachedConfig = null

export function getStoredRegionId() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null
  } catch {
    return null
  }
}

export function setStoredRegionId(regionId) {
  try {
    localStorage.setItem(STORAGE_KEY, regionId)
    cachedConfig = null
  } catch { /* ignore */ }
}

export function getDefaultCountry() {
  const regionId = getStoredRegionId() ?? DEFAULT_REGION_ID
  return getRegionById(regionId).default_country
}

export function getDefaultCurrency() {
  const regionId = getStoredRegionId() ?? DEFAULT_REGION_ID
  return getRegionById(regionId).default_currency
}

export function applyRegionConfig(config) {
  cachedConfig = config
  if (config?.region?.id) setStoredRegionId(config.region.id)
  return config
}

export function getCachedRegionConfig() {
  return cachedConfig
}

export function resolvePaymentProvider(override) {
  if (override) return override
  if (cachedConfig) return getDefaultPaymentProvider(cachedConfig)
  const region = getRegionById(getStoredRegionId() ?? DEFAULT_REGION_ID)
  return region.default_currency === 'INR' ? 'razorpay' : region.default_currency === 'GHS' ? 'paystack' : 'stripe'
}

export function resolveShortStayMaxDays() {
  const rules = cachedConfig?.plugins?.compliance?.rules
    ?? cachedConfig?.modules?.compliance?.rules
  return getShortStayMaxDays(rules)
}

export function utilityLabel(type, regionConfig = cachedConfig) {
  const adapter = regionConfig?.plugins?.utility?.default
    ?? regionConfig?.modules?.utility?.default
  if (adapter === 'ecg_ghana' && type === 'electricity') return 'ECG Electricity'
  if (adapter === 'prepaid_digital' && type === 'electricity') return 'Prepaid electricity'
  const labels = { electricity: 'Electricity', water: 'Water', internet: 'Internet', gas: 'Gas' }
  return labels[type] ?? type
}

export { resolveRegionId, DEFAULT_REGION_ID, getRegionById }

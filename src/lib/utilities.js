/** Utility Management Engine — client types & helpers */

import { utilityLabel, resolveShortStayMaxDays } from './market-context.js'

export const UTILITY_TYPES = ['electricity', 'water', 'internet', 'gas']

export const BILLING_MODELS = ['metered', 'flat', 'prepaid']

export function getShortStayMaxDays() {
  return resolveShortStayMaxDays()
}

export function utilityTypeLabel(type) {
  return utilityLabel(type)
}

export function utilityIcon(type) {
  const icons = {
    electricity: '⚡',
    water: '💧',
    internet: '📶',
    gas: '🔥',
  }
  return icons[type] ?? '🔌'
}

export function billingModelLabel(model) {
  const labels = {
    metered: 'Metered',
    flat: 'Flat monthly',
    prepaid: 'Prepaid',
  }
  return labels[model] ?? model
}

export function daysBetween(checkIn, checkOut) {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const ms = end.getTime() - start.getTime()
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function resolveStayType(checkIn, checkOut) {
  return daysBetween(checkIn, checkOut) < getShortStayMaxDays() ? 'short_term' : 'long_term'
}

export function resolveUtilitiesMode(stayType) {
  return stayType === 'short_term' ? 'inclusive' : 'billed'
}

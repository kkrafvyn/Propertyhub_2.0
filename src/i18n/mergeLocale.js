/** Deep-merge locale overrides onto a base catalog (typically English). */
export function mergeLocale(base, overrides) {
  if (!overrides || typeof overrides !== 'object') return base
  const result = { ...base }
  for (const key of Object.keys(overrides)) {
    const baseVal = base[key]
    const overrideVal = overrides[key]
    if (
      overrideVal &&
      typeof overrideVal === 'object' &&
      !Array.isArray(overrideVal) &&
      baseVal &&
      typeof baseVal === 'object' &&
      !Array.isArray(baseVal)
    ) {
      result[key] = mergeLocale(baseVal, overrideVal)
    } else {
      result[key] = overrideVal
    }
  }
  return result
}

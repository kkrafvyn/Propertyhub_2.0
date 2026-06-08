const COMPARE_KEY = 'baytmiftah_compare_properties'

export function getComparisonIds() {
  try {
    return JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]')
  } catch {
    return []
  }
}

export function toggleComparisonId(id) {
  const current = getComparisonIds()
  const next = current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id].slice(-4)
  localStorage.setItem(COMPARE_KEY, JSON.stringify(next))
  return next
}

export function clearComparisonIds() {
  localStorage.removeItem(COMPARE_KEY)
}

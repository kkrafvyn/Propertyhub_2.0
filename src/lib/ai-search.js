/** Parse simple natural-language property queries */
export function parseAiSearchQuery(query, listings) {
  const q = query.toLowerCase().trim()
  if (!q) return listings

  let beds = null
  const bedMatch = q.match(/(\d+)\s*[-]?\s*bed/)
  if (bedMatch) beds = Number(bedMatch[1])

  let maxPrice = null
  const underMatch = q.match(/under\s*(?:\$|ghs|usd)?\s*([\d,]+)/)
  if (underMatch) maxPrice = Number(underMatch[1].replace(/,/g, ''))

  const typeMap = { apartment: 'apartment', house: 'house', commercial: 'office', office: 'office', villa: 'house' }
  let type = null
  for (const [word, t] of Object.entries(typeMap)) {
    if (q.includes(word)) type = t
  }

  const locations = ['cantonments', 'east legon', 'airport', 'labone', 'osu', 'ridge', 'accra']
  const location = locations.find((loc) => q.includes(loc))

  return listings.filter((l) => {
    if (beds && (l.bedrooms || 0) < beds) return false
    if (maxPrice && l.price > maxPrice) return false
    if (type && l.type !== type) return false
    if (location && !`${l.title} ${l.location}`.toLowerCase().includes(location)) return false
    return true
  })
}

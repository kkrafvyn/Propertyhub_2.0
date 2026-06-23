export function getListingPath(listingId) {
  return `/property/${listingId}`
}

export function getListingUrl(listingId) {
  const base = (import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : ''))
    .replace(/\/$/, '')
  return `${base}${getListingPath(listingId)}`
}

export function buildListingChatIntro({ listingId, listingTitle, introLine }) {
  const title = listingTitle || 'this property'
  const url = getListingUrl(listingId)
  const lead = introLine || `Hi, I'm interested in ${title}.`
  return `${lead}\n\n${url}`
}

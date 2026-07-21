import { exploreModeUrl as buildExploreModeUrl } from '../consumer-routes'

export const EXPLORE_PROPERTY_TYPES = [
  'apartment',
  'house',
  'townhouse',
  'villa',
  'commercial',
  'land',
]

export const EXPLORE_LISTING_TYPES = ['rent', 'buy', 'lease', 'shortStay']

export const EXPLORE_AREAS = [
  'Cantonments',
  'East Legon',
  'Airport Residential',
  'Labone',
  'Osu',
  'Ridge',
  'Accra',
]

export const EXPLORE_REGIONS = ['Greater Accra', 'Ashanti', 'Western']
export const EXPLORE_CITIES = ['Accra', 'Kumasi', 'Takoradi']

export const EXPLORE_AMENITIES = [
  'parking',
  'ac',
  'security',
  'furnished',
  'pool',
  'gym',
  'balcony',
  'garden',
  'generator',
  'internet',
]

export const EXPLORE_AVAILABILITY = [
  'available_now',
  'available_weekend',
  'book_tomorrow',
  'instant_deals',
]

export const EXPLORE_SORT_OPTIONS = [
  'recommended',
  'newest',
  'lowest_price',
  'highest_price',
  'most_viewed',
  'verified_first',
]

const AMENITY_MATCHERS = {
  parking: /parking/i,
  ac: /air conditioning|a\/c|\bac\b/i,
  security: /security|24\/7/i,
  furnished: /furnished/i,
  pool: /pool|swimming/i,
  gym: /gym|fitness/i,
  balcony: /balcony|rooftop/i,
  garden: /garden|compound/i,
  generator: /generator|backup power|solar backup/i,
  internet: /fiber|internet|wifi/i,
}

export function defaultExploreFilters() {
  return {
    propertyTypes: [],
    listingType: '',
    region: '',
    city: '',
    area: '',
    minPrice: '',
    maxPrice: '',
    minBedrooms: 0,
    minBathrooms: 0,
    verifiedPropertiesOnly: false,
    verifiedAgentsOnly: false,
    verifiedAgenciesOnly: false,
    availability: '',
    amenities: [],
    sortBy: 'recommended',
  }
}

export function parseListingLocation(location = '') {
  const parts = String(location).split(',').map((s) => s.trim()).filter(Boolean)
  return {
    area: parts[0] || '',
    city: parts[1] || 'Accra',
    region: parts[2] || 'Greater Accra',
  }
}

export function enrichListingForExplore(listing) {
  const loc = parseListingLocation(listing.location)
  const id = String(listing.id || '')
  const viewCount = Number(listing.viewCount ?? listing.view_count ?? 0)
    || (id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 500) + 20

  return {
    ...listing,
    ...loc,
    viewCount,
    verifiedAgent: Boolean(listing.verifiedAgent ?? listing.verified_agent ?? listing.verified),
    verifiedAgency: Boolean(listing.verifiedAgency ?? listing.verified_agency ?? listing.verified),
    availableNow: listing.availableNow ?? true,
    availableWeekend: Boolean(listing.availableWeekend ?? listing.featured ?? listing.instantBook),
    bookTomorrow: Boolean(listing.bookTomorrow ?? listing.instantBook),
    instantDeal: Boolean(listing.instantDeal ?? (listing.featured && listing.instantBook)),
  }
}

function matchesPropertyType(listing, propertyTypes) {
  if (!propertyTypes?.length) return true
  return propertyTypes.some((pt) => {
    if (pt === 'townhouse') return listing.type === 'house' || listing.type === 'townhouse'
    if (pt === 'villa') return listing.type === 'house' || listing.type === 'villa' || (listing.bedrooms >= 4 && listing.type === 'apartment')
    if (pt === 'commercial') return listing.type === 'office' || listing.type === 'commercial'
    return listing.type === pt
  })
}

function matchesListingType(listing, listingType) {
  if (!listingType) return true
  if (listingType === 'buy') return listing.listingType === 'sale'
  if (listingType === 'rent') return listing.listingType === 'rent' && !listing.instantBook
  if (listingType === 'lease') return listing.listingType === 'lease'
  if (listingType === 'shortStay') return listing.instantBook || listing.listingType === 'stay'
  return true
}

function matchesAmenities(listing, amenities) {
  if (!amenities?.length) return true
  const text = (listing.amenities || []).join(' ')
  return amenities.every((key) => AMENITY_MATCHERS[key]?.test(text))
}

function matchesAvailability(listing, availability) {
  if (!availability) return true
  if (availability === 'available_now') return listing.availableNow !== false
  if (availability === 'available_weekend') return listing.availableWeekend
  if (availability === 'book_tomorrow') return listing.bookTomorrow
  if (availability === 'instant_deals') return listing.instantDeal
  return true
}

export function listingTypeToTxTab(listingType) {
  if (listingType === 'buy') return 'buy'
  if (listingType === 'rent') return 'rent'
  if (listingType === 'lease') return 'lease'
  if (listingType === 'shortStay') return 'stay'
  return 'stay'
}

export function txTabToListingType(txTab) {
  if (txTab === 'buy') return 'buy'
  if (txTab === 'rent') return 'rent'
  if (txTab === 'lease') return 'lease'
  if (txTab === 'stay') return 'shortStay'
  return ''
}

/** Read buy/rent/lease/stay filter from ?mode= or ?listingType= (consumer journey deep links). */
export function listingTypeFromSearchParams(searchParams) {
  const rawType = searchParams.get('listingType')
  if (rawType === 'shortStay' || rawType === 'stay') return 'shortStay'
  if (rawType && EXPLORE_LISTING_TYPES.includes(rawType)) return rawType

  const mode = searchParams.get('mode')
  if (mode === 'stay') return 'shortStay'
  if (mode && ['buy', 'rent', 'lease'].includes(mode)) return mode
  return ''
}

/** Consistent explore URL for consumer journeys. */
export function exploreModeUrl(listingType: string) {
  return buildExploreModeUrl(listingType)
}

export function propertyTypeRowToFilter(propType) {
  if (!propType) return []
  if (propType === 'shortStay') return []
  if (propType === 'office') return ['commercial']
  return [propType]
}

export function filterToPropertyRow(propertyTypes) {
  if (!propertyTypes?.length) return null
  if (propertyTypes.includes('commercial')) return 'office'
  if (propertyTypes.length === 1) {
    const [pt] = propertyTypes
    if (pt === 'townhouse' || pt === 'villa') return 'townhouse'
    return pt === 'commercial' ? 'office' : pt
  }
  return null
}

export function applyExploreFilters(listings, filters) {
  const minPrice = filters.minPrice !== '' ? Number(filters.minPrice) : null
  const maxPrice = filters.maxPrice !== '' ? Number(filters.maxPrice) : null

  let rows = (listings ?? []).map(enrichListingForExplore).filter((listing) => {
    if (!matchesPropertyType(listing, filters.propertyTypes)) return false
    if (!matchesListingType(listing, filters.listingType)) return false

    if (filters.region && listing.region !== filters.region) return false
    if (filters.city && listing.city !== filters.city) return false
    if (filters.area && !listing.area.toLowerCase().includes(filters.area.toLowerCase())
      && !listing.location?.toLowerCase().includes(filters.area.toLowerCase())) {
      return false
    }

    if (minPrice != null && !Number.isNaN(minPrice) && (listing.price ?? 0) < minPrice) return false
    if (maxPrice != null && !Number.isNaN(maxPrice) && (listing.price ?? 0) > maxPrice) return false

    if (filters.minBedrooms > 0 && (listing.bedrooms ?? 0) < filters.minBedrooms) return false
    if (filters.minBathrooms > 0 && (listing.bathrooms ?? 0) < filters.minBathrooms) return false

    if (filters.verifiedPropertiesOnly && !listing.verified) return false
    if (filters.verifiedAgentsOnly && !listing.verifiedAgent) return false
    if (filters.verifiedAgenciesOnly && !listing.verifiedAgency) return false

    if (!matchesAvailability(listing, filters.availability)) return false
    if (!matchesAmenities(listing, filters.amenities)) return false

    return true
  })

  rows = sortExploreListings(rows, filters.sortBy)
  return rows
}

export function sortExploreListings(listings, sortBy) {
  const rows = [...listings]
  switch (sortBy) {
    case 'newest':
      return rows.sort((a, b) => String(b.id).localeCompare(String(a.id)))
    case 'lowest_price':
      return rows.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    case 'highest_price':
      return rows.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    case 'most_viewed':
      return rows.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    case 'verified_first':
      return rows.sort((a, b) => {
        const v = Number(b.verified) - Number(a.verified)
        if (v !== 0) return v
        return (b.rating ?? 0) - (a.rating ?? 0)
      })
    case 'recommended':
    default:
      return rows.sort((a, b) => {
        const score = (l) => (l.featured ? 2 : 0) + (l.verified ? 1 : 0) + (l.rating ?? 0) / 10
        return score(b) - score(a)
      })
  }
}

export function countActiveExploreFilters(filters) {
  let n = 0
  if (filters.propertyTypes?.length) n += 1
  if (filters.listingType) n += 1
  if (filters.region) n += 1
  if (filters.city) n += 1
  if (filters.area) n += 1
  if (filters.minPrice !== '' || filters.maxPrice !== '') n += 1
  if (filters.minBedrooms > 0) n += 1
  if (filters.minBathrooms > 0) n += 1
  if (filters.verifiedPropertiesOnly) n += 1
  if (filters.verifiedAgentsOnly) n += 1
  if (filters.verifiedAgenciesOnly) n += 1
  if (filters.availability) n += 1
  if (filters.amenities?.length) n += 1
  if (filters.sortBy && filters.sortBy !== 'recommended') n += 1
  return n
}

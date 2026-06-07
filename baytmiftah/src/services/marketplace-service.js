import { callEdgeFunction } from './edge-client'

const fallbackImages = [
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=85',
]

export const fallbackMarketplaceListings = [
  {
    id: 'obsidian-penthouse',
    propertyId: 'obsidian-penthouse',
    title: 'The Obsidian Penthouse',
    displayLocation: 'Upper East Side, New York',
    address: 'Upper East Side, New York, NY',
    category: 'apartment',
    listingType: 'rental',
    status: 'listed',
    priceLabel: '$12,500 / month',
    rating: '4.98',
    image: fallbackImages[0],
    media: fallbackImages.map((public_url, index) => ({
      id: `obsidian-media-${index}`,
      public_url,
      alt_text: 'Luxury smart apartment',
      sort_order: index,
      is_primary: index === 0,
    })),
    facts: ['5 Beds', '4.5 Baths', '4,200 sqft'],
    amenities: ['smart access', 'concierge', 'city view', 'energy monitoring'],
    description:
      'A premium smart residence with concierge operations, skyline views, and connected infrastructure for modern ownership.',
    organization: {
      name: 'Elite Agency Group',
      verified: true,
      description: 'Verified enterprise agency for luxury residential assets.',
    },
    qualityScore: 98,
    addressVerified: true,
    floodRiskLevel: 'low',
    availableLabel: 'Available now',
  },
]

const categoryLabels = {
  apartment: 'Serviced Apartment',
  house: 'Family Home',
  office: 'Office Suite',
  villa: 'Villa',
  townhouse: 'Townhouse',
}

const formatCurrency = (price, currency = 'GHS') => {
  const amount = Number(price || 0)

  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

const areaToSqft = (squareMeters) => {
  if (!squareMeters) return null
  return Math.round(Number(squareMeters) * 10.7639)
}

const titleForProperty = (property = {}) => {
  const place = property.neighborhood || property.city || 'Featured'
  const type = categoryLabels[property.category] || 'Property'
  return `${place} ${type}`
}

const ratingForListing = (listing = {}) => {
  const score = Number(listing.quality_score || 82)
  const rating = Math.max(4.55, Math.min(5, 4.45 + score / 100))
  return rating.toFixed(2)
}

const statusLabel = (status) => {
  if (!status) return 'Listed'
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const mapMediaByProperty = (media = []) =>
  media.reduce((acc, item) => {
    if (!item.property_id) return acc
    const existing = acc.get(item.property_id) || []
    existing.push(item)
    acc.set(item.property_id, existing)
    return acc
  }, new Map())

const normalizeListing = (listing, mediaByProperty = new Map(), index = 0) => {
  const property = listing.property || {}
  const media = (mediaByProperty.get(listing.property_id) || [])
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const primaryMedia = media.find((item) => item.is_primary) || media[0]
  const sqft = areaToSqft(property.square_meters)
  const listingType = listing.listing_type || 'sale'
  const priceLabel = `${formatCurrency(listing.price, listing.currency)}${
    ['rental', 'lease'].includes(listingType) ? ' / month' : ''
  }`

  return {
    id: listing.id,
    propertyId: listing.property_id,
    organizationId: listing.organization_id,
    title: titleForProperty(property),
    displayLocation: [property.neighborhood, property.city].filter(Boolean).join(', '),
    address: [property.address, property.city, property.country].filter(Boolean).join(', '),
    category: property.category || 'property',
    listingType,
    status: statusLabel(listing.status),
    featured: Boolean(listing.featured),
    price: Number(listing.price || 0),
    currency: listing.currency || 'GHS',
    priceLabel,
    rating: ratingForListing(listing),
    image: primaryMedia?.public_url || fallbackImages[index % fallbackImages.length],
    media:
      media.length > 0
        ? media
        : fallbackImages.slice(0, 4).map((public_url, mediaIndex) => ({
            id: `${listing.id}-fallback-${mediaIndex}`,
            public_url,
            alt_text: titleForProperty(property),
            sort_order: mediaIndex,
            is_primary: mediaIndex === 0,
          })),
    facts: [
      property.bedrooms ? `${property.bedrooms} Beds` : null,
      property.bathrooms ? `${property.bathrooms} Baths` : null,
      sqft ? `${sqft.toLocaleString()} sqft` : null,
    ].filter(Boolean),
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    sqft,
    squareMeters: property.square_meters,
    description: property.description || 'Verified property record from Supabase.',
    amenities: Array.isArray(property.amenities) ? property.amenities : [],
    property,
    organization: listing.organization || null,
    qualityScore: listing.quality_score,
    verificationStatus: listing.verification_status,
    addressVerified: property.address_verified,
    locationConfidence: property.location_confidence,
    floodRiskLevel: property.flood_risk_level,
    ghanaPostGps: property.ghana_post_gps,
    availableLabel: listing.published_at ? 'Published listing' : 'Available now',
    raw: listing,
  }
}

const attachMedia = async (listings = []) => {
  const mediaByProperty = mapMediaByProperty(
    listings.flatMap((item) => item.media || item.property_media || [])
  )
  return listings.map((item, index) => normalizeListing(item, mediaByProperty, index))
}

export const marketplaceService = {
  async getListings() {
    const data = await callEdgeFunction('marketplace', {
      allowAnonymous: true,
      query: { action: 'listings' },
    })

    if (!data || data.length === 0) return fallbackMarketplaceListings
    return attachMedia(data)
  },

  async getListingById(id) {
    if (!id) return fallbackMarketplaceListings[0]

    const fallback = fallbackMarketplaceListings.find((item) => item.id === id || item.propertyId === id)
    if (fallback) return fallback

    const listings = await this.getListings()
    return (
      listings.find((item) => item.id === id || item.propertyId === id) ||
      fallbackMarketplaceListings[0]
    )
  },

  async getOrganizations() {
    return callEdgeFunction('marketplace', {
      allowAnonymous: true,
      query: { action: 'organizations' },
    })
  },

  async getOwnedOrganization(userId) {
    if (!userId) return null

    return callEdgeFunction('marketplace', {
      query: { action: 'owned-organization' },
    })
  },

  async createListing({ property, listing, organizationId }) {
    const createdListing = await callEdgeFunction('marketplace', {
      method: 'POST',
      query: { action: 'create-listing' },
      body: { property, listing, organizationId },
    })

    const [normalized] = await attachMedia([createdListing])
    return normalized
  },
}

export default marketplaceService

export const FALLBACK_SERVICES = [
  { id: 'legal', name: 'Property legal review', category: 'Legal', provider: 'Gold Coast Legal', price: 'From GHS 800', rating: 4.9, verified: true },
  { id: 'valuation', name: 'Certified valuation', category: 'Valuation', provider: 'BaytMiftah Intelligence', price: 'From GHS 450', rating: 4.8, verified: true },
  { id: 'moving', name: 'Moving & relocation', category: 'Logistics', provider: 'Accra Movers Co.', price: 'From GHS 1,200', rating: 4.6, verified: true },
  { id: 'staging', name: 'Home staging', category: 'Marketing', provider: 'StageRight GH', price: 'From GHS 2,500', rating: 4.7, verified: false },
  { id: 'inspection', name: 'Pre-purchase inspection', category: 'Inspection', provider: 'BuildCheck Ghana', price: 'From GHS 600', rating: 4.8, verified: true },
  { id: 'mortgage', name: 'Mortgage pre-qualification', category: 'Finance', provider: 'Partner banks', price: 'Free', rating: 4.5, verified: true },
]

export const FALLBACK_AGENCIES = [
  {
    id: 'agency-gold-coast',
    name: 'Gold Coast Realty',
    location: 'Cantonments, Accra',
    verified: true,
    trustScore: 94,
    activeListings: 24,
    specialties: ['Luxury', 'Commercial', 'Rentals'],
    bio: 'Full-service agency serving Accra and Kumasi with verified listings and in-house legal support.',
  },
]

export const FALLBACK_AGENTS = [
  {
    id: 'agent-kwame',
    name: 'Kwame Osei',
    agency: 'Gold Coast Realty',
    agencyId: 'agency-gold-coast',
    verified: true,
    rating: 4.9,
    dealsClosed: 42,
    specialties: ['Sales', 'Luxury'],
    bio: 'Senior agent with 8+ years in Accra luxury residential.',
    phone: '0555123456',
  },
]

export function mapServiceRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    provider: row.provider,
    price: row.price_label ?? row.price,
    rating: Number(row.rating ?? 4.5),
    verified: Boolean(row.verified),
    description: row.description ?? null,
  }
}

export function mapDirectoryRow(row: Record<string, unknown>, repScore?: number | null) {
  const type = row.profile_type
  if (type === 'agency') {
    return {
      id: row.id,
      name: row.name,
      location: row.location,
      verified: row.verified,
      trustScore: repScore ?? 88,
      activeListings: row.active_listings ?? 0,
      specialties: row.specialties ?? [],
      bio: row.bio,
      userId: row.user_id ?? null,
    }
  }
  return {
    id: row.id,
    name: row.name,
    agency: row.agency_name,
    agencyId: row.agency_id,
    verified: row.verified,
    rating: Number(row.rating ?? 4.5),
    dealsClosed: row.deals_closed ?? 0,
    specialties: row.specialties ?? [],
    bio: row.bio,
    phone: row.phone ?? null,
    userId: row.user_id ?? null,
  }
}

export const marketplaceServices = [
  { id: 'legal', name: 'Property legal review', category: 'Legal', provider: 'Gold Coast Legal', price: 'From GHS 800', rating: 4.9, verified: true },
  { id: 'valuation', name: 'Certified valuation', category: 'Valuation', provider: 'BaytMiftah Intelligence', price: 'From GHS 450', rating: 4.8, verified: true },
  { id: 'moving', name: 'Moving & relocation', category: 'Logistics', provider: 'Accra Movers Co.', price: 'From GHS 1,200', rating: 4.6, verified: true },
  { id: 'staging', name: 'Home staging', category: 'Marketing', provider: 'StageRight GH', price: 'From GHS 2,500', rating: 4.7, verified: false },
  { id: 'inspection', name: 'Pre-purchase inspection', category: 'Inspection', provider: 'BuildCheck Ghana', price: 'From GHS 600', rating: 4.8, verified: true },
  { id: 'mortgage', name: 'Mortgage pre-qualification', category: 'Finance', provider: 'Partner banks', price: 'Free', rating: 4.5, verified: true },
]

export const publicAgencies = [
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
  {
    id: 'agency-east-legon',
    name: 'East Legon Properties',
    location: 'East Legon, Accra',
    verified: true,
    trustScore: 88,
    activeListings: 16,
    specialties: ['Family homes', 'Rentals'],
    bio: 'Neighborhood specialists for East Legon, Airport Residential, and Labone.',
  },
]

export const publicAgents = [
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
  {
    id: 'agent-efua',
    name: 'Efua Mensah',
    agency: 'Gold Coast Realty',
    agencyId: 'agency-gold-coast',
    verified: true,
    rating: 4.7,
    dealsClosed: 28,
    specialties: ['Rentals', 'Commercial'],
    bio: 'Focused on corporate leases and executive rentals.',
    phone: '0244987654',
  },
]

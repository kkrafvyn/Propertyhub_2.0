import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SvgIcon } from '../../components/Navigation'
import { useAgencyStore } from '../../store/useAgencyStore'

const fallbackAgents = [
  {
    id: 'agent-1',
    name: 'Ama Boateng',
    role: 'Senior Sales Advisor',
    initials: 'AB',
    market: 'Accra Prime Residential',
    activeListings: 18,
    responseTime: '12 min',
  },
  {
    id: 'agent-2',
    name: 'Kojo Mensah',
    role: 'Commercial Leasing Lead',
    initials: 'KM',
    market: 'Airport City and Osu',
    activeListings: 11,
    responseTime: '18 min',
  },
  {
    id: 'agent-3',
    name: 'Nadia Owusu',
    role: 'Client Success Manager',
    initials: 'NO',
    market: 'Cantonments and East Legon',
    activeListings: 14,
    responseTime: '9 min',
  },
]

const fallbackListings = [
  {
    id: 'listing-1',
    title: 'Cantonments serviced apartment',
    location: 'Cantonments, Accra',
    price: 'GHS 28,000 / month',
    status: 'Featured',
    facts: ['3 beds', '3 baths', 'Smart access'],
  },
  {
    id: 'listing-2',
    title: 'Airport City office suite',
    location: 'Airport City, Accra',
    price: 'GHS 42,000 / month',
    status: 'Available',
    facts: ['410 sqm', 'Backup power', 'Concierge'],
  },
]

const fallbackReviews = [
  {
    id: 'review-1',
    name: 'Verified landlord',
    rating: '4.9',
    body: 'Clear communication, strong viewing coordination, and careful documentation checks.',
  },
  {
    id: 'review-2',
    name: 'Relocation buyer',
    rating: '4.8',
    body: 'The team narrowed our search quickly and kept the offer process organized.',
  },
]

const getAgencyValue = (agency, keys, fallback = 'Not provided') =>
  keys.map((key) => agency?.[key]).find(Boolean) || fallback

const initialsFor = (name = '') =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export default function AgencyProfile() {
  const { agencyId } = useParams()
  const {
    currentAgency,
    fetchAgencyById,
    fetchListings,
    fetchTeamMembers,
    listings,
    teamMembers,
    loading,
  } = useAgencyStore()
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (agencyId) fetchAgencyById(agencyId)
  }, [agencyId])

  useEffect(() => {
    if (!currentAgency?.id) return
    fetchListings(currentAgency.id)
    fetchTeamMembers(currentAgency.id)
  }, [currentAgency?.id])

  const agencyName = getAgencyValue(currentAgency, ['name', 'agency_name'], 'Agency')
  const description = getAgencyValue(
    currentAgency,
    ['description', 'bio'],
    'Verified property advisory, listing, and transaction support for serious buyers, renters, and owners.'
  )
  const city = getAgencyValue(currentAgency, ['city'], 'Accra')
  const country = getAgencyValue(currentAgency, ['country', 'country_code'], 'Ghana')
  const publicListings = listings.length > 0 ? listings : fallbackListings
  const publicAgents = teamMembers.length > 0 ? teamMembers : fallbackAgents
  const reviews = currentAgency?.reviews?.length ? currentAgency.reviews : fallbackReviews

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-on-surface">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
          <p className="mt-3 font-semibold">Loading agency profile</p>
        </div>
      </div>
    )
  }

  if (!currentAgency) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4 text-on-surface">
        <div className="max-w-md rounded-lg border border-outline bg-surface-container p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-primary">domain_disabled</span>
          <h1 className="mt-4 text-headline-md font-bold">Agency not found</h1>
          <p className="mt-2 text-on-surface-variant">
            This profile may be private, pending verification, or unavailable.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(7,21,36,0.92)] px-5 py-4 text-[#F8FAFC] backdrop-blur-2xl md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/explore" className="text-2xl font-semibold">
            BaytMiftah
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
            <Link to="/explore" className="hover:text-[#E9C349]">Explore</Link>
            <Link to="/neighborhoods" className="hover:text-[#E9C349]">Neighborhoods</Link>
            <Link to="/login" className="hover:text-[#E9C349]">Sign in</Link>
          </nav>
          <Link to="/explore" className="marketplace-cta px-4 py-2">
            <SvgIcon name="search" className="h-4 w-4" />
            Browse
          </Link>
        </div>
      </header>
      <div className="h-48 bg-gradient-to-r from-primary to-secondary md:h-64" />

      <div className="relative z-10 mx-auto -mt-24 max-w-6xl px-4 pb-16">
        <div className="mb-8 rounded-lg bg-surface-container p-6">
          <div className="flex flex-col items-start gap-6 md:flex-row">
            <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-gray-700">
              <span className="material-symbols-outlined text-5xl text-gray-300">real_estate_agent</span>
            </div>
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="text-display-md font-bold">{agencyName}</h1>
                {currentAgency.verified && (
                  <span className="rounded-full bg-green-500/20 px-3 py-1 text-body-sm text-green-400">
                    Verified
                  </span>
                )}
              </div>
              <p className="mb-4 text-on-surface-variant">{description}</p>
              <div className="grid grid-cols-2 gap-4 text-body-sm md:grid-cols-3">
                <ProfileFact label="Location" value={`${city}, ${country}`} />
                <ProfileFact label="Agents" value={currentAgency.agent_count || publicAgents.length} />
                <ProfileFact
                  label="Operating"
                  value={
                    currentAgency.years_in_business
                      ? `${currentAgency.years_in_business} years`
                      : 'Verified team'
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-surface-container">
          <div className="flex border-b border-gray-700">
            {['overview', 'listings', 'agents', 'reviews'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-3 py-4 text-center font-medium capitalize transition-colors md:px-6 ${
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8">
            {activeTab === 'overview' && (
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <h3 className="mb-4 text-body-lg font-medium">Contact Information</h3>
                  <div className="space-y-3 text-body-md">
                    <ContactRow
                      label="Email"
                      value={getAgencyValue(currentAgency, ['contact_email', 'email'], 'contact pending')}
                    />
                    <ContactRow
                      label="Phone"
                      value={getAgencyValue(currentAgency, ['phone_number', 'phone'], 'contact pending')}
                    />
                    <ContactRow
                      label="Website"
                      value={getAgencyValue(currentAgency, ['website'], 'website pending')}
                      highlight
                    />
                    <ContactRow
                      label="Address"
                      value={getAgencyValue(currentAgency, ['address'], `${city}, ${country}`)}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="mb-4 text-body-lg font-medium">About</h3>
                  <p className="text-body-md leading-relaxed text-on-surface-variant">{description}</p>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {[
                      ['Listings', publicListings.length],
                      ['Agents', publicAgents.length],
                      ['Rating', currentAgency.rating || '4.8'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md bg-surface p-4">
                        <p className="text-2xl font-black text-white">{value}</p>
                        <p className="text-label-sm text-gray-400">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'listings' && (
              <div className="grid gap-4 md:grid-cols-2">
                {publicListings.map((listing) => (
                  <article key={listing.id} className="rounded-lg border border-gray-700 bg-surface p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {listing.title || listing.name || 'Agency listing'}
                        </h3>
                        <p className="mt-1 text-on-surface-variant">
                          {listing.location || listing.displayLocation || listing.address || `${city}, ${country}`}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/20 px-3 py-1 text-label-sm font-bold text-primary">
                        {listing.status || 'Listed'}
                      </span>
                    </div>
                    <p className="mt-4 text-2xl font-black text-white">
                      {listing.price || listing.priceLabel || 'Price on request'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(listing.facts || ['Verified record', 'Agency managed']).map((fact) => (
                        <span key={fact} className="rounded-full bg-gray-800 px-3 py-1 text-label-sm text-gray-300">
                          {fact}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {activeTab === 'agents' && (
              <div className="grid gap-4 md:grid-cols-3">
                {publicAgents.map((agent) => (
                  <article
                    key={agent.id || agent.user_id || agent.name}
                    className="rounded-lg border border-gray-700 bg-surface p-5"
                  >
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/20 text-lg font-black text-primary">
                      {agent.initials || initialsFor(agent.name || agent.full_name) || 'AG'}
                    </span>
                    <h3 className="mt-4 text-xl font-bold text-white">
                      {agent.name || agent.full_name || 'Agency advisor'}
                    </h3>
                    <p className="text-on-surface-variant">{agent.role || agent.member_role || 'Property advisor'}</p>
                    <div className="mt-4 space-y-2 text-body-sm">
                      <p className="text-gray-300">
                        <span className="text-gray-500">Market:</span> {agent.market || 'Ghana property market'}
                      </p>
                      <p className="text-gray-300">
                        <span className="text-gray-500">Active listings:</span>{' '}
                        {agent.activeListings || agent.active_listings || 0}
                      </p>
                      <p className="text-gray-300">
                        <span className="text-gray-500">Response:</span> {agent.responseTime || 'Same day'}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="grid gap-4 md:grid-cols-2">
                {reviews.map((review) => (
                  <article key={review.id || review.name} className="rounded-lg border border-gray-700 bg-surface p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white">{review.name || 'Verified client'}</h3>
                      <span className="rounded-full bg-primary/20 px-3 py-1 font-bold text-primary">
                        {review.rating || '4.8'}
                      </span>
                    </div>
                    <p className="mt-4 leading-7 text-on-surface-variant">
                      {review.body || review.comment || 'Professional service and clear transaction support.'}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileFact({ label, value }) {
  return (
    <div>
      <span className="text-gray-400">{label}</span>
      <p className="text-white">{value}</p>
    </div>
  )
}

function ContactRow({ label, value, highlight = false }) {
  return (
    <div>
      <span className="text-gray-400">{label}:</span>
      <p className={highlight ? 'text-primary' : 'text-white'}>{value}</p>
    </div>
  )
}

import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import marketplaceService, {
  fallbackMarketplaceListings,
} from '../services/marketplace-service'

const categories = [
  { id: 'all', label: 'Marketplace', icon: 'storefront' },
  { id: 'apartment', label: 'Apartments', icon: 'apartment' },
  { id: 'house', label: 'Houses', icon: 'villa' },
  { id: 'office', label: 'Commercial', icon: 'business_center' },
  { id: 'verified', label: 'Verified', icon: 'verified' },
  { id: 'featured', label: 'Featured', icon: 'diamond' },
]

export default function ExploreProperties() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [listings, setListings] = useState(fallbackMarketplaceListings)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let ignore = false

    const loadListings = async () => {
      try {
        setLoading(true)
        const data = await marketplaceService.getListings()
        if (!ignore) {
          setListings(data)
          setLoadError('')
        }
      } catch (error) {
        if (!ignore) {
          setListings(fallbackMarketplaceListings)
          setLoadError('Showing curated fallback listings while Supabase data is unavailable.')
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadListings()

    return () => {
      ignore = true
    }
  }, [])

  const visibleListings = useMemo(() => {
    const query = search.trim().toLowerCase()

    return listings.filter((listing) => {
      const matchesCategory =
        activeCategory === 'all' ||
        listing.category === activeCategory ||
        (activeCategory === 'featured' && listing.featured) ||
        (activeCategory === 'verified' &&
          (listing.addressVerified || listing.organization?.verified))

      const searchableText = [
        listing.title,
        listing.displayLocation,
        listing.address,
        listing.organization?.name,
        listing.category,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return matchesCategory && (!query || searchableText.includes(query))
    })
  }, [activeCategory, listings, search])

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-6 px-5 py-5 md:px-8">
          <Link to="/" className="shrink-0 text-3xl font-bold text-black">
            Property Hub
          </Link>

          <div className="hidden items-center overflow-hidden rounded-full border border-neutral-200 bg-white shadow-xl shadow-black/10 lg:flex">
            <label className="border-r border-neutral-200 px-7 py-3">
              <span className="block text-sm font-semibold">Location</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Accra, Cantonments..."
                className="w-52 bg-transparent text-neutral-600 outline-none placeholder:text-neutral-500"
              />
            </label>
            <button className="border-r border-neutral-200 px-7 py-3 text-left">
              <span className="block text-sm font-semibold">Listing Type</span>
              <span className="text-neutral-500">Sale or rent</span>
            </button>
            <button className="px-7 py-3 text-left">
              <span className="block text-sm font-semibold">Specs</span>
              <span className="text-neutral-500">Beds, baths, area</span>
            </button>
            <button
              className="m-2 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white"
              aria-label="Search properties"
            >
              <span className="material-symbols-outlined">search</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/create-listing"
              className="hidden text-sm font-semibold hover:underline md:inline-flex"
            >
              Property Hub your home
            </Link>
            <button className="hidden h-11 w-11 items-center justify-center rounded-full hover:bg-neutral-100 sm:flex">
              <span className="material-symbols-outlined">language</span>
            </button>
            <button className="flex items-center gap-3 rounded-full border border-neutral-200 px-4 py-2 hover:shadow-lg hover:shadow-black/10">
              <span className="material-symbols-outlined">menu</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-black">
                <span className="material-symbols-outlined text-xl">person</span>
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 px-5 pb-3 md:px-8 lg:gap-6">
          <div className="flex-1 overflow-x-auto">
            <div className="flex min-w-max gap-4 lg:min-w-0 lg:justify-between">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex w-28 shrink-0 flex-col items-center gap-1 border-b-2 pb-3 transition ${
                    activeCategory === category.id
                      ? 'border-black text-black'
                      : 'border-transparent text-neutral-500 hover:text-black'
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl">
                    {category.icon}
                  </span>
                  <span className="whitespace-nowrap text-sm font-semibold">
                    {category.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button className="hidden shrink-0 items-center gap-2 rounded-2xl border border-neutral-200 px-5 py-3 font-semibold hover:border-black md:flex">
            <span className="material-symbols-outlined">tune</span>
            Filters
          </button>
        </div>
      </header>

      <main className="px-5 pb-36 pt-8 md:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
              {loading ? 'Syncing Supabase inventory' : `${visibleListings.length} live listings`}
            </p>
            {loadError && <p className="mt-1 text-sm text-neutral-500">{loadError}</p>}
          </div>
          <p className="text-sm text-neutral-500">
            Source: Supabase listings, properties, organizations, and media.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
          {visibleListings.map((listing) => (
            <Link
              key={listing.id}
              to={`/property/${listing.id}`}
              className="group block"
            >
              <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
                <img
                  src={listing.image}
                  alt={listing.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <button
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur"
                  aria-label={`Save ${listing.title}`}
                  onClick={(event) => event.preventDefault()}
                >
                  <span className="material-symbols-outlined text-3xl">
                    favorite_border
                  </span>
                </button>
                {listing.addressVerified && (
                  <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
                    Verified
                  </span>
                )}
              </div>

              <div className="pt-3">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold leading-tight text-black">
                    {listing.displayLocation || listing.address}
                  </h2>
                  <span className="flex shrink-0 items-center gap-1 text-sm text-black">
                    <span className="material-symbols-outlined text-base">star</span>
                    {listing.rating}
                  </span>
                </div>
                <p className="mt-1 text-neutral-500">{listing.title}</p>
                <p className="text-neutral-500">{listing.facts.join(' • ')}</p>
                <p className="mt-3 text-lg">
                  <span className="font-bold text-black">{listing.priceLabel}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>

        {visibleListings.length === 0 && (
          <div className="py-24 text-center">
            <h2 className="mb-2 text-3xl font-semibold">No matching properties</h2>
            <p className="text-neutral-500">
              Try another location, category, or agency search.
            </p>
          </div>
        )}
      </main>

      <button className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-7 py-4 font-bold text-white shadow-2xl shadow-black/30">
        Show map
        <span className="material-symbols-outlined">map</span>
      </button>
    </div>
  )
}

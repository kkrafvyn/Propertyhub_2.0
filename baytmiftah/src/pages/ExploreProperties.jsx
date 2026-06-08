import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import marketplaceService, {
  fallbackMarketplaceListings,
} from '../services/marketplace-service'
import BackendStatusBanner from '../components/BackendStatusBanner'
import { SvgIcon } from '../components/Navigation'
import { getComparisonIds, toggleComparisonId } from '../services/comparison-service'
import {
  getSavedSearches,
  listRemoteSavedSearches,
  saveSearchAlert,
} from '../services/saved-search-service'
import { geocodeLocation } from '../services/geo-service'

const categories = [
  { id: 'all', label: 'Marketplace', icon: 'storefront' },
  { id: 'apartment', label: 'Apartments', icon: 'apartment' },
  { id: 'house', label: 'Houses', icon: 'villa' },
  { id: 'office', label: 'Commercial', icon: 'business' },
  { id: 'verified', label: 'Verified', icon: 'verified' },
  { id: 'featured', label: 'Featured', icon: 'diamond' },
]

export default function ExploreProperties() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [listings, setListings] = useState(fallbackMarketplaceListings)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [comparisonIds, setComparisonIds] = useState(getComparisonIds)
  const [savedSearches, setSavedSearches] = useState(getSavedSearches)
  const [mapMode, setMapMode] = useState(false)
  const [priceRange, setPriceRange] = useState('any')
  const [geoResult, setGeoResult] = useState(null)
  const [geocoding, setGeocoding] = useState(false)
  const [persistenceNotice, setPersistenceNotice] = useState('')

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

    listRemoteSavedSearches().then(({ searches, source }) => {
      setSavedSearches(searches)
      if (source === 'supabase') setPersistenceNotice('Saved searches synced with Supabase.')
    })

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

      const matchesPrice =
        priceRange === 'any' ||
        (priceRange === 'under-1m' && Number(listing.price || 0) < 1000000) ||
        (priceRange === '1m-3m' &&
          Number(listing.price || 0) >= 1000000 &&
          Number(listing.price || 0) <= 3000000) ||
        (priceRange === '3m-plus' && Number(listing.price || 0) > 3000000)

      return matchesCategory && matchesPrice && (!query || searchableText.includes(query))
    })
  }, [activeCategory, listings, priceRange, search])

  const saveCurrentSearch = async () => {
    const { search: saved, source } = await saveSearchAlert({
      query: search || 'All locations',
      category: activeCategory,
      priceRange,
      resultCount: visibleListings.length,
    })
    setSavedSearches((current) => [saved, ...current])
    setPersistenceNotice(
      source === 'supabase'
        ? 'Saved search stored in Supabase.'
        : 'Saved locally. Supabase persistence needs your backend setup.'
    )
  }

  const geocodeCurrentSearch = async () => {
    setGeocoding(true)
    const result = await geocodeLocation(search || 'Accra')
    setGeoResult(result)
    setMapMode(true)
    setGeocoding(false)
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-6 px-5 py-5 md:px-8">
          <Link to="/" className="shrink-0 text-3xl font-bold text-black">
            BaytMiftah
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
              <SvgIcon name="search" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/create-listing"
              className="hidden text-sm font-semibold hover:underline md:inline-flex"
            >
              BaytMiftah your home
            </Link>
            <button className="hidden h-11 w-11 items-center justify-center rounded-full hover:bg-neutral-100 sm:flex">
              <SvgIcon name="language" />
            </button>
            <button className="flex items-center gap-3 rounded-full border border-neutral-200 px-4 py-2 hover:shadow-lg hover:shadow-black/10">
              <SvgIcon name="menu" />
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-black">
                <SvgIcon name="person" className="h-4 w-4" />
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
                  <SvgIcon name={category.icon} className="h-7 w-7" />
                  <span className="whitespace-nowrap text-sm font-semibold">
                    {category.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button className="hidden shrink-0 items-center gap-2 rounded-2xl border border-neutral-200 px-5 py-3 font-semibold hover:border-black md:flex">
            <SvgIcon name="tune" />
            Filters
          </button>
        </div>
        {persistenceNotice && (
          <div className="border-t border-neutral-200 px-5 py-2 text-sm font-semibold text-neutral-600 md:px-8">
            {persistenceNotice}
          </div>
        )}
      </header>

      <main className="px-5 pb-36 pt-8 md:px-8">
        <BackendStatusBanner className="mb-6" />
        <section className="mb-6 grid gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="md:col-span-2">
              <span className="text-sm font-semibold">Map area search</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Draw from search: Accra, Cantonments, Airport..."
                className="mt-2 h-11 w-full rounded-md border border-neutral-200 px-3 outline-none"
              />
            </label>
            <label>
              <span className="text-sm font-semibold">Budget</span>
              <select
                value={priceRange}
                onChange={(event) => setPriceRange(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-neutral-200 px-3 outline-none"
              >
                <option value="any">Any budget</option>
                <option value="under-1m">Under GHS 1M</option>
                <option value="1m-3m">GHS 1M - 3M</option>
                <option value="3m-plus">GHS 3M+</option>
              </select>
            </label>
            <div>
              <span className="text-sm font-semibold">Mode</span>
              <button
                onClick={() => setMapMode((current) => !current)}
                className={`mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-md border font-semibold ${
                  mapMode ? 'border-black bg-black text-white' : 'border-neutral-200 bg-white'
                }`}
              >
                <SvgIcon name="map" className="h-4 w-4" />
                {mapMode ? 'Map on' : 'Map off'}
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <button
              onClick={geocodeCurrentSearch}
              className="rounded-md border border-neutral-300 bg-white px-5 py-3 font-bold text-black"
            >
              {geocoding ? 'Locating...' : 'Locate'}
            </button>
            <button onClick={saveCurrentSearch} className="rounded-md bg-black px-5 py-3 font-bold text-white">
              Save Alert
            </button>
          </div>
        </section>
        {mapMode && (
          <section className="mb-6 overflow-hidden rounded-lg border border-neutral-200 bg-[#dfe7dc]">
            <div className="relative h-72 bg-[radial-gradient(circle_at_28%_48%,rgba(0,0,0,.18),transparent_15%),linear-gradient(135deg,#cbd5c0,#edf4e8)]">
              {geoResult?.results?.[0] && (
                <div className="absolute left-4 top-4 rounded-md bg-white/95 px-4 py-3 text-sm font-semibold shadow">
                  <SvgIcon name="my_location" className="mr-1 inline h-4 w-4 align-middle" />
                  {geoResult.results[0].label}
                  <span className="ml-2 text-neutral-500">({geoResult.source})</span>
                </div>
              )}
              {visibleListings.slice(0, 4).map((listing, index) => (
                <Link
                  key={listing.id}
                  to={`/property/${listing.id}`}
                  className="absolute rounded-full bg-black px-4 py-2 text-sm font-bold text-white shadow-lg"
                  style={{
                    left: `${18 + index * 18}%`,
                    top: `${28 + (index % 2) * 30}%`,
                  }}
                >
                  {listing.priceLabel}
                </Link>
              ))}
            </div>
          </section>
        )}
        {savedSearches.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto">
            {savedSearches.slice(0, 4).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSearch(item.query === 'All locations' ? '' : item.query)
                  setActiveCategory(item.category)
                  setPriceRange(item.priceRange)
                }}
                className="shrink-0 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold"
              >
                {item.query} / {item.resultCount} results
              </button>
            ))}
          </div>
        )}
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
              className="group block rounded-lg border border-transparent p-2 transition hover:border-neutral-200 hover:bg-neutral-50"
            >
              <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100 shadow-sm">
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
                  <SvgIcon name="favorite_border" className="h-6 w-6" />
                </button>
                {listing.addressVerified && (
                  <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
                    <SvgIcon name="verified" className="h-3.5 w-3.5 text-[#0f766e]" />
                    Verified
                  </span>
                )}
                <button
                  className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-black"
                  onClick={(event) => {
                    event.preventDefault()
                    setComparisonIds(toggleComparisonId(listing.id))
                  }}
                >
                  {comparisonIds.includes(listing.id) ? 'Compared' : 'Compare'}
                </button>
              </div>

              <div className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold leading-tight text-black">
                    {listing.displayLocation || listing.address}
                  </h2>
                  <span className="flex shrink-0 items-center gap-1 text-sm text-black">
                    <SvgIcon name="star" className="h-4 w-4 fill-[#E9C349] text-[#E9C349]" />
                    {listing.rating}
                  </span>
                </div>
                <p className="mt-1 text-neutral-500">{listing.title}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {listing.facts.slice(0, 3).map((fact) => (
                    <span
                      key={fact}
                      className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600"
                    >
                      {fact}
                    </span>
                  ))}
                </div>
                <p className="text-neutral-500">{listing.facts.join(' • ')}</p>
                <p className="mt-3 text-lg">
                  <span className="font-bold text-black">{listing.priceLabel}</span>
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <span>{listing.organization?.verified ? 'Verified agency' : 'Partner agency'}</span>
                  <span>{listing.qualityScore || 82}% score</span>
                </div>
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

      <Link
        to="/compare"
        className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-7 py-4 font-bold text-white shadow-2xl shadow-black/30"
      >
        Compare {comparisonIds.length || ''}
        <SvgIcon name="compare_arrows" />
      </Link>
    </div>
  )
}

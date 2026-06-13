import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MobileShell, { MobileCategoryChips, MobileHeader, MobileSearchBar } from '../../components/MobileShell'
import { syncSavedIds } from '../../lib/saved-listings'
import { fetchListings } from '../../services/marketplace-service'

const categories = [
  { id: 'all', label: 'All' },
  { id: 'apartment', label: 'Apts' },
  { id: 'house', label: 'Houses' },
  { id: 'office', label: 'Commercial' },
]

export default function MobileHomePage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [listings, setListings] = useState([])

  useEffect(() => {
    fetchListings().then(({ listings: rows }) => setListings(rows))
  }, [])

  const visible = useMemo(() => {
    const q = search.toLowerCase()
    return listings.filter((l) => {
      const matchCat = category === 'all' || l.type === category
      const matchQ = !q || `${l.title} ${l.location}`.toLowerCase().includes(q)
      return matchCat && matchQ
    }).slice(0, 6)
  }, [listings, search, category])

  return (
    <MobileShell>
      <MobileHeader title="BaytMiftah" subtitle="Properties near you" />
      <MobileSearchBar value={search} onChange={setSearch} />
      <MobileCategoryChips options={categories} active={category} onChange={setCategory} />

      <section className="space-y-3 px-4 pb-4">
        <h2 className="text-base font-bold text-ink">Popular in Accra</h2>
        {visible.map((listing) => (
          <Link key={listing.id} to={`/m/property/${listing.id}`} className="flex gap-3 rounded-2xl bg-surface p-3 shadow-sm">
            <img src={listing.image} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{listing.title}</p>
              <p className="truncate text-sm text-ink-secondary">{listing.location}</p>
              <p className="mt-1 text-sm font-bold text-brand-dark">{listing.priceLabel}</p>
            </div>
          </Link>
        ))}
      </section>
    </MobileShell>
  )
}

export function MobileExplorePage() {
  const [search, setSearch] = useState('')
  const [listings, setListings] = useState([])

  useEffect(() => {
    fetchListings().then(({ listings: rows }) => setListings(rows))
  }, [])

  const visible = listings.filter((l) =>
    !search || `${l.title} ${l.location}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <MobileShell>
      <MobileHeader title="Explore" subtitle="Find your next home" />
      <MobileSearchBar value={search} onChange={setSearch} />
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        {visible.map((listing) => (
          <Link key={listing.id} to={`/m/property/${listing.id}`} className="overflow-hidden rounded-2xl bg-surface shadow-sm">
            <img src={listing.image} alt="" className="aspect-square w-full object-cover" />
            <div className="p-2.5">
              <p className="truncate text-sm font-semibold">{listing.title}</p>
              <p className="text-xs font-bold text-brand-dark">{listing.priceLabel}</p>
            </div>
          </Link>
        ))}
      </div>
    </MobileShell>
  )
}

export function MobileSavedPage() {
  const [listings, setListings] = useState([])

  useEffect(() => {
    syncSavedIds().then((ids) => {
      fetchListings().then(({ listings: rows }) => setListings(rows.filter((l) => ids.includes(l.id))))
    })
  }, [])

  return (
    <MobileShell>
      <MobileHeader title="Saved" subtitle={`${listings.length} homes`} />
      <div className="space-y-3 px-4 pb-4">
        {listings.length === 0 ? (
          <p className="py-12 text-center text-ink-secondary">No saved homes yet</p>
        ) : (
          listings.map((listing) => (
            <Link key={listing.id} to={`/m/property/${listing.id}`} className="flex gap-3 rounded-2xl bg-surface p-3 shadow-sm">
              <img src={listing.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
              <div>
                <p className="font-semibold">{listing.title}</p>
                <p className="text-sm text-brand-dark">{listing.priceLabel}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </MobileShell>
  )
}

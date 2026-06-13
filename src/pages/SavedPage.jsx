import { useEffect, useState } from 'react'

import { Link } from 'react-router-dom'

import DesktopShell, { CompactSearch } from '../components/DesktopShell'

import BackendBanner from '../components/BackendBanner'

import ListingCard from '../components/ListingCard'

import { syncSavedIds, toggleSavedIdAsync } from '../lib/saved-listings'

import { fetchListings } from '../services/marketplace-service'



export default function SavedPage() {

  const [savedIds, setSavedIds] = useState([])

  const [listings, setListings] = useState([])

  const [loading, setLoading] = useState(true)



  useEffect(() => {

    syncSavedIds().then((ids) => {

      setSavedIds(ids)

      fetchListings().then(({ listings: rows }) => {

        setListings(rows.filter((l) => ids.includes(l.id)))

        setLoading(false)

      })

    })

  }, [])



  async function handleToggle(id) {

    const next = await toggleSavedIdAsync(id)

    setSavedIds(next)

    setListings((prev) => prev.filter((l) => next.includes(l.id)))

  }



  return (

    <DesktopShell search={<CompactSearch />}>

      <BackendBanner />

      <h1 className="text-2xl font-semibold text-ink">Saved homes</h1>

      <p className="mt-1 text-ink-secondary">Properties you&apos;ve saved for later.</p>



      <section className="mt-8">

        {loading ? (

          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {Array.from({ length: 4 }).map((_, i) => (

              <div key={i} className="animate-pulse aspect-[20/19] rounded-card bg-surface-hover" />

            ))}

          </div>

        ) : listings.length === 0 ? (

          <div className="rounded-card border border-surface-border bg-surface-subtle px-8 py-16 text-center">

            <h2 className="text-xl font-semibold">No saved homes yet</h2>

            <p className="mt-2 text-ink-secondary">Tap the heart on any listing to save it here.</p>

            <Link

              to="/"

              className="mt-6 inline-block rounded-lg bg-brand-dark px-6 py-3 text-sm font-semibold text-brand"

            >

              Start exploring

            </Link>

          </div>

        ) : (

          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {listings.map((listing) => (

              <ListingCard

                key={listing.id}

                listing={listing}

                saved

                onToggleSave={handleToggle}

              />

            ))}

          </div>

        )}

      </section>

    </DesktopShell>

  )

}


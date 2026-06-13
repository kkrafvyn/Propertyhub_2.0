import { useEffect, useState } from 'react'

import { Link } from 'react-router-dom'

import ProtectedRoute from '../components/ProtectedRoute'

import DesktopShell, { CompactSearch } from '../components/DesktopShell'

import BackendBanner from '../components/BackendBanner'

import { fetchUserTrips } from '../services/booking-service'

import { fetchListings } from '../services/marketplace-service'



function TripsContent() {

  const [trips, setTrips] = useState([])

  const [listingsById, setListingsById] = useState({})

  const [loading, setLoading] = useState(true)

  const [source, setSource] = useState('local')



  useEffect(() => {

    Promise.all([fetchUserTrips(), fetchListings()]).then(([{ trips: rows, source: tripSource }, { listings }]) => {

      setListingsById(Object.fromEntries(listings.map((l) => [l.id, l])))

      setTrips(rows)

      setSource(tripSource)

      setLoading(false)

    })

  }, [])



  return (

    <DesktopShell search={<CompactSearch />}>

      <BackendBanner />

      <h1 className="text-2xl font-semibold text-ink">Trips</h1>

      <p className="mt-1 text-ink-secondary">Your upcoming and past property viewings.</p>



      <section className="mt-8">

        {loading ? (

          <div className="space-y-4">

            {Array.from({ length: 3 }).map((_, i) => (

              <div key={i} className="h-24 animate-pulse rounded-card bg-surface-hover" />

            ))}

          </div>

        ) : trips.length === 0 ? (

          <div className="rounded-card border border-surface-border bg-surface-subtle px-8 py-16 text-center">

            <h2 className="text-xl font-semibold">No viewings yet</h2>

            <p className="mt-2 text-ink-secondary">

              Request a viewing from any property page — your bookings will show up here.

            </p>

            <Link

              to="/"

              className="mt-6 inline-block rounded-lg bg-brand-dark px-6 py-3 text-sm font-semibold text-brand"

            >

              Browse homes

            </Link>

          </div>

        ) : (

          <div className="space-y-4">

            {source === 'local' && (

              <p className="rounded-lg border border-brand/30 bg-brand-light px-4 py-2 text-sm text-brand-dark">

                Showing locally saved trips — sign in and deploy backend for synced bookings.

              </p>

            )}

            {trips.map((trip) => {

              const listing = listingsById[trip.listing_id]

              return (

                <article

                  key={trip.id}

                  className="flex gap-4 rounded-card border border-surface-border p-4"

                >

                  {listing?.image && (

                    <img

                      src={listing.image}

                      alt=""

                      className="h-24 w-32 shrink-0 rounded-lg object-cover"

                    />

                  )}

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">

                      {trip.status}

                    </p>

                    <h2 className="mt-1 font-semibold text-ink">

                      {listing?.title || trip.listing_id}

                    </h2>

                    <p className="mt-1 text-sm text-ink-secondary">

                      {trip.preferred_date} · {trip.guests} guest{trip.guests > 1 ? 's' : ''}

                    </p>

                  </div>

                </article>

              )

            })}

          </div>

        )}

      </section>

    </DesktopShell>

  )

}



export default function TripsPage() {

  return (

    <ProtectedRoute>

      <TripsContent />

    </ProtectedRoute>

  )

}


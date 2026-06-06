import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import marketplaceService, {
  fallbackMarketplaceListings,
} from '../services/marketplace-service'

export default function Dashboard() {
  const navigate = useNavigate()
  const [featuredListings, setFeaturedListings] = useState(fallbackMarketplaceListings)

  useEffect(() => {
    let ignore = false

    marketplaceService
      .getListings()
      .then((data) => {
        if (!ignore) setFeaturedListings(data.slice(0, 3))
      })
      .catch(() => {
        if (!ignore) setFeaturedListings(fallbackMarketplaceListings)
      })

    return () => {
      ignore = true
    }
  }, [])

  const stats = useMemo(() => {
    const totalValue = featuredListings.reduce((sum, item) => sum + (item.price || 0), 0)
    const featuredCount = featuredListings.filter((item) => item.featured).length
    const verifiedCount = featuredListings.filter(
      (item) => item.addressVerified || item.organization?.verified
    ).length

    return [
      {
        label: 'Live Listings',
        value: `${featuredListings.length}`,
        icon: 'home_work',
        note: 'From Supabase',
      },
      {
        label: 'Featured Assets',
        value: `${featuredCount}`,
        icon: 'diamond',
        note: 'Public visibility',
      },
      {
        label: 'Listing Value',
        value: totalValue ? `GHS ${(totalValue / 1000000).toFixed(1)}M` : '$1.2B',
        icon: 'trending_up',
        note: 'Active sample',
      },
      {
        label: 'Verified Records',
        value: `${verifiedCount}`,
        icon: 'verified_user',
        note: 'Address or agency',
      },
    ]
  }, [featuredListings])

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />

      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Property Hub Workspace" />

        <div className="px-4 pt-24 md:px-8">
          <div className="mx-auto max-w-container space-y-10">
            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-lg border border-outline-variant bg-surface-container p-6 md:p-8">
                <p className="text-label-sm text-secondary">Property Hub command center</p>
                <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-secondary md:text-5xl">
                  Premium property operations, tuned for fast decisions.
                </h2>
                <p className="mt-4 max-w-2xl text-body-lg text-on-surface-variant">
                  Monitor private listings, incoming buyer intent, portfolio
                  health, and agent actions from one calm workspace.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <button onClick={() => navigate('/portfolio')} className="btn-primary">
                    Review Portfolio
                  </button>
                  <button onClick={() => navigate('/messages')} className="btn-secondary">
                    Open Messages
                  </button>
                </div>
              </div>

              <aside className="rounded-lg border border-outline-variant bg-secondary p-6 text-on-secondary md:p-8">
                <span className="material-symbols-outlined text-4xl">verified_user</span>
                <h3 className="mt-8 text-2xl font-semibold">Today&apos;s Priority</h3>
                <p className="mt-3 text-on-secondary/80">
                  Complete buyer verification for the Skyview Penthouse file
                  before releasing the private inspection calendar.
                </p>
                <button className="mt-8 rounded-md bg-on-secondary px-5 py-3 font-semibold text-secondary">
                  Review File
                </button>
              </aside>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <article key={stat.label} className="rounded-lg border border-outline-variant bg-surface-container p-5">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                      <span className="material-symbols-outlined">{stat.icon}</span>
                    </span>
                    <span className="text-sm text-on-surface-variant">{stat.note}</span>
                  </div>
                  <p className="mt-5 text-sm uppercase tracking-wider text-on-surface-variant">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-on-surface">{stat.value}</p>
                </article>
              ))}
            </section>

            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-semibold text-secondary">
                    Featured Exclusive Listings
                  </h3>
                  <p className="mt-1 text-on-surface-variant">
                    High-intent inventory ready for buyer follow-up.
                  </p>
                </div>
                <Link to="/portfolio" className="hidden font-semibold text-secondary sm:block">
                  View portfolio
                </Link>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {featuredListings.map((listing) => (
                  <Link
                    key={listing.id}
                    to={`/property/${listing.id}`}
                    className="group overflow-hidden rounded-lg border border-outline-variant bg-surface-container transition hover:border-secondary/60"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={listing.image}
                        alt={listing.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <span className="absolute right-4 top-4 rounded-full bg-secondary px-4 py-2 text-sm font-bold uppercase tracking-wider text-on-secondary">
                        {listing.featured ? 'Featured' : listing.status}
                      </span>
                    </div>
                    <div className="p-5">
                      <h4 className="text-xl font-semibold leading-tight group-hover:text-secondary">
                        {listing.title}
                      </h4>
                      <p className="mt-2 flex items-center gap-1 text-on-surface-variant">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        {listing.displayLocation || listing.address}
                      </p>
                      <p className="mt-4 text-lg font-bold text-secondary">
                        {listing.priceLabel}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <button
                onClick={() => navigate('/create-listing')}
                className="rounded-lg border border-outline-variant bg-surface-container p-6 text-left transition hover:border-secondary/60"
              >
                <span className="material-symbols-outlined text-3xl text-secondary">add_circle</span>
                <h4 className="mt-4 text-2xl font-semibold">Create New Listing</h4>
                <p className="mt-2 text-on-surface-variant">
                  Package a premium property with media, pricing, and smart-home readiness.
                </p>
              </button>

              <button
                onClick={() => navigate('/agent/dashboard')}
                className="rounded-lg border border-outline-variant bg-surface-container p-6 text-left transition hover:border-secondary/60"
              >
                <span className="material-symbols-outlined text-3xl text-secondary">monitoring</span>
                <h4 className="mt-4 text-2xl font-semibold">Agent Performance</h4>
                <p className="mt-2 text-on-surface-variant">
                  Review lead momentum, conversion health, and portfolio performance.
                </p>
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

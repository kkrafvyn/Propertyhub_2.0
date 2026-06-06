import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import marketplaceService, {
  fallbackMarketplaceListings,
} from '../services/marketplace-service'

export default function MyListings() {
  const navigate = useNavigate()
  const [listings, setListings] = useState(fallbackMarketplaceListings)

  useEffect(() => {
    let ignore = false

    marketplaceService
      .getListings()
      .then((data) => {
        if (!ignore) setListings(data)
      })
      .catch(() => {
        if (!ignore) setListings(fallbackMarketplaceListings)
      })

    return () => {
      ignore = true
    }
  }, [])

  const stats = useMemo(() => {
    const activeCount = listings.filter((listing) =>
      String(listing.status).toLowerCase().includes('listed')
    ).length
    const totalValue = listings.reduce((sum, listing) => sum + (listing.price || 0), 0)
    const verifiedCount = listings.filter(
      (listing) => listing.addressVerified || listing.organization?.verified
    ).length

    return [
      { label: 'Active Listings', value: activeCount || listings.length, icon: 'home_work' },
      { label: 'Portfolio Value', value: `GHS ${(totalValue / 1000000).toFixed(1)}M`, icon: 'payments' },
      { label: 'Verified Records', value: verifiedCount, icon: 'verified' },
    ]
  }, [listings])

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />

      <main className="pb-32 md:ml-64 md:pb-10">
        <Header
          title="My Listings"
          actions={[
            {
              label: 'Create Listing',
              icon: 'add',
              variant: 'primary',
              onClick: () => navigate('/create-listing'),
            },
          ]}
        />

        <div className="px-4 pt-24 md:px-8">
          <div className="mx-auto max-w-container space-y-8">
            <section className="grid gap-4 md:grid-cols-3">
              {stats.map((stat) => (
                <article key={stat.label} className="rounded-lg border border-outline-variant bg-surface-container p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-on-surface-variant">{stat.label}</p>
                      <p className="mt-2 text-4xl font-bold text-secondary">{stat.value}</p>
                    </div>
                    <span className="material-symbols-outlined text-4xl text-secondary">
                      {stat.icon}
                    </span>
                  </div>
                </article>
              ))}
            </section>

            <section className="space-y-5">
              {listings.map((listing) => (
                <article
                  key={listing.id}
                  className="grid overflow-hidden rounded-lg border border-outline-variant bg-surface-container md:grid-cols-[280px_1fr]"
                >
                  <img
                    src={listing.image}
                    alt={listing.title}
                    className="h-64 w-full object-cover md:h-full"
                  />

                  <div className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-2xl font-semibold leading-tight">
                          {listing.title}
                        </h3>
                        <p className="mt-2 flex items-center gap-1 text-on-surface-variant">
                          <span className="material-symbols-outlined text-base">location_on</span>
                          {listing.displayLocation || listing.address}
                        </p>
                      </div>
                      <span
                        className={`w-fit rounded-full px-4 py-2 text-sm font-bold uppercase tracking-wider ${
                          String(listing.status).toLowerCase().includes('listed')
                            ? 'bg-secondary text-on-secondary'
                            : 'bg-secondary/15 text-secondary'
                        }`}
                      >
                        {listing.status}
                      </span>
                    </div>

                    <div className="mt-8 grid gap-4 border-y border-outline-variant py-5 sm:grid-cols-3">
                      <div>
                        <p className="text-sm text-on-surface-variant">Price</p>
                        <p className="font-bold text-secondary">
                          {listing.priceLabel}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-on-surface-variant">Quality</p>
                        <p className="font-bold">{listing.qualityScore || 82}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-on-surface-variant">Agency</p>
                        <p className="font-bold text-secondary">
                          {listing.organization?.name || 'Property Hub'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button className="btn-secondary">Edit Listing</button>
                      <button className="btn-secondary">View Inquiries</button>
                      <button
                        onClick={() => navigate(`/property/${listing.id}`)}
                        className="btn-primary"
                      >
                        Property Page
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

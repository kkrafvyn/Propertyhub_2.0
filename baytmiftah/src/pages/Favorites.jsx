import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import { DemoModeBanner } from '../components/UI'
import marketplaceService, {
  fallbackMarketplaceListings,
} from '../services/marketplace-service'

export default function Favorites() {
  const [favorites, setFavorites] = useState(fallbackMarketplaceListings)
  const [usingFallback, setUsingFallback] = useState(true)

  useEffect(() => {
    let ignore = false

    marketplaceService
      .getListings()
      .then((data) => {
        if (!ignore) {
          setFavorites(data.slice(0, 4))
          setUsingFallback(data === fallbackMarketplaceListings)
        }
      })
      .catch(() => {
        if (!ignore) {
          setFavorites(fallbackMarketplaceListings)
          setUsingFallback(true)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />

      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Saved Listings" />

        <div className="px-4 pt-24 md:px-8">
          <div className="mx-auto max-w-container">
            <div className="mb-7">
              <h2 className="text-4xl font-bold text-secondary">
                Your Favorite Properties
              </h2>
              <p className="mt-2 text-on-surface-variant">
                {favorites.length} live properties staged for review, tours, or offers.
              </p>
            </div>

            {usingFallback && <DemoModeBanner className="mb-6" />}

            <div className="grid gap-6 lg:grid-cols-2">
              {favorites.map((property) => (
                <article
                  key={property.id}
                  className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container transition hover:border-secondary/60"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={property.image}
                      alt={property.title}
                      className="h-full w-full object-cover"
                    />
                    <button
                      className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-on-secondary"
                      aria-label={`Remove ${property.title} from saved listings`}
                    >
                      <span className="material-symbols-outlined">favorite</span>
                    </button>
                  </div>

                  <div className="p-6">
                    <h3 className="text-2xl font-semibold leading-tight">
                      {property.title}
                    </h3>
                    <p className="mt-2 flex items-center gap-1 text-on-surface-variant">
                      <span className="material-symbols-outlined text-base">location_on</span>
                        {property.displayLocation || property.address}
                    </p>

                    <div className="mt-5 grid grid-cols-3 border-y border-outline-variant py-4 text-center">
                      {[
                        ['bed', property.bedrooms ? `${property.bedrooms} Beds` : 'Flexible'],
                        ['bathtub', property.bathrooms ? `${property.bathrooms} Baths` : 'Service'],
                        ['straighten', property.sqft ? `${property.sqft.toLocaleString()} sqft` : `${property.squareMeters || 0} sqm`],
                      ].map(([icon, label], index) => (
                        <div
                          key={label}
                          className={index > 0 ? 'border-l border-outline-variant' : ''}
                        >
                          <span className="material-symbols-outlined block text-secondary">
                            {icon}
                          </span>
                          <span className="mt-1 block text-sm font-semibold">{label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-2xl font-bold text-secondary">
                          {property.priceLabel}
                        </p>
                        <p className="text-sm text-on-surface-variant">
                          Supabase source record
                        </p>
                      </div>
                      <Link to={`/property/${property.id}`} className="btn-primary text-center">
                        Schedule Tour
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

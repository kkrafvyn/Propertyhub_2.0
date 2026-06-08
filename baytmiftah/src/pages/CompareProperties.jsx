import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import marketplaceService, { fallbackMarketplaceListings } from '../services/marketplace-service'
import { clearComparisonIds, getComparisonIds, toggleComparisonId } from '../services/comparison-service'
import { EmptyState } from '../components/UI'

export default function CompareProperties() {
  const [listings, setListings] = useState(fallbackMarketplaceListings)
  const [selectedIds, setSelectedIds] = useState(getComparisonIds)

  useEffect(() => {
    marketplaceService
      .getListings()
      .then((data) => setListings(data.length ? data : fallbackMarketplaceListings))
      .catch(() => setListings(fallbackMarketplaceListings))
  }, [])

  const selectedListings = useMemo(
    () => listings.filter((listing) => selectedIds.includes(listing.id)),
    [listings, selectedIds]
  )

  const toggle = (id) => setSelectedIds(toggleComparisonId(id))

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Compare Properties" />
        <div className="px-4 pt-24 md:px-8">
          <div className="mx-auto max-w-container space-y-8">
            <section className="rounded-lg border border-outline-variant bg-surface-container p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-label-sm text-secondary">Buyer decision desk</p>
                  <h1 className="mt-2 text-3xl font-semibold text-secondary">
                    Compare price, quality, location, verification, and amenities.
                  </h1>
                </div>
                <button
                  onClick={() => {
                    clearComparisonIds()
                    setSelectedIds([])
                  }}
                  className="btn-secondary"
                >
                  Clear
                </button>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[300px_1fr]">
              <aside className="rounded-lg border border-outline-variant bg-surface-container p-4">
                <h2 className="font-semibold">Add properties</h2>
                <div className="mt-4 space-y-3">
                  {listings.map((listing) => (
                    <button
                      key={listing.id}
                      onClick={() => toggle(listing.id)}
                      className={`flex w-full items-center gap-3 rounded-md border p-3 text-left ${
                        selectedIds.includes(listing.id)
                          ? 'border-secondary bg-secondary/10'
                          : 'border-outline-variant bg-surface'
                      }`}
                    >
                      <img src={listing.image} alt="" className="h-14 w-16 rounded object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{listing.title}</span>
                        <span className="text-sm text-on-surface-variant">{listing.priceLabel}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </aside>

              {selectedListings.length === 0 ? (
                <div className="rounded-lg border border-outline-variant bg-surface-container">
                  <EmptyState
                    icon="compare_arrows"
                    title="No properties selected"
                    description="Add up to four properties from the list to compare them side by side."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container">
                  <div
                    className="grid min-w-[820px]"
                    style={{ gridTemplateColumns: `180px repeat(${selectedListings.length}, minmax(190px, 1fr))` }}
                  >
                    <div className="border-b border-outline-variant p-4 font-semibold">Metric</div>
                    {selectedListings.map((listing) => (
                      <Link
                        key={listing.id}
                        to={`/property/${listing.id}`}
                        className="border-b border-l border-outline-variant p-4"
                      >
                        <img src={listing.image} alt="" className="h-32 w-full rounded object-cover" />
                        <p className="mt-3 font-semibold">{listing.title}</p>
                      </Link>
                    ))}
                    {[
                      ['Price', (item) => item.priceLabel],
                      ['Location', (item) => item.displayLocation || item.address],
                      ['Facts', (item) => item.facts.join(' / ')],
                      ['Quality', (item) => `${item.qualityScore || 82}%`],
                      ['Verification', (item) => (item.addressVerified ? 'Address verified' : item.verificationStatus || 'Submitted')],
                      ['Amenities', (item) => (item.amenities || []).slice(0, 4).join(', ') || 'Not listed'],
                    ].map(([label, getValue]) => (
                      <React.Fragment key={label}>
                        <div className="border-b border-outline-variant p-4 font-semibold">{label}</div>
                        {selectedListings.map((listing) => (
                          <div key={`${listing.id}-${label}`} className="border-b border-l border-outline-variant p-4 text-on-surface-variant">
                            {getValue(listing)}
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

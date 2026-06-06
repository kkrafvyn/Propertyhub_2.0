import React, { useEffect, useMemo, useState } from 'react'
import EnterpriseShell from '../components/EnterpriseShell'
import marketplaceService from '../services/marketplace-service'

const fallbackProperties = [
  {
    title: 'Skyline Penthouse',
    location: 'Downtown District, Sector 4',
    price: '$2,450,000',
    status: 'Active',
    statusTone: 'bg-secondary text-on-secondary',
    image:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80',
    facts: ['3 Beds', '2.5 Baths', '2.8k ft²'],
    disabled: false,
  },
  {
    title: 'Azure Bay Villa',
    location: 'Ocean Breeze, Coastal Dr.',
    price: '$1,180,000',
    status: 'Under Offer',
    statusTone: 'bg-secondary text-on-secondary',
    image:
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=80',
    facts: ['4 Beds', '4 Baths', '3.2k ft²'],
    disabled: false,
  },
  {
    title: 'Oakwood Residence',
    location: 'Heritage Woods, Lane 12',
    price: 'Archive Records Only',
    status: 'Sold',
    statusTone: 'bg-surface-container-high text-on-surface',
    image:
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80',
    facts: ['5 Beds', '3 Baths', '4.1k ft²'],
    disabled: true,
  },
]

export default function PropertyPortfolio() {
  const [properties, setProperties] = useState(fallbackProperties)

  useEffect(() => {
    let ignore = false

    marketplaceService
      .getListings()
      .then((data) => {
        if (ignore) return
        setProperties(
          data.map((listing) => ({
            title: listing.title,
            location: listing.displayLocation || listing.address,
            price: listing.priceLabel,
            status: listing.status,
            statusTone: listing.addressVerified
              ? 'bg-secondary text-on-secondary'
              : 'bg-surface-container-high text-on-surface',
            image: listing.image,
            facts: listing.facts,
            disabled: false,
            action: 'Details',
          }))
        )
      })
      .catch(() => {
        if (!ignore) setProperties(fallbackProperties)
      })

    return () => {
      ignore = true
    }
  }, [])

  const stats = useMemo(() => {
    const activeCount = properties.filter((property) =>
      String(property.status).toLowerCase().includes('listed')
    ).length

    return [
      {
        label: 'Active Listings',
        value: String(activeCount || properties.length),
        change: '+ live',
        icon: 'real_estate_agent',
      },
      { label: 'Featured Assets', value: String(properties.length), change: '+12%', icon: 'sell' },
      { label: 'Verified Records', value: String(properties.length), change: '+5%', icon: 'verified' },
      { label: 'Total Views', value: '12.4k', change: '+24%', icon: 'visibility' },
    ]
  }, [properties])

  return (
    <EnterpriseShell
      activeSection="Agency"
      searchPlaceholder="Search listings or clients..."
    >
      <main className="px-5 py-8 md:px-10">
        <section className="max-w-7xl">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <article
                key={stat.label}
                className="rounded-lg border border-outline-variant bg-surface-container p-7 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    <span className="material-symbols-outlined">{stat.icon}</span>
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      stat.change.startsWith('-') ? 'text-error' : 'text-secondary'
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
                <p className="mt-7 text-xl text-on-surface-variant">{stat.label}</p>
                <p className="mt-2 text-4xl font-bold text-secondary">{stat.value}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-bold leading-tight text-secondary md:text-5xl">
                Property Portfolio
              </h1>
              <p className="mt-2 text-body-lg text-on-surface-variant">
                Manage and monitor your active market presence.
              </p>
            </div>
            <div className="inline-flex w-fit rounded-lg bg-surface-container-high p-1">
              <button className="rounded-md bg-surface px-6 py-2 font-semibold shadow-sm">
                Grid View
              </button>
              <button className="px-6 py-2 font-semibold text-on-surface-variant">
                List View
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <article
                key={property.title}
                className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container shadow-sm"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-surface-container-high">
                  <img
                    src={property.image}
                    alt={property.title}
                    className={`h-full w-full object-cover ${
                      property.disabled ? 'grayscale' : ''
                    }`}
                  />
                  <div className="absolute right-5 top-5 flex flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wider ${property.statusTone}`}
                    >
                      {property.status}
                    </span>
                    <span className="max-w-[210px] rounded-lg bg-surface/90 px-5 py-2 text-center font-semibold shadow-sm">
                      {property.price}
                    </span>
                  </div>
                </div>

                <div className="p-7">
                  <h2 className="text-2xl font-semibold leading-tight">
                    {property.title}
                  </h2>
                  <p className="mt-3 flex items-start gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-base">
                      location_on
                    </span>
                    {property.location}
                  </p>

                  <div className="mt-6 grid grid-cols-3 border-y border-outline-variant py-5">
                    {property.facts.map((fact, index) => (
                      <div
                        key={fact}
                        className={`text-center ${index > 0 ? 'border-l border-outline-variant' : ''}`}
                      >
                        <span className="material-symbols-outlined block text-2xl">
                          {index === 0 ? 'bed' : index === 1 ? 'bathtub' : 'straighten'}
                        </span>
                        <span className="mt-1 block text-sm font-semibold">{fact}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-2">
                    <button className="flex min-h-16 flex-col items-center justify-center rounded-md hover:bg-surface-container-high">
                      <span className="material-symbols-outlined">edit</span>
                      <span className="text-sm">Edit</span>
                    </button>
                    <button
                      className="flex min-h-16 flex-col items-center justify-center rounded-md hover:bg-surface-container-high disabled:cursor-not-allowed disabled:text-on-surface-variant"
                      disabled={property.disabled}
                    >
                      <span className="material-symbols-outlined">rocket_launch</span>
                      <span className="text-sm">Boost</span>
                    </button>
                    <button className="flex min-h-16 flex-col items-center justify-center rounded-md hover:bg-surface-container-high">
                      <span className="material-symbols-outlined">
                        {property.disabled ? 'visibility' : 'bar_chart'}
                      </span>
                      <span className="text-sm">
                        {property.disabled ? 'View' : 'Analytics'}
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </EnterpriseShell>
  )
}

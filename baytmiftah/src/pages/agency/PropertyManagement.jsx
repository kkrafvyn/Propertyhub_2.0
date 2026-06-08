import React, { useEffect, useState } from 'react'
import PropTechShell from '../../components/PropTechShell'
import marketplaceService from '../../services/marketplace-service'

const fallbackProperties = [
  {
    title: 'Skyline Penthouse',
    address: '450 Manhattan Ave, NY',
    status: 'Rented',
    statusClass: 'bg-[#E9C349] text-white',
    metrics: [['Yield', '5.2%'], ['Alerts', '0 Active'], ['Rent', '$8.5k']],
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85',
    action: 'Details',
  },
  {
    title: 'The Nexus Lofts',
    address: '88 Tech Plaza, San Francisco',
    status: 'Vacant',
    statusClass: 'bg-red-600 text-white',
    metrics: [['Yield', '0.0%'], ['Alerts', '3 Active'], ['Mkt Val', '$1.2M']],
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=85',
    alert: 'Humidity sensor alert in unit B4',
    action: 'Manage Listing',
  },
  {
    title: 'Canary Wharf Office',
    address: '12 Bank St, London',
    status: 'For Sale',
    statusClass: 'bg-[#F5D76B] text-[#0F172A]',
    metrics: [['Cap Rate', '6.8%'], ['Views', '1.2k'], ['Price', '£45M']],
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=85',
    note: '2 Offers Pending',
    action: 'Review Offers',
  },
]

export default function PropertyManagement() {
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
            address: listing.address,
            status: listing.status,
            statusClass: listing.addressVerified
              ? 'bg-[#E9C349] text-white'
              : 'bg-[#dbeafe] text-[#071121]',
            metrics: [
              ['Quality', `${listing.qualityScore || 82}%`],
              ['Risk', listing.floodRiskLevel || 'low'],
              [listing.listingType === 'sale' ? 'Price' : 'Rent', listing.priceLabel],
            ],
            image: listing.image,
            alert:
              listing.floodRiskLevel === 'medium'
                ? 'Medium flood-risk area flagged for review'
                : '',
            note: listing.organization?.name || 'Assigned team active',
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

  return (
    <PropTechShell active="Marketplace" searchPlaceholder="Search properties..." primaryAction="+ Add Property">
      <main className="px-5 py-10 md:px-8">
        <section className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-5xl font-black leading-tight md:text-6xl">My Properties</h1>
              <p className="mt-3 text-xl text-[#303744]">
                Manage and monitor your 24 active real estate assets.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="rounded-md bg-[#dbeafe] p-1">
                <button className="rounded bg-black px-5 py-3 font-semibold text-white">Grid</button>
                <button className="px-5 py-3 font-semibold">List</button>
              </div>
              <button className="rounded-md border border-[#b9c3d2] bg-white px-6 py-3 font-semibold">
                Filter Assets
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-[220px_220px_220px_1fr]">
            {[
              ['Location', 'All Locations'],
              ['Status', 'All Statuses'],
              ['Property Type', 'Residential'],
            ].map(([label, value]) => (
              <button key={label} className="rounded-lg border border-[#cbd3df] bg-white p-5 text-left">
                <p className="text-sm uppercase tracking-widest text-[#303744]">{label}</p>
                <p className="mt-2 flex items-center justify-between text-lg">
                  {value}
                  <span className="material-symbols-outlined">expand_more</span>
                </p>
              </button>
            ))}
            <button className="rounded-lg bg-black px-8 py-5 font-bold text-white md:col-span-2 xl:col-span-1">
              <span className="material-symbols-outlined mr-2 align-middle">add_home</span>
              Add New Property
            </button>
          </div>

          <div className="mt-10 grid gap-7 xl:grid-cols-2">
            {properties.map((property) => (
              <article key={property.title} className="overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
                <div className="relative">
                  <img src={property.image} alt="" className="h-56 w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  <span className={`absolute right-5 top-5 rounded-full px-4 py-2 font-semibold ${property.statusClass}`}>
                    {property.status}
                  </span>
                  <div className="absolute bottom-5 left-5 text-white">
                    <h2 className="text-xl font-semibold">{property.title}</h2>
                    <p className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      {property.address}
                    </p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-3 text-center">
                    {property.metrics.map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[#303744]">{label}</p>
                        <p className={`font-bold ${value.includes('Active') && value !== '0 Active' ? 'text-red-600' : ''}`}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                  {property.alert && (
                    <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                      <span className="material-symbols-outlined mr-2 align-middle">water_drop</span>
                      {property.alert}
                    </div>
                  )}
                  <div className="mt-5 flex items-center justify-between border-t border-[#d8dde6] pt-5">
                    <span className="italic text-[#303744]">{property.note || 'Assigned team active'}</span>
                    <button
                      className={`rounded-md px-6 py-3 font-bold ${
                        property.action === 'Details' ? 'bg-white' : property.action === 'Manage Listing' ? 'bg-black text-white' : 'bg-[#E9C349] text-white'
                      }`}
                    >
                      {property.action}
                      {property.action === 'Details' && (
                        <span className="material-symbols-outlined ml-2 align-middle">arrow_forward</span>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <section className="mt-12 grid min-h-80 place-items-center rounded-lg border-2 border-dashed border-[#b9c3d2] bg-[#edf4ff] p-10 text-center">
            <div>
              <span className="material-symbols-outlined rounded-full bg-white p-4 text-5xl text-[#7f8ba0] shadow">
                add_circle
              </span>
              <h2 className="mt-5 text-xl font-semibold">Expand Your Portfolio</h2>
              <p className="mx-auto mt-3 max-w-md text-[#303744]">
                Start tracking a new asset by integrating its IoT data layer or manually
                entering property details.
              </p>
              <button className="mt-6 rounded-full bg-black px-8 py-3 font-bold text-white">
                Begin Onboarding
              </button>
            </div>
          </section>
        </section>
      </main>
    </PropTechShell>
  )
}

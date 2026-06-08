import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import { DemoModeBanner } from '../components/UI'
import marketplaceService, {
  fallbackMarketplaceListings,
} from '../services/marketplace-service'
import { createBoostCheckout, getFeaturedListingUpsells } from '../services/upsell-service'

export default function MyListings() {
  const navigate = useNavigate()
  const [listings, setListings] = useState(fallbackMarketplaceListings)
  const [usingFallback, setUsingFallback] = useState(true)
  const [upsell, setUpsell] = useState({ plans: [], campaigns: [], source: 'local' })
  const [selectedBoost, setSelectedBoost] = useState(null)
  const [paymentProvider, setPaymentProvider] = useState('stripe')
  const [checkoutStatus, setCheckoutStatus] = useState('')

  useEffect(() => {
    let ignore = false

    marketplaceService
      .getListings()
      .then((data) => {
        if (!ignore) {
          setListings(data)
          setUsingFallback(data === fallbackMarketplaceListings)
        }
      })
      .catch(() => {
        if (!ignore) {
          setListings(fallbackMarketplaceListings)
          setUsingFallback(true)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  const startBoostCheckout = async () => {
    if (!selectedBoost) {
      setCheckoutStatus('Select a listing before checkout.')
      return
    }

    setCheckoutStatus(`Opening ${paymentProvider} checkout...`)
    try {
      let user = null
      try {
        user = JSON.parse(localStorage.getItem('baytmiftah_user') || 'null')
      } catch {
        user = null
      }
      const plan = upsell.plans[0] || {
        id: 'featured-boost',
        name: 'Featured Boost',
        price: 350,
        currency: 'GHS',
      }
      const checkout = await createBoostCheckout({
        provider: paymentProvider,
        listing: selectedBoost,
        plan,
        customerEmail: user?.email,
      })
      if (checkout.checkoutUrl) {
        window.location.assign(checkout.checkoutUrl)
        return
      }
      setCheckoutStatus('Checkout session created, but no redirect URL came back.')
    } catch (error) {
      setCheckoutStatus(error.message || 'Checkout is not available yet. Check Edge Function secrets.')
    }
  }

  useEffect(() => {
    getFeaturedListingUpsells().then(setUpsell)
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

            {usingFallback && <DemoModeBanner />}

            <section className="rounded-lg border border-outline-variant bg-[#111827] p-6 text-white">
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-[#F5D76B]">
                    Featured listing growth
                  </p>
                  <h2 className="mt-3 text-3xl font-bold">Boost premium inventory into high-intent surfaces.</h2>
                  <p className="mt-3 text-white/65">
                    Promote selected listings across marketplace search, agency profile pages, and buyer alerts.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {listings.slice(0, 3).map((listing) => (
                      <button
                        key={listing.id}
                        onClick={() => setSelectedBoost(listing)}
                        className={`rounded-full px-4 py-2 font-semibold ${
                          selectedBoost?.id === listing.id
                            ? 'bg-[#F5D76B] text-[#0F172A]'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {listing.title}
                      </button>
                    ))}
                  </div>
                </div>
                <aside className="rounded-lg bg-white/10 p-5">
                  <p className="font-semibold">Available plan</p>
                  {(upsell.plans[0]?.features ? [upsell.plans[0]] : upsell.plans).slice(0, 1).map((plan) => (
                    <div key={plan.id || plan.name} className="mt-4">
                      <p className="text-2xl font-bold">{plan.name || 'Featured Boost'}</p>
                      <p className="mt-1 text-white/65">
                        {plan.currency || 'GHS'} {plan.price || plan.price_monthly || 350}
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-white/70">
                        {(plan.features || ['Top search placement', 'Homepage surfacing', 'Lead priority badge']).map((feature) => (
                          <li key={feature} className="flex gap-2">
                            <span className="material-symbols-outlined text-base text-[#F5D76B]">check_circle</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <div className="mt-5 grid grid-cols-2 gap-2 rounded-md bg-white/10 p-1">
                    {['stripe', 'paystack'].map((provider) => (
                      <button
                        key={provider}
                        type="button"
                        onClick={() => setPaymentProvider(provider)}
                        className={`rounded px-3 py-2 text-sm font-bold capitalize ${
                          paymentProvider === provider
                            ? 'bg-white text-[#0F172A]'
                            : 'text-white/70'
                        }`}
                      >
                        {provider}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={startBoostCheckout}
                    className="mt-3 w-full rounded-md bg-[#F5D76B] px-4 py-3 font-bold text-[#0F172A]"
                  >
                    {selectedBoost ? `Boost ${selectedBoost.title}` : 'Select listing to boost'}
                  </button>
                  {checkoutStatus && (
                    <p className="mt-3 text-xs text-white/70">{checkoutStatus}</p>
                  )}
                  <p className="mt-3 text-xs text-white/50">Source: {upsell.source}</p>
                </aside>
              </div>
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
                          {listing.organization?.name || 'BaytMiftah'}
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

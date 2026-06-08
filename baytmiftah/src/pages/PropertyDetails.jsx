import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import marketplaceService, {
  fallbackMarketplaceListings,
} from '../services/marketplace-service'
import { createOfferPacket, markOfferPacketSigned } from '../services/offer-service'
import { SvgIcon } from '../components/Navigation'

function PropertyHeader({ search = 'Search marketplace...', action = 'Create New' }) {
  return (
    <header className="marketplace-header flex min-h-16 items-center gap-6 px-5 md:px-8">
      <Link to="/explore" className="text-2xl font-black">
        BaytMiftah
      </Link>
      <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
        <Link to="/explore" className="border-b-2 border-black pb-2">
          Listings
        </Link>
        <Link to="/agency/leads">Leads</Link>
        <Link to="/smart-property/devices">Devices</Link>
      </nav>
      <label className="ml-auto hidden h-11 w-full max-w-md items-center gap-3 rounded-md border border-[#b9c3d2] bg-[#edf4ff] px-4 md:flex">
        <SvgIcon name="search" className="text-[#4b5563]" />
        <input className="min-w-0 flex-1 bg-transparent outline-none" placeholder={search} />
      </label>
      <Link to="/create-listing" className="marketplace-cta hidden sm:inline-flex">
        {action}
      </Link>
      <SvgIcon name="mail" />
      <SvgIcon name="account_circle" />
    </header>
  )
}

function Gallery({ listing }) {
  const media = listing.media?.length ? listing.media : fallbackMarketplaceListings[0].media
  const [hero, ...rest] = media
  const sideImages = rest.length ? rest.slice(0, 4) : media.slice(0, 4)

  return (
    <section className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="relative min-h-[420px] overflow-hidden rounded-lg bg-[#dbeafe] shadow-[0_18px_45px_rgba(7,17,33,0.12)]">
        <img
          src={hero.public_url}
          alt={hero.alt_text || listing.title}
          className="h-full min-h-[420px] w-full object-cover"
        />
        <div className="absolute left-5 top-5 flex flex-wrap gap-3">
          {listing.addressVerified && (
            <span className="marketplace-pill border-[#E9C349] bg-[#fff8d7] text-[#0F172A]">
              Address Verified
            </span>
          )}
          {listing.featured && (
            <span className="marketplace-pill">
              Featured
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5">
        {sideImages.map((item, index) => (
          <img
            key={item.id || `${listing.id}-media-${index}`}
            src={item.public_url}
            alt={item.alt_text || listing.title}
            className="h-full min-h-48 rounded-lg object-cover shadow-sm"
          />
        ))}
      </div>
    </section>
  )
}

function FactStrip({ listing }) {
  const facts = [
    ['bed', listing.bedrooms ? `${listing.bedrooms} Beds` : 'Flexible Layout'],
    ['bathtub', listing.bathrooms ? `${listing.bathrooms} Baths` : 'Service Core'],
    ['straighten', listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : `${listing.squareMeters || 0} sqm`],
    ['verified', listing.qualityScore ? `${listing.qualityScore}% Quality` : 'Verified Data'],
  ]

  return (
    <div className="grid gap-3 border-b border-[#d8dde6] pb-6 md:grid-cols-4">
      {facts.map(([icon, label]) => (
        <div key={label} className="rounded-md border border-[#d7e0ec] bg-[#edf4ff] p-4">
          <SvgIcon name={icon} className="h-6 w-6 text-[#9a7413]" />
          <p className="mt-2 font-semibold">{label}</p>
        </div>
      ))}
    </div>
  )
}

function AmenityGrid({ amenities }) {
  const items = amenities.length
    ? amenities
    : ['verified location', 'secure entry', 'agency managed', 'media ready']

  return (
    <section className="border-t border-[#cbd3df] pt-8">
      <h2 className="text-2xl font-semibold">What this place offers</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {items.map((amenity) => (
          <div key={amenity} className="flex items-center gap-3">
            <SvgIcon name="check_circle" className="h-5 w-5 text-[#9a7413]" />
            <span className="capitalize">{amenity}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function LocationPanel({ listing }) {
  return (
    <section className="border-t border-[#cbd3df] pt-8">
      <h2 className="text-2xl font-semibold">Location</h2>
      <div className="relative mt-6 overflow-hidden rounded-lg bg-[#8aa896]">
        <div className="h-96 bg-[radial-gradient(circle_at_24%_58%,rgba(17,24,39,0.16),transparent_18%),linear-gradient(120deg,#7f8f79,#a9c7a5)]" />
        <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#111827] text-white">
          <SvgIcon name="location_on" className="h-8 w-8" />
        </span>
        <span className="absolute bottom-6 left-6 max-w-xs rounded-md bg-white px-5 py-3 text-sm shadow">
          <strong>{listing.displayLocation || listing.address}</strong>
          <br />
          {listing.ghanaPostGps || 'Location verified by BaytMiftah'}
        </span>
      </div>
      <p className="mt-5 leading-7 text-[#303744]">
        {listing.address}. Confidence score: {listing.locationConfidence || 85}%. Flood risk:{' '}
        {listing.floodRiskLevel || 'not reported'}.
      </p>
    </section>
  )
}

function BookingCard({ listing, onOfferCreated }) {
  const navigate = useNavigate()
  const deposit = listing.listingType === 'sale' ? 'Offer review' : listing.priceLabel
  const [offerForm, setOfferForm] = useState({
    buyerName: '',
    buyerEmail: '',
    offerAmount: '',
    closingWindow: '30 days',
    conditions: '',
  })
  const [offerPacket, setOfferPacket] = useState(null)
  const [offerNotice, setOfferNotice] = useState('')

  const requireLoginForBooking = () => {
    try {
      const storedUser = localStorage.getItem('baytmiftah_user')
      if (storedUser) {
        navigate('/bookings', {
          state: {
            bookingDraft: {
              property: listing.title,
              listingId: listing.id,
              propertyId: listing.propertyId,
            },
          },
        })
        return
      }
    } catch {
      // Fall through to login when local auth state cannot be read.
    }

    navigate('/login', {
      state: {
        from: {
          pathname: '/bookings',
          bookingDraft: {
            property: listing.title,
            listingId: listing.id,
            propertyId: listing.propertyId,
          },
        },
      },
    })
  }

  const submitOffer = async (event) => {
    event.preventDefault()
    const { packet, source } = await createOfferPacket({
      listingId: listing.id,
      propertyId: listing.propertyId,
      propertyTitle: listing.title,
      ...offerForm,
    })
    setOfferPacket(packet)
    setOfferNotice(
      source === 'supabase'
        ? 'Offer packet persisted in Supabase.'
        : 'Offer packet saved locally. Supabase persistence needs your backend setup.'
    )
    onOfferCreated?.(packet)
  }

  return (
    <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
      <section className="rounded-lg border border-[#cbd3df] bg-white p-7 shadow-[0_22px_60px_rgba(7,17,33,0.14)]">
        <div className="flex items-start justify-between gap-4">
          <p className="text-2xl font-black">{listing.priceLabel}</p>
          <span className="flex items-center gap-1 text-sm">
            <SvgIcon name="star" className="h-4 w-4 fill-[#E9C349] text-[#E9C349]" />
            {listing.rating}
          </span>
        </div>
        <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-md border border-[#cbd3df] text-sm">
          <div className="border-r border-[#cbd3df] p-3">
            <p className="uppercase">Status</p>
            <strong>{listing.status}</strong>
          </div>
          <div className="p-3">
            <p className="uppercase">Type</p>
            <strong className="capitalize">{listing.listingType}</strong>
          </div>
          <div className="col-span-2 border-t border-[#cbd3df] p-3">
            <p className="uppercase">Deposit</p>
            <strong>{deposit}</strong>
          </div>
        </div>
        <button
          onClick={requireLoginForBooking}
          className="marketplace-cta mt-6 w-full py-5 text-xl"
        >
          <SvgIcon name="calendar_month" />
          Schedule Viewing
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`I am interested in ${listing.title} on BaytMiftah.`)}`}
          target="_blank"
          rel="noreferrer"
          className="marketplace-secondary-cta mt-3 w-full"
        >
          WhatsApp Agent
        </a>
        <p className="mt-4 text-center text-sm text-[#596170]">
          You will connect with the listing agency before any payment.
        </p>
        <div className="mt-6 space-y-3 rounded-md border border-[#d8dde6] bg-[#f8faff] p-4 text-sm">
          {[
            ['Agency', listing.organization?.name || 'BaytMiftah Partner'],
            ['Verification', listing.verificationStatus || 'submitted'],
            ['WhatsApp', listing.raw?.whatsapp_enabled ? 'Enabled' : 'Available by request'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <span className="text-[#596170]">{label}</span>
              <span className="text-right font-semibold">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3 border-t border-[#d8dde6] pt-5">
          <img
            src={listing.organization?.logo_url || 'https://placehold.co/120x120/e0f2fe/0f172a?text=PH'}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
          <div>
            <h3 className="font-bold">{listing.organization?.name || 'BaytMiftah Partner'}</h3>
            <p className="text-sm text-[#596170]">
              {listing.organization?.verified ? 'Verified agency' : 'Partner agency'}
            </p>
          </div>
        </div>
        <button className="marketplace-secondary-cta mt-4 w-full">
          Message Agent
        </button>
      </section>

      <section className="rounded-lg border border-[#cbd3df] bg-white p-6">
        <h2 className="text-xl font-bold">Submit Offer</h2>
        <form onSubmit={submitOffer} className="mt-4 grid gap-3">
          {[
            ['buyerName', 'Buyer name', 'text'],
            ['buyerEmail', 'Buyer email', 'email'],
            ['offerAmount', 'Offer amount', 'number'],
          ].map(([key, label, type]) => (
            <label key={key}>
              <span className="text-sm font-semibold">{label}</span>
              <input
                type={type}
                value={offerForm[key]}
                onChange={(event) =>
                  setOfferForm((current) => ({ ...current, [key]: event.target.value }))
                }
                className="mt-1 h-11 w-full rounded border border-[#cbd3df] px-3"
                required
              />
            </label>
          ))}
          <label>
            <span className="text-sm font-semibold">Closing window</span>
            <select
              value={offerForm.closingWindow}
              onChange={(event) =>
                setOfferForm((current) => ({ ...current, closingWindow: event.target.value }))
              }
              className="mt-1 h-11 w-full rounded border border-[#cbd3df] px-3"
            >
              <option>14 days</option>
              <option>30 days</option>
              <option>45 days</option>
              <option>Flexible</option>
            </select>
          </label>
          <textarea
            value={offerForm.conditions}
            onChange={(event) =>
              setOfferForm((current) => ({ ...current, conditions: event.target.value }))
            }
            placeholder="Conditions, proof of funds notes, or contingencies..."
            className="min-h-20 rounded border border-[#cbd3df] px-3 py-2"
          />
          <button className="marketplace-cta">
            Generate Offer Packet
          </button>
        </form>
        {offerPacket && (
          <div className="mt-4 rounded-md bg-[#edf4ff] p-4">
            <p className="font-bold">E-sign packet ready</p>
            <p className="mt-1 text-sm text-[#303744]">
              Status: {offerPacket.signatureStatus}. Packet ID: {offerPacket.id}
            </p>
            {offerNotice && <p className="mt-2 text-sm font-semibold text-[#596170]">{offerNotice}</p>}
            <button
              onClick={async () => {
                const { packet, source } = await markOfferPacketSigned(offerPacket.id)
                setOfferPacket(packet)
                setOfferNotice(
                  source === 'supabase'
                    ? 'Signed packet persisted in Supabase.'
                    : 'Signed packet saved locally. E-sign backend setup is still required.'
                )
              }}
              className="mt-3 rounded-md bg-[#E9C349] px-4 py-2 font-bold text-[#0F172A]"
            >
              Mark Signed
            </button>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[#cbd3df] bg-[#edf4ff] p-6">
        <h2 className="font-bold">Supabase Record Health</h2>
        {[
          ['Quality score', listing.qualityScore ? `${listing.qualityScore}%` : 'Ready'],
          ['Address confidence', `${listing.locationConfidence || 85}%`],
          ['Media items', `${listing.media?.length || 0}`],
        ].map(([label, value]) => (
          <div key={label} className="mt-4 flex justify-between">
            <span>{label}</span>
            <strong className="text-[#E9C349]">{value}</strong>
          </div>
        ))}
      </section>
    </aside>
  )
}

export default function PropertyDetails() {
  const { id = '' } = useParams()
  const [listing, setListing] = useState(fallbackMarketplaceListings[0])
  const [similarListings, setSimilarListings] = useState(fallbackMarketplaceListings)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [latestOffer, setLatestOffer] = useState(null)

  useEffect(() => {
    let ignore = false

    const load = async () => {
      try {
        setLoading(true)
        const [detail, allListings] = await Promise.all([
          marketplaceService.getListingById(id),
          marketplaceService.getListings(),
        ])

        if (!ignore) {
          setListing(detail)
          setSimilarListings(allListings.filter((item) => item.id !== detail.id).slice(0, 4))
          setLoadError('')
        }
      } catch (error) {
        if (!ignore) {
          setListing(fallbackMarketplaceListings[0])
          setSimilarListings(fallbackMarketplaceListings)
          setLoadError('Showing curated fallback data while Supabase listing details are unavailable.')
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()

    return () => {
      ignore = true
    }
  }, [id])

  const breadcrumb = useMemo(() => {
    return [listing.category, listing.displayLocation || listing.address, listing.title]
      .filter(Boolean)
      .map((item) => String(item))
  }, [listing])

  return (
    <div className="marketplace-page">
      <PropertyHeader />
      <main className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <div className="text-sm text-[#596170]">
          {breadcrumb.map((item, index) => (
            <React.Fragment key={`${item}-${index}`}>
              {index > 0 && <span className="mx-2">/</span>}
              <span className={index === breadcrumb.length - 1 ? 'text-[#071121]' : ''}>
                {item}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-[#E9C349]">
              {loading ? 'Loading Supabase listing' : 'Live Supabase listing'}
            </p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">{listing.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-5">
              <span className="flex items-center gap-1">
                <SvgIcon name="star" className="h-4 w-4 fill-[#E9C349] text-[#E9C349]" />
                {listing.rating} ({listing.qualityScore || 82}% quality)
              </span>
              <span className="flex items-center gap-1">
                <SvgIcon name="location_on" className="h-4 w-4" />
                {listing.address}
              </span>
            </div>
            {loadError && <p className="mt-3 text-sm text-[#596170]">{loadError}</p>}
          </div>
          <div className="flex gap-5">
            <button className="marketplace-secondary-cta px-4 py-2">
              <SvgIcon name="ios_share" />
              Share
            </button>
            <button className="marketplace-secondary-cta px-4 py-2">
              <SvgIcon name="favorite" />
              Save
            </button>
          </div>
        </div>

        <Gallery listing={listing} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-8">
            {latestOffer && (
              <section className="rounded-lg border border-[#E9C349] bg-[#fff8d7] p-5">
                <h2 className="font-bold">Offer packet created</h2>
                <p className="mt-1 text-[#303744]">
                  {latestOffer.buyerName} submitted {latestOffer.offerAmount} for {listing.title}.
                </p>
              </section>
            )}
            <article className="rounded-lg border border-[#cbd3df] bg-white p-8 shadow-[0_12px_32px_rgba(7,17,33,0.06)]">
              <FactStrip listing={listing} />
              <h2 className="mt-6 text-2xl font-bold">Property Description</h2>
              <p className="mt-5 leading-8 text-[#303744]">{listing.description}</p>
              {listing.organization?.description && (
                <p className="mt-5 leading-8 text-[#303744]">
                  Managed by {listing.organization.name}: {listing.organization.description}
                </p>
              )}
            </article>

            <section className="rounded-lg bg-[#071121] p-6 text-white shadow-[0_18px_45px_rgba(7,17,33,0.18)]">
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <SvgIcon name="verified_user" className="h-6 w-6 text-[#F5D76B]" />
                Trust and Data Layer
              </h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  ['verified_user', 'Address Verification', listing.addressVerified ? 'Verified local address record' : 'Pending address review'],
                  ['map', 'Ghana Post GPS', listing.ghanaPostGps || 'Not yet attached'],
                  ['monitoring', 'Quality Score', listing.qualityScore ? `${listing.qualityScore}% listing quality` : 'Quality review ready'],
                ].map(([icon, title, body]) => (
                  <article key={title} className="rounded-md border border-white/15 bg-white/5 p-4 backdrop-blur">
                    <SvgIcon name={icon} className="h-6 w-6 text-[#F5D76B]" />
                    <h3 className="mt-3 font-bold">{title}</h3>
                    <p className="mt-1 text-sm text-[#aab3c2]">{body}</p>
                  </article>
                ))}
              </div>
            </section>

            <AmenityGrid amenities={listing.amenities || []} />
            <LocationPanel listing={listing} />
          </section>

          <BookingCard listing={listing} onOfferCreated={setLatestOffer} />
        </div>

        {similarListings.length > 0 && (
          <section className="mt-14 border-t border-[#cbd3df] pt-10">
            <h2 className="text-2xl font-semibold">Similar live listings</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {similarListings.map((item) => (
                <Link key={item.id} to={`/property/${item.id}`} className="group">
                  <div className="relative overflow-hidden rounded-lg">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute right-3 top-3 rounded-full bg-white px-3 py-1">
                      {item.priceLabel}
                    </span>
                  </div>
                  <div className="mt-3 flex justify-between gap-4">
                    <div>
                      <h3 className="font-bold">{item.title}</h3>
                      <p className="text-sm text-[#303744]">{item.displayLocation}</p>
                    </div>
                    <span className="text-sm">{item.rating}</span>
                  </div>
                  <p className="mt-2 text-xs text-[#303744]">{item.facts.join(' / ')}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="mt-16 bg-[#071121] px-8 py-12 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div>
            <h2 className="text-2xl font-black">BaytMiftah</h2>
            <p className="mt-5 text-white/55">
              Live marketplace inventory powered by Supabase records.
            </p>
          </div>
          {['Marketplace', 'Company', 'Resources'].map((heading) => (
            <div key={heading}>
              <h3 className="font-bold uppercase tracking-widest">{heading}</h3>
              <p className="mt-5 text-white/55">Residential</p>
              <p className="text-white/55">Enterprise</p>
              <p className="text-white/55">API Docs</p>
            </div>
          ))}
        </div>
      </footer>
    </div>
  )
}

import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navigation, { SvgIcon } from '../components/Navigation'
import Header from '../components/Header'
import marketplaceService, {
  fallbackMarketplaceListings,
} from '../services/marketplace-service'
import BackendStatusBanner from '../components/BackendStatusBanner'
import { getRoleGroup, normalizeRole } from '../lib/roles'

const roleViews = {
  public: {
    label: 'Public Marketplace',
    title: 'Find verified homes before you create an account.',
    body: 'Browse public listings and neighborhood intelligence. Sign in only when you are ready to save, compare, message, or request a viewing.',
    priority: 'Explore active listings and compare neighborhoods before booking.',
    reviewLabel: 'Explore Listings',
    reviewPath: '/explore',
    portfolioLabel: 'View all listings',
    secondaryCards: [
      ['Explore Properties', '/explore', 'search', 'Browse verified listings across Ghana.'],
      ['Neighborhood Intel', '/neighborhoods', 'map', 'Check area signals before you shortlist.'],
    ],
    actions: [
      ['Explore Properties', '/explore', 'travel_explore'],
      ['Sign In to Book', '/login', 'account_circle'],
    ],
  },
  customer: {
    label: 'Buyer Workspace',
    title: 'Your property search, tuned for fast decisions.',
    body: 'Track saved homes, smart matches, viewing requests, messages, and offer documents from one focused workspace.',
    priority: 'Review saved properties and schedule the next verified viewing.',
    reviewLabel: 'Review Matches',
    reviewPath: '/smart-match',
    portfolioLabel: 'View saved homes',
    secondaryCards: [
      ['Saved Homes', '/favorites', 'favorite', 'Return to properties you are watching.'],
      ['Offer Room', '/offer-room', 'contract', 'Prepare an offer packet when you are ready.'],
    ],
    actions: [
      ['Explore Properties', '/explore', 'travel_explore'],
      ['Saved Homes', '/favorites', 'favorite'],
    ],
  },
  owner: {
    label: 'Owner Workspace',
    title: 'Manage your property portfolio with confidence.',
    body: 'Prepare listings, review verification status, manage booking windows, and keep documents ready for serious buyers.',
    priority: 'Review listing readiness, verification documents, and buyer requests.',
    reviewLabel: 'Review Portfolio',
    reviewPath: '/owner',
    portfolioLabel: 'View my listings',
    secondaryCards: [
      ['Create New Listing', '/create-listing', 'add_circle', 'Package a property with media, pricing, and verification.'],
      ['Listing Coach', '/listing-coach', 'monitoring', 'Improve readiness before publishing.'],
    ],
    actions: [
      ['Create Listing', '/create-listing', 'add_home'],
      ['My Listings', '/my-listings', 'real_estate_agent'],
    ],
  },
  agent: {
    label: 'Agent Workspace',
    title: 'Convert buyer intent into organized follow-up.',
    body: 'Work leads, listings, viewing calendars, offers, and client messages without mixing them with admin-only tools.',
    priority: 'Follow up with high-intent leads before their next viewing window.',
    reviewLabel: 'Open Agent Desk',
    reviewPath: '/agent/dashboard',
    portfolioLabel: 'View active listings',
    actions: [
      ['Agent Dashboard', '/agent/dashboard', 'monitoring'],
      ['Create Listing', '/create-listing', 'add_home'],
    ],
    secondaryCards: [
      ['Calendar', '/calendar', 'calendar_month', 'Keep viewings and follow-ups in sync.'],
      ['Listing Coach', '/listing-coach', 'monitoring', 'Strengthen property pages before outreach.'],
    ],
  },
  agency: {
    label: 'Agency Workspace',
    title: 'Run agency operations from the right cockpit.',
    body: 'Manage leads, team roles, property inventory, analytics, trust score, and documents from a dedicated agency workspace.',
    priority: 'Complete agency verification and assign open leads to active agents.',
    reviewLabel: 'Open Agency Desk',
    reviewPath: '/agency/dashboard',
    portfolioLabel: 'View agency properties',
    actions: [
      ['Agency Dashboard', '/agency/dashboard', 'business_center'],
      ['Team Management', '/agency/team', 'groups'],
    ],
    secondaryCards: [
      ['Lead Pipeline', '/agency/leads', 'group_add', 'Assign and track high-intent prospects.'],
      ['Trust Score', '/agency/trust-score', 'verified_user', 'Review verification and risk signals.'],
    ],
  },
  developer: {
    label: 'Developer Workspace',
    title: 'Launch projects, listings, and partner workflows.',
    body: 'Coordinate project launches, revenue operations, partner APIs, listings, and readiness documents from one workspace.',
    priority: 'Check launch readiness and partner integration status before publishing inventory.',
    reviewLabel: 'Open Launch Room',
    reviewPath: '/developer-launch',
    portfolioLabel: 'View launch inventory',
    actions: [
      ['Launch Room', '/developer-launch', 'rocket_launch'],
      ['Revenue Ops', '/revenue-ops', 'monitoring'],
    ],
    secondaryCards: [
      ['Partners', '/partners', 'api', 'Review channel and integration readiness.'],
      ['Create Listing', '/create-listing', 'add_home', 'Publish verified project inventory.'],
    ],
  },
  admin: {
    label: 'Platform Admin Workspace',
    title: 'Review trust, compliance, and platform operations.',
    body: 'Separate public marketplace work from platform review queues, agency verification, moderation, audit logs, and infrastructure readiness.',
    priority: 'Clear verification queues and review marketplace trust signals.',
    reviewLabel: 'Review Queue',
    reviewPath: '/admin/agencies',
    portfolioLabel: 'View moderation',
    actions: [
      ['Review Agencies', '/admin/agencies', 'rule_settings'],
      ['Admin Dashboard', '/admin', 'admin_panel_settings'],
    ],
    secondaryCards: [
      ['Moderation Queue', '/admin/moderation', 'shield', 'Resolve listing and content review items.'],
      ['Audit Log', '/admin/audit', 'fact_check', 'Track sensitive platform activity.'],
    ],
  },
}

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('baytmiftah_user') || 'null')
  } catch {
    return null
  }
}

export default function Dashboard({ user = null }) {
  const navigate = useNavigate()
  const [featuredListings, setFeaturedListings] = useState(fallbackMarketplaceListings)
  const [storedUser] = useState(getStoredUser)
  const activeUser = user || storedUser
  const role = normalizeRole(activeUser?.role || activeUser?.app_metadata?.role || activeUser?.user_metadata?.role)
  const roleGroup = activeUser ? getRoleGroup(role) : 'public'
  const roleView = roleViews[roleGroup] || roleViews.customer

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
        <Header title="BaytMiftah Workspace" />

        <div className="page-shell">
          <div className="content-shell section-stack">
            <BackendStatusBanner />
            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="panel md:p-7">
                <p className="text-label-sm text-secondary">{roleView.label}</p>
                <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-secondary md:text-5xl">
                  {roleView.title}
                </h2>
                <p className="mt-4 max-w-2xl text-body-lg text-on-surface-variant">
                  {roleView.body}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  {roleView.actions.map(([label, path, icon], index) => (
                    <button
                      key={label}
                      onClick={() => navigate(path)}
                      className={index === 0 ? 'btn-primary' : 'btn-secondary'}
                    >
                      <SvgIcon name={icon} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <aside className="panel bg-secondary text-on-secondary md:p-7">
                <SvgIcon name="verified_user" className="h-10 w-10" />
                <h3 className="mt-8 text-2xl font-semibold">Today&apos;s Priority</h3>
                <p className="mt-3 text-on-secondary/80">
                  {roleView.priority}
                </p>
                <button
                  onClick={() => navigate(roleView.reviewPath)}
                  className="mt-8 rounded-md bg-on-secondary px-5 py-3 font-semibold text-secondary"
                >
                  {roleView.reviewLabel}
                </button>
              </aside>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <article key={stat.label} className="panel-compact">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                      <SvgIcon name={stat.icon} />
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
                <Link to={roleGroup === 'public' ? '/explore' : '/portfolio'} className="hidden font-semibold text-secondary sm:block">
                  {roleView.portfolioLabel}
                </Link>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {featuredListings.map((listing) => (
                  <Link
                    key={listing.id}
                    to={`/property/${listing.id}`}
                    className="group overflow-hidden rounded-lg border border-white/10 bg-surface-container transition hover:border-secondary/60"
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
                        <SvgIcon name="location_on" className="h-4 w-4" />
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
              {roleView.secondaryCards.map(([label, path, icon, description]) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="panel text-left transition hover:border-secondary/60"
                >
                  <SvgIcon name={icon} className="h-8 w-8 text-secondary" />
                  <h4 className="mt-4 text-2xl font-semibold">{label}</h4>
                  <p className="mt-2 text-on-surface-variant">{description}</p>
                </button>
              ))}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ConsumerShell from '../../components/ConsumerShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import CapabilityRoute from '../../components/CapabilityRoute'
import { CAPABILITIES } from '../../lib/capabilities'
import { HubLinkGrid, StatCard, StatGrid, PanelCard } from '../../components/ui/AirbnbUI'
import { fetchReservations } from '../../services/reservation-service'
import { fetchInvestmentDashboard } from '../../services/investment-service'
import { fetchRenterDashboard } from '../../services/renter-service'
import { fetchConsumerHomeStats } from '../../services/consumer-service'

function ConsumerHub() {
  const [stats, setStats] = useState({ stays: 0, rent: null, portfolio: null, smartAlerts: 0, energyToday: null })

  useEffect(() => {
    Promise.all([
      fetchReservations(true),
      fetchRenterDashboard(),
      fetchInvestmentDashboard(),
      fetchConsumerHomeStats(),
    ]).then(([stays, renter, invest, smart]) => {
      setStats({
        stays: stays.reservations?.length ?? 0,
        rent: renter.profile?.rentAmount,
        portfolio: invest.portfolio?.totalValue,
        smartAlerts: smart.stats?.smartAlerts ?? 0,
        energyToday: smart.stats?.energyToday,
      })
    })
  }, [])

  const links = [
    { to: '/consumer/buy', label: 'Buy', desc: 'Offers, transactions, AI advisor, financing' },
    { to: '/consumer/rent', label: 'Rent', desc: 'Leases, rent payments, maintenance, signing' },
    { to: '/consumer/stay', label: 'Short stays', desc: 'Bookings, trips, guest receipts' },
    { to: '/consumer/invest', label: 'Invest', desc: 'Portfolio, ROI, market intelligence' },
    { to: '/tenant', label: 'Tenant portal', desc: 'Visitors, access, community' },
    { to: '/my-home', label: 'My home', desc: 'Smart locks, energy, announcements' },
    { to: '/wallet', label: 'Wallet', desc: 'Balance, escrow, payouts' },
    { to: '/host', label: 'Host', desc: 'Listings, calendar, reservations' },
  ]

  return (
    <ConsumerShell title="My BaytMiftah" subtitle="Buy · Rent · Stay · Invest — one account, capabilities unlocked by activity">
      <StatGrid cols={3}>
        <StatCard label="Upcoming stays" value={stats.stays} />
        <StatCard label="Monthly rent" value={stats.rent ? `GHS ${stats.rent.toLocaleString()}` : '—'} />
        <StatCard label="Portfolio value" value={stats.portfolio ? `GHS ${stats.portfolio.toLocaleString()}` : '—'} />
      </StatGrid>
      {(stats.smartAlerts > 0 || stats.energyToday) && (
        <div className="mt-4">
          <StatGrid cols={2}>
            <StatCard label="Smart alerts" value={stats.smartAlerts} />
            <StatCard label="Energy today" value={stats.energyToday ?? '—'} />
          </StatGrid>
        </div>
      )}
      <HubLinkGrid links={links} />
    </ConsumerShell>
  )
}

function ConsumerBuy() {
  const links = [
    { to: '/transactions', label: 'Transaction center', desc: 'Track purchase progress' },
    { to: '/offers', label: 'Offer room', desc: 'Submit and negotiate offers' },
    { to: '/buyer/advisor', label: 'AI advisor', desc: 'Personalised buying guidance' },
    { to: '/buyer/finance', label: 'Financing center', desc: 'Mortgages and pre-approval' },
    { to: '/buyer/finance', label: 'Financing center', desc: 'Mortgages and pre-approval' },
    { to: '/profile/kyc', label: 'Identity verification', desc: 'Submit KYC documents for offers' },
    { to: '/saved', label: 'Saved homes', desc: 'Your shortlisted properties' },
    { to: '/compare', label: 'Compare', desc: 'Side-by-side analysis' },
    { to: '/documents', label: 'Document vault', desc: 'Contracts and IDs' },
  ]
  return (
    <ConsumerShell title="Buy" subtitle="Purchase workflows and financing">
      <HubLinkGrid links={links} />
    </ConsumerShell>
  )
}

function ConsumerRent() {
  const links = [
    { to: '/renter/apply', label: 'Apply to rent', desc: 'Submit a rental application' },
    { to: '/renter/leases', label: 'Leases', desc: 'Active and past leases' },
    { to: '/renter/payments', label: 'Rent payments', desc: 'Paystack, Stripe, USSD' },
    { to: '/renter/maintenance', label: 'Maintenance', desc: 'Submit and track requests' },
    { to: '/renter/sign', label: 'Lease signing', desc: 'DocuSign e-signatures' },
    { to: '/tenant/visitors', label: 'Visitor passes', desc: 'Guest access codes' },
    { to: '/tenant/access', label: 'Building access', desc: 'Smart entry credentials' },
  ]
  return (
    <ConsumerShell title="Rent" subtitle="Your tenant workspace">
      <HubLinkGrid links={links} />
    </ConsumerShell>
  )
}

function ConsumerStay() {
  const [reservations, setReservations] = useState([])

  useEffect(() => {
    fetchReservations(true).then(({ reservations: r }) => setReservations(r ?? []))
  }, [])

  const links = [
    { to: '/trips', label: 'Viewings & trips', desc: 'Scheduled property visits' },
    { to: '/', label: 'Browse stays', desc: 'Find short-stay listings' },
  ]

  return (
    <ConsumerShell title="Short stays" subtitle="Bookings and guest experiences">
      <HubLinkGrid links={links} />
      {reservations.length > 0 && (
        <PanelCard title="Your reservations" className="mt-8">
          <ul className="divide-y divide-surface-border">
            {reservations.map((r) => (
              <li key={r.id} className="flex justify-between py-3 text-sm">
                <span>{r.listing ?? r.listing_id} · {r.check_in} → {r.check_out}</span>
                <span className="font-medium capitalize">{r.status}</span>
              </li>
            ))}
          </ul>
        </PanelCard>
      )}
    </ConsumerShell>
  )
}

function ConsumerInvest() {
  const links = [
    { to: '/investment', label: 'Investment center', desc: 'Portfolio and deal analysis' },
    { to: '/investment/roi', label: 'ROI calculator', desc: 'Cap rate and cash flow' },
    { to: '/intelligence', label: 'Market intelligence', desc: 'Heatmaps and valuations' },
    { to: '/tools/investment', label: 'Quick calculator', desc: 'Fast ROI estimate' },
  ]
  return (
    <ConsumerShell title="Invest" subtitle="Capital allocation and intelligence">
      <HubLinkGrid links={links} />
    </ConsumerShell>
  )
}

export function ConsumerHubPage() {
  return <ProtectedRoute><ConsumerHub /></ProtectedRoute>
}

export function ConsumerBuyPage() {
  return (
    <CapabilityRoute require={CAPABILITIES.BUY}>
      <ConsumerBuy />
    </CapabilityRoute>
  )
}

export function ConsumerRentPage() {
  return (
    <CapabilityRoute require={CAPABILITIES.RENT}>
      <ConsumerRent />
    </CapabilityRoute>
  )
}

export function ConsumerStayPage() {
  return (
    <CapabilityRoute require={CAPABILITIES.STAY_GUEST}>
      <ConsumerStay />
    </CapabilityRoute>
  )
}

export function ConsumerInvestPage() {
  return (
    <CapabilityRoute require={CAPABILITIES.INVEST}>
      <ConsumerInvest />
    </CapabilityRoute>
  )
}

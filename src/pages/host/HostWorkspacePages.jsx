import { useEffect, useState } from 'react'
import HostShell from '../../components/HostShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import CapabilityRoute from '../../components/CapabilityRoute'
import { CAPABILITIES } from '../../lib/capabilities'
import { HubLinkGrid, StatCard, StatGrid, PanelCard, PrimaryButton, SecondaryButton } from '../../components/ui/AirbnbUI'
import {
  fetchHostDashboard,
  fetchHostReservations,
  fetchHostPayouts,
  fetchHostCalendar,
  updateReservationStatus,
  saveAvailability,
} from '../../services/host-service'

function HostDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchHostDashboard().then(({ stats: s }) => setStats(s))
  }, [])

  const links = [
    { to: '/host/listings', label: 'Your listings', desc: 'Manage active and pending listings' },
    { to: '/host/calendar', label: 'Calendar', desc: 'Availability and blocked dates' },
    { to: '/host/reservations', label: 'Reservations', desc: 'Guest bookings' },
    { to: '/host/pricing', label: 'Dynamic pricing', desc: 'Rules and seasonal rates' },
    { to: '/host/cleaning', label: 'Cleaning', desc: 'Turnover schedules' },
    { to: '/host/payouts', label: 'Payouts', desc: 'Earnings and withdrawals' },
    { to: '/host/list', label: 'Add listing', desc: 'List a new property' },
  ]

  return (
    <HostShell title="Host dashboard" subtitle="Manage short-stay and rental listings">
      {stats && (
        <StatGrid cols={4}>
          <StatCard label="Listings" value={stats.listings} />
          <StatCard label="Upcoming bookings" value={stats.upcomingReservations} />
          <StatCard label="Monthly earnings" value={`GHS ${stats.monthlyEarnings?.toLocaleString()}`} />
          <StatCard label="Occupancy" value={`${stats.occupancyRate}%`} />
        </StatGrid>
      )}
      <HubLinkGrid links={links} />
    </HostShell>
  )
}

function HostReservationsPage() {
  const [reservations, setReservations] = useState([])

  useEffect(() => {
    fetchHostReservations().then(({ reservations: r }) => setReservations(r ?? []))
  }, [])

  async function handleStatus(id, status) {
    await updateReservationStatus(id, status)
    fetchHostReservations().then(({ reservations: r }) => setReservations(r ?? []))
  }

  return (
    <HostShell title="Reservations" subtitle="Approve, confirm, or decline guest bookings">
      <PanelCard title="All reservations">
        {reservations.length === 0 ? (
          <p className="text-sm text-ink-secondary">No reservations yet.</p>
        ) : (
          <ul className="divide-y divide-surface-border">
            {reservations.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{r.listing ?? r.listing_id}</p>
                  <p className="text-sm text-ink-secondary">{r.guest ?? r.guest_id} · {r.check_in} → {r.check_out}</p>
                  <p className="text-sm">GHS {Number(r.total).toLocaleString()} · <span className="capitalize">{r.status}</span></p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <PrimaryButton onClick={() => handleStatus(r.id, 'confirmed')}>Confirm</PrimaryButton>
                    <SecondaryButton onClick={() => handleStatus(r.id, 'declined')}>Decline</SecondaryButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </HostShell>
  )
}

function HostCalendarPage() {
  const [availability, setAvailability] = useState([])
  const [listingId, setListingId] = useState('')
  const [blockDate, setBlockDate] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (listingId) fetchHostCalendar(listingId).then(({ availability: a }) => setAvailability(a ?? []))
  }, [listingId])

  async function handleSave(open) {
    if (!listingId || !blockDate) return
    setSaving(true)
    setMessage('')
    try {
      await saveAvailability(listingId, [{ date: blockDate, available: open }])
      setMessage(open ? 'Date opened' : 'Date blocked')
      const { availability: a } = await fetchHostCalendar(listingId)
      setAvailability(a ?? [])
    } catch {
      setMessage('Could not update calendar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <HostShell title="Availability calendar" subtitle="Block dates and set nightly overrides">
      <PanelCard title="Manage availability">
        <div className="grid gap-3 sm:grid-cols-3">
          <input value={listingId} onChange={(e) => setListingId(e.target.value)} placeholder="Listing ID" className="rounded-lg border border-surface-border px-3 py-2 text-sm" />
          <input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} className="rounded-lg border border-surface-border px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={() => handleSave(true)} className="rounded-lg bg-mobile-forest px-3 py-2 text-sm font-semibold text-white">Open</button>
            <button type="button" disabled={saving} onClick={() => handleSave(false)} className="rounded-lg border border-surface-border px-3 py-2 text-sm font-semibold">Block</button>
          </div>
        </div>
        {message && <p className="mt-3 text-sm text-ink-secondary">{message}</p>}
        {availability.length === 0 ? (
          <p className="mt-4 text-sm text-ink-secondary">Enter a listing ID to view or edit dates.</p>
        ) : (
          <ul className="mt-4 text-sm">
            {availability.map((a) => (
              <li key={a.id} className="py-2">{a.listing_id} · {a.date} · {a.available ? 'Open' : 'Blocked'}</li>
            ))}
          </ul>
        )}
      </PanelCard>
    </HostShell>
  )
}

function PricingContent() {
  return (
    <HostShell title="Dynamic pricing" subtitle="Weekend premiums, seasonal rules, and minimum stays">
      <PanelCard title="Pricing rules">
        <p className="text-sm text-ink-secondary">Configure rules per listing. Connect wallet for automated payout splits.</p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>Weekend premium — +15% Fri–Sun</li>
          <li>Peak season — Dec 15–Jan 5 +25%</li>
          <li>Last-minute discount — within 48h −10%</li>
        </ul>
      </PanelCard>
    </HostShell>
  )
}

function CleaningContent() {
  return (
    <HostShell title="Cleaning schedules" subtitle="Turnover tasks tied to reservations">
      <PanelCard title="Upcoming turnovers">
        <p className="text-sm text-ink-secondary">Cleaning vendors notified automatically after guest checkout.</p>
      </PanelCard>
    </HostShell>
  )
}

function GuestsContent() {
  return (
    <HostShell title="Guest management" subtitle="Messages, check-in instructions, and reviews">
      <PanelCard title="Recent guests">
        <p className="text-sm text-ink-secondary">Guest messaging integrates with your inbox at /messages.</p>
      </PanelCard>
    </HostShell>
  )
}

function HostPayoutsPage() {
  const [payouts, setPayouts] = useState([])

  useEffect(() => {
    fetchHostPayouts().then(({ payouts: p }) => setPayouts(p ?? []))
  }, [])

  return (
    <HostShell title="Host payouts" subtitle="Earnings deposited to your BaytMiftah wallet">
      <PanelCard title="Payout history">
        <ul className="divide-y divide-surface-border">
          {payouts.map((p) => (
            <li key={p.id} className="flex justify-between py-3 text-sm">
              <span>GHS {Number(p.amount).toLocaleString()}</span>
              <span className="capitalize">{p.status}</span>
            </li>
          ))}
        </ul>
      </PanelCard>
    </HostShell>
  )
}

function withHostCapability(Page) {
  return function Wrapped() {
    return (
      <CapabilityRoute require={CAPABILITIES.HOST_SHORT_STAY}>
        <Page />
      </CapabilityRoute>
    )
  }
}

export const HostDashboardPage = () => <ProtectedRoute><HostDashboard /></ProtectedRoute>
export const HostReservationsWorkspacePage = withHostCapability(HostReservationsPage)
export const HostCalendarWorkspacePage = withHostCapability(HostCalendarPage)
export const HostPricingPage = withHostCapability(PricingContent)
export const HostCleaningPage = withHostCapability(CleaningContent)
export const HostGuestsPage = withHostCapability(GuestsContent)
export const HostPayoutsWorkspacePage = withHostCapability(HostPayoutsPage)

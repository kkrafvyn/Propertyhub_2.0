import { useEffect, useState } from 'react'
import TenantShell from '../../components/TenantShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import CapabilityRoute from '../../components/CapabilityRoute'
import { CAPABILITIES } from '../../lib/capabilities'
import { HubLinkGrid, PanelCard, PrimaryButton } from '../../components/ui/AirbnbUI'
import {
  fetchTenantVisitors,
  createVisitorPass,
  fetchTenantAnnouncements,
  fetchResidentDashboard,
} from '../../services/resident-service'

function withRent(Page) {
  return function Wrapped() {
    return (
      <CapabilityRoute require={CAPABILITIES.RENT}>
        <Page />
      </CapabilityRoute>
    )
  }
}

function TenantPortalHub() {
  const links = [
    { to: '/renter/leases', label: 'Active lease', desc: 'Terms, dates, and documents' },
    { to: '/renter/payments', label: 'Rent payments', desc: 'Pay via card, MoMo, or USSD' },
    { to: '/renter/maintenance', label: 'Maintenance', desc: 'Submit repair requests' },
    { to: '/tenant/visitors', label: 'Visitor passes', desc: 'Issue guest access codes' },
    { to: '/tenant/access', label: 'Building access', desc: 'Smart entry credentials' },
    { to: '/tenant/community', label: 'Announcements', desc: 'Building and community news' },
    { to: '/resident', label: 'Smart resident', desc: 'Doors, energy, intercom' },
  ]

  return (
    <TenantShell title="Tenant portal" subtitle="Everything you need as an active renter">
      <HubLinkGrid links={links} />
    </TenantShell>
  )
}

function TenantVisitorsContent() {
  const [passes, setPasses] = useState([])
  const [guestName, setGuestName] = useState('')

  useEffect(() => {
    fetchTenantVisitors().then(({ passes: p }) => setPasses(p ?? []))
  }, [])

  async function issuePass() {
    if (!guestName.trim()) return
    const now = new Date()
    const end = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    await createVisitorPass({
      guestName,
      validFrom: now.toISOString(),
      validTo: end.toISOString(),
      propertyId: 'default',
    })
    fetchTenantVisitors().then(({ passes: p }) => setPasses(p ?? []))
    setGuestName('')
  }

  return (
    <TenantShell title="Visitor passes" subtitle="Time-bound guest access codes">
      <PanelCard title="Issue pass">
        <div className="flex flex-wrap gap-3">
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Guest name"
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
          />
          <PrimaryButton onClick={issuePass}>Create 8-hour pass</PrimaryButton>
        </div>
      </PanelCard>
      <PanelCard title="Active passes" className="mt-6">
        <ul className="divide-y divide-surface-border">
          {passes.map((p) => (
            <li key={p.id} className="flex justify-between py-3 text-sm">
              <span>{p.guest_name}</span>
              <span className="font-mono font-medium">{p.access_code}</span>
            </li>
          ))}
        </ul>
      </PanelCard>
    </TenantShell>
  )
}

function TenantAccessContent() {
  const [access, setAccess] = useState(null)

  useEffect(() => {
    fetchResidentDashboard().then(({ access: a }) => setAccess(a))
  }, [])

  return (
    <TenantShell title="Building access" subtitle="Smart credentials linked to your lease">
      <PanelCard title="Your access points">
        <ul className="divide-y divide-surface-border">
          {(access?.doors ?? []).map((d) => (
            <li key={d.id} className="flex justify-between py-3 text-sm">
              <span>{d.name}</span>
              <span className="capitalize">{d.status}</span>
            </li>
          ))}
        </ul>
      </PanelCard>
    </TenantShell>
  )
}

function TenantCommunityContent() {
  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    fetchTenantAnnouncements().then(({ announcements: a }) => setAnnouncements(a ?? []))
  }, [])

  return (
    <TenantShell title="Community" subtitle="Building announcements and notices">
      <ul className="space-y-4">
        {announcements.map((a) => (
          <PanelCard key={a.id} title={a.title}>
            <p className="text-sm text-ink-secondary">{a.body}</p>
            <p className="mt-2 text-xs text-ink-muted">{a.published_at?.slice?.(0, 10)}</p>
          </PanelCard>
        ))}
      </ul>
    </TenantShell>
  )
}

export function TenantPortalPage() {
  return <ProtectedRoute><TenantPortalHub /></ProtectedRoute>
}

export const TenantVisitorsPage = withRent(TenantVisitorsContent)
export const TenantAccessPage = withRent(TenantAccessContent)
export const TenantCommunityPage = withRent(TenantCommunityContent)

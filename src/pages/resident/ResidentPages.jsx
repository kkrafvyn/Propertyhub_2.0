import { useEffect, useState } from 'react'
import ResidentShell from '../../components/ResidentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import CapabilityRoute from '../../components/CapabilityRoute'
import { CAPABILITIES } from '../../lib/capabilities'
import { HubLinkGrid, PanelCard, PrimaryButton, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import {
  fetchResidentDashboard,
  unlockDoor,
  fetchResidentEnergy,
  fetchTenantVisitors,
  fetchTenantAnnouncements,
} from '../../services/resident-service'

function withResident(Page) {
  return function Wrapped() {
    return (
      <CapabilityRoute require={[CAPABILITIES.RENT, CAPABILITIES.STAY_GUEST]}>
        <Page />
      </CapabilityRoute>
    )
  }
}

function ResidentHub() {
  const [access, setAccess] = useState(null)

  useEffect(() => {
    fetchResidentDashboard().then(({ access: a }) => setAccess(a))
  }, [])

  const links = [
    { to: '/resident/access', label: 'Door access', desc: 'Unlock building and unit doors' },
    { to: '/resident/visitors', label: 'Visitors', desc: 'Guest passes and logs' },
    { to: '/resident/energy', label: 'Energy usage', desc: 'Monthly consumption and cost' },
    { to: '/resident/announcements', label: 'Announcements', desc: 'Community updates' },
  ]

  return (
    <ResidentShell title="Smart resident" subtitle="Building access, energy, and community">
      {access && (
        <StatGrid cols={2}>
          <StatCard label="Energy (kWh)" value={access.energyKwh} />
          <StatCard label="Est. cost" value={`GHS ${access.energyCost}`} />
        </StatGrid>
      )}
      <HubLinkGrid links={links} />
    </ResidentShell>
  )
}

function ResidentAccessContent() {
  const [doors, setDoors] = useState([])

  useEffect(() => {
    fetchResidentDashboard().then(({ access }) => setDoors(access?.doors ?? []))
  }, [])

  async function handleUnlock(deviceId) {
    await unlockDoor(deviceId)
    setDoors((prev) => prev.map((d) => (d.id === deviceId ? { ...d, status: 'unlocked' } : d)))
  }

  return (
    <ResidentShell title="Door access" subtitle="Unlock doors linked to your lease">
      <ul className="space-y-3">
        {doors.map((d) => (
          <PanelCard key={d.id} title={d.name}>
            <div className="flex items-center justify-between">
              <span className="text-sm capitalize">{d.status}</span>
              <PrimaryButton onClick={() => handleUnlock(d.id)}>Unlock</PrimaryButton>
            </div>
          </PanelCard>
        ))}
      </ul>
    </ResidentShell>
  )
}

function ResidentVisitorsContent() {
  const [passes, setPasses] = useState([])

  useEffect(() => {
    fetchTenantVisitors().then(({ passes: p }) => setPasses(p ?? []))
  }, [])

  return (
    <ResidentShell title="Visitors" subtitle="Active guest passes">
      <PanelCard title="Passes">
        <ul className="divide-y divide-surface-border text-sm">
          {passes.map((p) => (
            <li key={p.id} className="flex justify-between py-3">
              <span>{p.guest_name}</span>
              <span className="font-mono">{p.access_code}</span>
            </li>
          ))}
        </ul>
      </PanelCard>
    </ResidentShell>
  )
}

function ResidentEnergyContent() {
  const [readings, setReadings] = useState([])

  useEffect(() => {
    fetchResidentEnergy().then(({ readings: r }) => setReadings(r ?? []))
  }, [])

  return (
    <ResidentShell title="Energy" subtitle="Unit consumption tracking">
      <PanelCard title="Monthly readings">
        <ul className="divide-y divide-surface-border text-sm">
          {readings.map((r) => (
            <li key={r.id ?? r.period} className="flex justify-between py-3">
              <span>{r.period}</span>
              <span>{r.kwh} kWh · GHS {r.cost}</span>
            </li>
          ))}
        </ul>
      </PanelCard>
    </ResidentShell>
  )
}

function ResidentAnnouncementsContent() {
  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    fetchTenantAnnouncements().then(({ announcements: a }) => setAnnouncements(a ?? []))
  }, [])

  return (
    <ResidentShell title="Announcements" subtitle="Community and building news">
      <ul className="space-y-4">
        {announcements.map((a) => (
          <PanelCard key={a.id} title={a.title}>
            <p className="text-sm text-ink-secondary">{a.body}</p>
          </PanelCard>
        ))}
      </ul>
    </ResidentShell>
  )
}

export function ResidentHubPage() {
  return <ProtectedRoute><ResidentHub /></ProtectedRoute>
}

export const ResidentAccessPage = withResident(ResidentAccessContent)
export const ResidentVisitorsPage = withResident(ResidentVisitorsContent)
export const ResidentEnergyPage = withResident(ResidentEnergyContent)
export const ResidentAnnouncementsPage = withResident(ResidentAnnouncementsContent)

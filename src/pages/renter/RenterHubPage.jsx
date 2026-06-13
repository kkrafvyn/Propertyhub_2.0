import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import RenterShell from '../../components/RenterShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchRenterDashboard } from '../../services/renter-service'

const links = [
  { to: '/renter/leases', label: 'My leases', desc: 'Active and past rental agreements' },
  { to: '/renter/payments', label: 'Rent payments', desc: 'Pay rent and view history' },
  { to: '/renter/maintenance', label: 'Maintenance', desc: 'Submit and track repair requests' },
  { to: '/renter/sign', label: 'Digital signing', desc: 'Sign lease documents' },
  { to: '/documents', label: 'Document vault', desc: 'All rental documents' },
  { to: '/', label: 'Browse rentals', desc: 'Find your next home' },
]

function RenterHub() {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    fetchRenterDashboard().then(({ profile: p }) => setProfile(p))
  }, [])

  return (
    <RenterShell title="Renter workspace" subtitle={profile ? `${profile.unit} · GHS ${profile.rentAmount.toLocaleString()}/mo` : 'Your rental journey'}>
      {profile && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Current rent" value={`GHS ${profile.rentAmount.toLocaleString()}`} />
          <Stat label="Lease ends" value={profile.leaseEnd} />
          <Stat label="Landlord" value={profile.landlord} />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map(({ to, label, desc }) => (
          <Link key={to} to={to} className="rounded-card border border-surface-border bg-surface p-5 transition hover:shadow-card">
            <p className="font-semibold">{label}</p>
            <p className="mt-1 text-sm text-ink-secondary">{desc}</p>
          </Link>
        ))}
      </div>
    </RenterShell>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-card border border-surface-border bg-surface p-4">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="mt-1 font-semibold text-brand-dark">{value}</p>
    </div>
  )
}

export default function RenterHubPage() {
  return <ProtectedRoute><RenterHub /></ProtectedRoute>
}

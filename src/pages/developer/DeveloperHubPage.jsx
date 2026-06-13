import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import DeveloperShell from '../../components/DeveloperShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchDeveloperDashboard } from '../../services/developer-service'

const links = [
  { to: '/developer/projects', label: 'Projects', desc: 'Active developments and unit inventory' },
  { to: '/developer/construction', label: 'Construction tracking', desc: 'Milestones and progress' },
  { to: '/developer/buyers', label: 'Buyer portal', desc: 'Pre-sales and contract stages' },
]

function Hub() {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    fetchDeveloperDashboard().then(({ profile: p }) => setProfile(p))
  }, [])

  return (
    <DeveloperShell title="Developer platform" subtitle={profile?.name || 'Project management'}>
      {profile && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Active projects" value={profile.activeProjects} />
          <Stat label="Total units" value={profile.unitsTotal} />
          <Stat label="Units sold" value={profile.unitsSold} />
          <Stat label="Avg progress" value={profile.constructionProgress} />
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
    </DeveloperShell>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-card border border-surface-border bg-surface p-4">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="mt-1 text-xl font-bold text-brand-dark">{value}</p>
    </div>
  )
}

export default function DeveloperHubPage() {
  return <ProtectedRoute><Hub /></ProtectedRoute>
}

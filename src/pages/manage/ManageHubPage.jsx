import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ManageShell from '../../components/ManageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchPmsDashboard } from '../../services/pms-service'

const links = [
  { to: '/manage/tenants', label: 'Tenants', desc: 'Occupancy, leases, and balances' },
  { to: '/manage/work-orders', label: 'Work orders', desc: 'Maintenance and vendor dispatch' },
  { to: '/manage/finance', label: 'Rent & expenses', desc: 'Collection and expense tracking' },
  { to: '/manage/inspections', label: 'Inspections', desc: 'Move-in, quarterly, move-out reports' },
  { to: '/documents', label: 'Document vault', desc: 'Leases and compliance docs' },
]

function ManageHub() {
  const [portfolio, setPortfolio] = useState(null)

  useEffect(() => {
    fetchPmsDashboard().then(({ portfolio: p }) => setPortfolio(p))
  }, [])

  return (
    <ManageShell title="Property management" subtitle={portfolio?.name || 'Portfolio overview'}>
      {portfolio && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Buildings" value={portfolio.buildings} />
          <Stat label="Units" value={portfolio.units} />
          <Stat label="Occupancy" value={portfolio.occupancy} />
          <Stat label="Collected MTD" value={`GHS ${portfolio.collectedMtd.toLocaleString()}`} />
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
    </ManageShell>
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

export default function ManageHubPage() {
  return <ProtectedRoute><ManageHub /></ProtectedRoute>
}

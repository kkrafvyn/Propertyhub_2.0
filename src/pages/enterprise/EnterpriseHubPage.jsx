import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import EnterpriseShell from '../../components/EnterpriseShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchEnterpriseDashboard } from '../../services/enterprise-service'

const links = [
  { to: '/enterprise/portfolios', label: 'Multi-country portfolios', desc: 'Assets across Ghana, Nigeria, Kenya' },
  { to: '/enterprise/esg', label: 'ESG reporting', desc: 'Sustainability and governance metrics' },
  { to: '/enterprise/forecast', label: 'Revenue forecast', desc: 'NOI projections by quarter' },
]

function Hub() {
  const [org, setOrg] = useState(null)

  useEffect(() => {
    fetchEnterpriseDashboard().then(({ org: o }) => setOrg(o))
  }, [])

  return (
    <EnterpriseShell title="Enterprise asset management" subtitle={org?.name || 'Institutional portfolios'}>
      {org && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Countries" value={org.countries} />
          <Stat label="Assets" value={org.assets} />
          <Stat label="AUM" value={org.aum} />
          <Stat label="Occupancy" value={org.occupancy} />
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
    </EnterpriseShell>
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

export default function EnterpriseHubPage() {
  return <ProtectedRoute><Hub /></ProtectedRoute>
}

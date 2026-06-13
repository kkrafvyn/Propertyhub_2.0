import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../../components/DesktopShell'
import ProtectedRoute from '../../components/ProtectedRoute'

const links = [
  { to: '/saved', label: 'Saved properties', desc: 'Homes you have shortlisted' },
  { to: '/trips', label: 'Viewings & trips', desc: 'Scheduled property visits' },
  { to: '/offers', label: 'Offer room', desc: 'Submit and track offers' },
  { to: '/transactions', label: 'Transaction center', desc: 'Closing checklist and stages' },
  { to: '/documents', label: 'Document vault', desc: 'Titles, offers, and contracts' },
  { to: '/buyer/finance', label: 'Financing center', desc: 'Mortgages and partner banks' },
  { to: '/buyer/advisor', label: 'AI buyer advisor', desc: 'Pricing and neighborhood insights' },
  { to: '/compare', label: 'Compare', desc: 'Side-by-side property analysis' },
  { to: '/neighborhoods', label: 'Neighborhood intel', desc: 'Schools, safety, growth' },
]

function BuyerHub() {
  return (
    <DesktopShell search={<CompactSearch />}>
      <h1 className="text-2xl font-semibold">Buyer workspace</h1>
      <p className="mt-1 text-ink-secondary">Your purchase journey — from search to close.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {links.map(({ to, label, desc }) => (
          <Link key={to} to={to} className="rounded-card border border-surface-border bg-surface p-5 transition hover:shadow-card">
            <p className="font-semibold text-ink">{label}</p>
            <p className="mt-1 text-sm text-ink-secondary">{desc}</p>
          </Link>
        ))}
      </div>
    </DesktopShell>
  )
}

export default function BuyerHubPage() {
  return <ProtectedRoute><BuyerHub /></ProtectedRoute>
}

import { Link, NavLink } from 'react-router-dom'

const links = [
  { to: '/agency', label: 'Overview', end: true },
  { to: '/agency/branches', label: 'Branches' },
  { to: '/agency/team', label: 'Team' },
  { to: '/agency/leads', label: 'Leads' },
  { to: '/agency/properties', label: 'Properties' },
  { to: '/agency/payroll', label: 'Payroll' },
  { to: '/agency/analytics', label: 'Analytics' },
  { to: '/agency/trust', label: 'Trust score' },
  { to: '/agency/compliance', label: 'Compliance' },
  { to: '/agency/onboarding', label: 'Onboarding' },
  { to: '/documents', label: 'Documents' },
]

export default function AgencyShell({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-surface-subtle text-ink">
      <header className="border-b border-surface-border bg-surface">
        <div className="mx-auto flex max-w-page items-center justify-between px-6 py-4 lg:px-10">
          <Link to="/" className="text-lg font-bold text-brand-dark">BaytMiftah Agency</Link>
          <Link to="/" className="text-sm text-ink-secondary hover:text-ink">← Back to marketplace</Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-page gap-8 px-6 py-8 lg:grid-cols-[220px_1fr] lg:px-10">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-brand-dark text-brand' : 'text-ink-secondary hover:bg-surface hover:text-ink'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <main>
          {title && <h1 className="text-2xl font-semibold">{title}</h1>}
          {subtitle && <p className="mt-1 text-ink-secondary">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

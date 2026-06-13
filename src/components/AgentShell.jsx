import { Link, NavLink } from 'react-router-dom'

const links = [
  { to: '/agent', label: 'Dashboard', end: true },
  { to: '/agent/leads', label: 'Leads' },
  { to: '/agent/listings', label: 'Listings' },
  { to: '/agent/calendar', label: 'Calendar' },
  { to: '/agent/tasks', label: 'Tasks' },
  { to: '/agent/commissions', label: 'Commissions' },
  { to: '/agent/analytics', label: 'Analytics' },
  { to: '/agent/coach', label: 'Listing coach' },
]

export default function AgentShell({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-surface-subtle text-ink">
      <header className="border-b border-surface-border bg-surface">
        <div className="mx-auto flex max-w-page items-center justify-between px-6 py-4 lg:px-10">
          <Link to="/agent" className="text-lg font-bold text-brand-dark">Agent CRM</Link>
          <Link to="/" className="text-sm text-ink-secondary hover:text-ink">← Marketplace</Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-page gap-8 px-6 py-8 lg:grid-cols-[200px_1fr] lg:px-10">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ${
                  isActive ? 'bg-brand-dark text-brand' : 'text-ink-secondary hover:bg-surface'
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

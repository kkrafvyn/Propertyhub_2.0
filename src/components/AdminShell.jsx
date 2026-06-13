import { Link, NavLink } from 'react-router-dom'

const links = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/agencies', label: 'Agency verification' },
  { to: '/admin/moderation', label: 'Moderation' },
  { to: '/admin/kyc', label: 'KYC / AML' },
  { to: '/admin/fraud', label: 'Fraud & risk' },
  { to: '/admin/ai', label: 'AI orchestration' },
  { to: '/admin/valuation-api', label: 'Valuation API' },
  { to: '/admin/global', label: 'Regions & currency' },
  { to: '/admin/audit', label: 'Audit log' },
]

export default function AdminShell({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-brand-dark text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-page items-center justify-between px-6 py-4 lg:px-10">
          <span className="text-lg font-bold text-brand">BaytMiftah Admin</span>
          <Link to="/" className="text-sm text-white/70 hover:text-white">← Marketplace</Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-page gap-8 px-6 py-8 lg:grid-cols-[220px_1fr] lg:px-10">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ${
                  isActive ? 'bg-brand text-brand-dark' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <main>
          {title && <h1 className="text-2xl font-semibold">{title}</h1>}
          {subtitle && <p className="mt-1 text-white/70">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

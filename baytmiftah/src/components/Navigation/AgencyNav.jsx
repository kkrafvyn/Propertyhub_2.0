import { Link, useLocation } from 'react-router-dom'

export default function AgencyNav() {
  const location = useLocation()

  const navItems = [
    { path: '/agency/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/agency/properties', label: 'Properties', icon: 'home' },
    { path: '/agency/team', label: 'Team', icon: 'group' },
    { path: '/agency/leads', label: 'Leads', icon: 'mail' },
    { path: '/agency/analytics', label: 'Analytics', icon: 'analytics' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <aside className="w-64 bg-surface-container border-r border-gray-700 min-h-screen p-6">
      <nav className="space-y-2">
        <h3 className="text-body-sm text-gray-400 uppercase tracking-wider mb-6">
          Agency
        </h3>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.path)
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:bg-surface hover:text-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              {item.icon}
            </span>
            <span className="text-body-md">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}

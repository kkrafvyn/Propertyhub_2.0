import { Link, useLocation } from 'react-router-dom'

export default function SmartPropertyNav() {
  const location = useLocation()

  const navItems = [
    { path: '/smart-property/devices', label: 'Devices', icon: 'devices_other' },
    { path: '/smart-property/automation', label: 'Automation', icon: 'settings_automation' },
    { path: '/smart-property/alerts', label: 'Alerts', icon: 'notifications' },
    { path: '/smart-property/logs', label: 'Logs', icon: 'history' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <aside className="w-64 bg-surface-container border-r border-gray-700 min-h-screen p-6">
      <nav className="space-y-2">
        <h3 className="text-body-sm text-gray-400 uppercase tracking-wider mb-6">
          Smart Home
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

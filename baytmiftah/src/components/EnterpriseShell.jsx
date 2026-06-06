import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const primaryNav = [
  { label: 'Marketplace', icon: 'storefront', path: '/explore' },
  { label: 'Agency', icon: 'business_center', path: '/agency/dashboard' },
  { label: 'Smart Property', icon: 'settings_input_antenna', path: '/smart-property/devices' },
  { label: 'Analytics', icon: 'analytics', path: '/agency/analytics' },
  { label: 'Support', icon: 'help', path: '/support' },
  { label: 'Settings', icon: 'settings', path: '/profile' },
]

const topNav = [
  { label: 'Listings', path: '/portfolio' },
  { label: 'Leads', path: '/agency/leads' },
  { label: 'Devices', path: '/smart-property/devices' },
  { label: 'Bookings', path: '/bookings' },
]

export default function EnterpriseShell({
  children,
  activeSection,
  searchPlaceholder = 'Search resources...',
  showCreate = true,
}) {
  const location = useLocation()

  const isActive = (item) =>
    activeSection === item.label ||
    location.pathname === item.path ||
    (item.path !== '/' && location.pathname.startsWith(`${item.path}/`))

  return (
    <div className="enterprise-page min-h-screen bg-surface text-on-surface">
      <aside className="fixed left-0 top-0 hidden lg:flex h-screen w-72 flex-col border-r border-outline-variant bg-surface-container px-6 py-8">
        <Link to="/explore" className="text-3xl font-bold text-on-surface">
          Property Hub
        </Link>
        <p className="mt-1 text-on-surface-variant">Enterprise Suite</p>

        <nav className="mt-12 flex flex-col gap-2">
          {primaryNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 rounded-md px-4 py-3 transition ${
                isActive(item)
                  ? 'border-r-4 border-secondary bg-secondary/10 text-secondary'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-outline-variant pt-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-on-secondary">
              <span className="material-symbols-outlined">person</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Alex Rivera</p>
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">
                Admin
              </p>
            </div>
          </div>
          <button className="flex w-full items-center gap-4 rounded-md px-4 py-3 text-on-surface-variant hover:bg-surface-container-high">
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-3 border-b border-outline-variant bg-surface/95 px-4 py-4 backdrop-blur-xl sm:px-5 md:px-8">
          <Link to="/explore" className="shrink-0 text-xl font-bold text-on-surface sm:text-2xl lg:hidden">
            Property Hub
          </Link>

          <label className="hidden h-12 w-full max-w-sm items-center gap-3 rounded-full border border-outline-variant bg-surface-container-high px-5 md:flex lg:max-w-xs xl:max-w-sm">
            <span className="material-symbols-outlined text-on-surface-variant">
              search
            </span>
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-on-surface-variant"
              placeholder={searchPlaceholder}
            />
          </label>

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3 md:gap-5">
            <nav className="hidden items-center gap-4 xl:flex xl:gap-6">
              {topNav.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-semibold tracking-wide ${
                    location.pathname === item.path ||
                    location.pathname.startsWith(`${item.path}/`)
                      ? 'border-b-2 border-secondary pb-2 text-secondary'
                      : 'text-on-surface hover:text-secondary'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {showCreate && (
              <Link to="/create-listing" className="btn-primary hidden shrink-0 py-2 sm:inline-flex">
                Create New
              </Link>
            )}

            <Link
              to="/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-secondary" />
            </Link>
          </div>
        </header>

        {children}
      </div>
    </div>
  )
}

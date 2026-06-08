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
      <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-white/10 bg-[rgba(11,18,32,0.94)] px-5 py-6 text-[#F8FAFC] shadow-[1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-2xl lg:flex">
        <Link to="/explore" className="min-h-12 text-3xl font-semibold tracking-normal text-[#F8FAFC]">
          BaytMiftah
        </Link>
        <p className="mt-1 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
          Trust-First Estate OS
        </p>

        <nav className="mt-10 flex flex-col gap-1">
          {primaryNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex min-h-11 items-center gap-4 rounded-md px-3 py-2 font-semibold transition ${
                isActive(item)
                  ? 'bg-[#E9C349] text-[#0F172A] shadow-[0_6px_20px_rgba(233,195,73,0.18)]'
                  : 'text-[#CBD5E1] hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[1.35rem]">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-5">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#E9C349] text-[#0F172A]">
              <span className="material-symbols-outlined">person</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Alex Rivera</p>
              <p className="text-xs font-semibold text-[#94A3B8]">
                Private Office
              </p>
            </div>
          </div>
          <button className="flex min-h-11 w-full items-center gap-4 rounded-md px-3 py-2 font-semibold text-[#CBD5E1] hover:bg-white/10 hover:text-white">
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-[rgba(7,21,36,0.9)] px-4 py-3 text-[#F8FAFC] backdrop-blur-2xl sm:px-5 md:px-8">
          <Link to="/explore" className="shrink-0 text-xl font-semibold tracking-normal text-[#F8FAFC] sm:text-2xl lg:hidden">
            BaytMiftah
          </Link>

          <label className="hidden h-11 w-full max-w-sm items-center gap-3 rounded-md border border-white/10 bg-white/10 px-4 md:flex lg:max-w-xs xl:max-w-sm">
            <span className="material-symbols-outlined text-[#CBD5E1]">
              search
            </span>
            <input
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#CBD5E1]"
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
                      : 'text-[#CBD5E1] hover:text-white'
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
              className="relative flex h-11 w-11 items-center justify-center rounded-md hover:bg-white/10"
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

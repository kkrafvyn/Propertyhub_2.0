import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', path: '/agency/dashboard' },
  { label: 'Marketplace', icon: 'storefront', path: '/agency/properties' },
  { label: 'Agency', icon: 'group', path: '/agency/team' },
  { label: 'Smart Property', icon: 'settings_input_antenna', path: '/smart-property/devices' },
  { label: 'Analytics', icon: 'analytics', path: '/agency/analytics' },
  { label: 'Settings', icon: 'settings', path: '/profile' },
]

export default function PropTechShell({
  children,
  active = 'Dashboard',
  brand = 'BaytMiftah Workspace',
  sidebarTitle = 'Agency Command',
  sidebarSubtitle = 'Trust-First Data Layer',
  searchPlaceholder = 'Search portfolio...',
  primaryAction = 'Add Property',
}) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('baytmiftah_user')
    localStorage.removeItem('baytmiftah_token')
    window.dispatchEvent(new Event('baytmiftah:user'))
    navigate('/login', { replace: true })
  }

  return (
    <div className="proptech-page min-h-screen bg-[#051424] text-[#F8FAFC]">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-white/10 bg-[rgba(11,18,32,0.94)] p-4 shadow-[1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-2xl lg:flex">
        <Link to="/agency/dashboard" className="min-h-11 text-2xl font-semibold leading-tight tracking-normal">
          {sidebarTitle}
        </Link>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
          {sidebarSubtitle}
        </p>

        <nav className="mt-10 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              active === item.label ||
              location.pathname === item.path ||
              location.pathname.startsWith(`${item.path}/`)

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex min-h-11 items-center gap-4 rounded-md px-3 py-2 font-semibold tracking-normal transition ${
                  isActive
                    ? 'bg-[#E9C349] text-[#0F172A] shadow-[0_6px_20px_rgba(233,195,73,0.18)]'
                    : 'text-[#CBD5E1] hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[1.35rem]">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto space-y-3 border-t border-white/10 pt-5">
          <Link
            to="/create-listing"
            className="block min-h-11 rounded-md bg-[#E9C349] px-6 py-3 text-center font-semibold text-[#0F172A]"
          >
            Add Elite Listing
          </Link>
          <Link to="/support" className="flex min-h-11 items-center gap-4 rounded-md px-3 py-2 font-semibold text-[#CBD5E1] hover:bg-white/10 hover:text-white">
            <span className="material-symbols-outlined">help</span>
            Support
          </Link>
          <button
            onClick={handleLogout}
            className="flex min-h-11 items-center gap-4 rounded-md px-3 py-2 font-semibold text-[#CBD5E1] hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-white/10 bg-[rgba(7,21,36,0.9)] px-4 backdrop-blur-2xl md:gap-5 md:px-8">
          <Link to="/agency/dashboard" className="min-w-0 shrink truncate text-xl font-semibold tracking-normal md:text-2xl">
            {brand}
          </Link>
          <label className="ml-auto hidden h-11 w-full max-w-md items-center gap-3 rounded-md border border-white/10 bg-white/10 px-4 md:flex">
            <span className="material-symbols-outlined text-[#CBD5E1]">search</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-[#F8FAFC] outline-none placeholder:text-[#CBD5E1]"
              placeholder={searchPlaceholder}
            />
          </label>
          <div className="ml-auto flex items-center gap-2 md:ml-0 md:gap-4">
            {primaryAction && (
              <Link
                to="/create-listing"
                className="hidden min-h-11 rounded-md bg-[#E9C349] px-6 py-3 font-semibold text-[#0F172A] sm:block"
              >
                {primaryAction}
              </Link>
            )}
            <button className="hidden h-11 w-11 place-items-center rounded-md hover:bg-white/10 sm:grid" aria-label="Help">
              <span className="material-symbols-outlined">help</span>
            </button>
            <button className="grid h-11 w-11 place-items-center rounded-md hover:bg-white/10" aria-label="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="hidden h-11 w-11 place-items-center rounded-md hover:bg-white/10 sm:grid" aria-label="Settings">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#E9C349] text-sm font-bold text-[#071121]">
              BM
            </span>
          </div>
        </header>

        {children}
      </div>
    </div>
  )
}

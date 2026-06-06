import React from 'react'
import { Link, useLocation } from 'react-router-dom'

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
  brand = 'PropTech Enterprise',
  sidebarTitle = 'Management Console',
  sidebarSubtitle = 'Proprietary Data Layer',
  searchPlaceholder = 'Search portfolio...',
  primaryAction = 'Add Property',
}) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#f5f7fc] text-[#071121]">
      <aside className="fixed left-0 top-0 hidden h-screen w-80 flex-col border-r border-[#b9c3d2] bg-[#dbeafe] p-6 shadow-md lg:flex">
        <Link to="/agency/dashboard" className="text-3xl font-bold leading-tight">
          {sidebarTitle}
        </Link>
        <p className="mt-2 text-sm font-semibold tracking-widest text-[#596170]">
          {sidebarSubtitle}
        </p>

        <nav className="mt-16 flex flex-col gap-3">
          {navItems.map((item) => {
            const isActive =
              active === item.label ||
              location.pathname === item.path ||
              location.pathname.startsWith(`${item.path}/`)

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 rounded-md px-4 py-3 font-semibold tracking-wide transition ${
                  isActive
                    ? 'bg-[#62efad] text-[#006c48]'
                    : 'text-[#202735] hover:bg-white/60'
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto space-y-5 border-t border-[#b9c3d2] pt-6">
          <Link
            to="/create-listing"
            className="block rounded-md bg-black px-6 py-4 text-center font-bold text-white"
          >
            Upgrade Plan
          </Link>
          <Link to="/support" className="flex items-center gap-4 px-4 py-2">
            <span className="material-symbols-outlined">help</span>
            Support
          </Link>
          <button className="flex items-center gap-4 px-4 py-2">
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-80">
        <header className="sticky top-0 z-30 flex min-h-20 items-center gap-5 border-b border-[#b9c3d2] bg-white/95 px-5 backdrop-blur md:px-8">
          <Link to="/agency/dashboard" className="shrink-0 text-2xl font-black md:text-3xl">
            {brand}
          </Link>
          <label className="ml-auto hidden h-14 w-full max-w-md items-center gap-3 rounded-full border border-[#b9c3d2] bg-[#edf4ff] px-5 md:flex">
            <span className="material-symbols-outlined text-[#4b5563]">search</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-[#667085]"
              placeholder={searchPlaceholder}
            />
          </label>
          <div className="ml-auto flex items-center gap-4 md:ml-0">
            {primaryAction && (
              <Link
                to="/create-listing"
                className="hidden rounded-md bg-black px-6 py-3 font-bold text-white sm:block"
              >
                {primaryAction}
              </Link>
            )}
            <span className="material-symbols-outlined hidden sm:block">help</span>
            <span className="material-symbols-outlined relative">notifications</span>
            <span className="material-symbols-outlined hidden sm:block">settings</span>
            <img
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"
              alt=""
              className="h-11 w-11 rounded-full object-cover"
            />
          </div>
        </header>

        {children}
      </div>
    </div>
  )
}

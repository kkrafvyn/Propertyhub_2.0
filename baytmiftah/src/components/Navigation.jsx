import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navigation() {
  const location = useLocation()

  const navItems = [
    { label: 'Home', icon: 'home', path: '/' },
    { label: 'Explore', icon: 'search', path: '/explore' },
    { label: 'Listings', icon: 'real_estate_agent', path: '/my-listings' },
    { label: 'Messages', icon: 'mail', path: '/messages' },
    { label: 'Favorites', icon: 'favorite', path: '/favorites' },
    { label: 'Agency', icon: 'business', path: '/agency/dashboard' },
    { label: 'Ecosystem', icon: 'hub', path: '/ecosystem' },
    { label: 'Smart', icon: 'devices_other', path: '/smart-property/devices' },
    { label: 'Profile', icon: 'account_circle', path: '/profile' },
  ]
  const mobileNavItems = navItems.filter((item) =>
    ['/', '/explore', '/messages', '/ecosystem', '/profile'].includes(item.path)
  )

  const isActive = (path) =>
    location.pathname === path ||
    (path !== '/' && location.pathname.startsWith(`${path}/`)) ||
    (path === '/agency/dashboard' && location.pathname.startsWith('/agency')) ||
    (path === '/ecosystem' && location.pathname.startsWith('/ecosystem')) ||
    (path === '/smart-property/devices' &&
      location.pathname.startsWith('/smart-property'))

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col gap-8 border-r border-[#cbd3df] bg-[#f8faff] px-4 pt-8 text-[#071121] md:flex">
        <Link to="/" className="flex items-center gap-3 px-4 py-2">
          <span className="text-2xl font-black">Property Hub</span>
        </Link>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-md px-4 py-3 font-semibold transition ${
                isActive(item.path)
                  ? 'bg-[#e9fbf6] text-[#007a52]'
                  : 'text-[#303744] hover:bg-[#edf4ff]'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto">
          <button
            onClick={() => {
              localStorage.removeItem('baytmiftah_user')
              window.location.href = '/login'
            }}
            className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-red-600 transition hover:bg-red-50"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#cbd3df] bg-white md:hidden">
        <div className="flex justify-around items-center h-16">
          {mobileNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-16 h-16 transition ${
                isActive(item.path)
                  ? 'text-[#007a52]'
                  : 'text-[#303744]'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}

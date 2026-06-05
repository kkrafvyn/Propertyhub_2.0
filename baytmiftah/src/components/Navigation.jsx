import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navigation() {
  const location = useLocation()

  const navItems = [
    { label: 'Home', icon: 'home', path: '/' },
    { label: 'Explore', icon: 'search', path: '/explore' },
    { label: 'Messages', icon: 'mail', path: '/messages' },
    { label: 'Favorites', icon: 'favorite', path: '/favorites' },
    { label: 'Profile', icon: 'account_circle', path: '/profile' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-surface-container-high border-r border-outline-variant flex-col pt-8 px-4 gap-8">
        <Link to="/" className="flex items-center gap-3 px-4 py-2">
          <span className="text-secondary text-2xl font-bold">BaytMiftah</span>
        </Link>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive(item.path)
                  ? 'bg-secondary/20 text-secondary'
                  : 'text-on-surface hover:bg-surface-container-highest'
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
            className="w-full flex items-center gap-3 px-4 py-3 text-error hover:bg-error/10 rounded-lg transition"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed md:hidden bottom-0 left-0 right-0 z-40 glass-card border-t border-outline-variant">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-16 h-16 transition ${
                isActive(item.path)
                  ? 'text-secondary'
                  : 'text-on-surface-variant hover:text-on-surface'
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

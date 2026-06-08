import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navigation() {
  const location = useLocation()

  const navSections = [
    {
      label: 'Primary',
      items: [
        { label: 'Home', icon: 'home', path: '/' },
        { label: 'Explore', icon: 'search', path: '/explore' },
        { label: 'Matches', icon: 'travel_explore', path: '/smart-match' },
        { label: 'Concierge', icon: 'support_agent', path: '/concierge' },
        { label: 'Messages', icon: 'mail', path: '/messages' },
        { label: 'Profile', icon: 'account_circle', path: '/profile' },
      ],
    },
    {
      label: 'Properties',
      items: [
        { label: 'Listings', icon: 'real_estate_agent', path: '/my-listings' },
        { label: 'Favorites', icon: 'favorite', path: '/favorites' },
        { label: 'Compare', icon: 'compare_arrows', path: '/compare' },
        { label: 'Owner', icon: 'home_work', path: '/owner' },
        { label: 'Areas', icon: 'map', path: '/neighborhoods' },
        { label: 'Calendar', icon: 'calendar_month', path: '/calendar' },
        { label: 'Coach', icon: 'psychology', path: '/listing-coach' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { label: 'Deals', icon: 'contract', path: '/transactions' },
        { label: 'Offers', icon: 'handshake', path: '/offer-room' },
        { label: 'Vault', icon: 'folder_managed', path: '/document-vault' },
        { label: 'Billing', icon: 'payments', path: '/billing' },
        { label: 'Revenue', icon: 'monitoring', path: '/revenue-ops' },
        { label: 'Integrations', icon: 'sync_alt', path: '/integrations' },
        { label: 'Partners', icon: 'api', path: '/partners' },
        { label: 'Security', icon: 'shield', path: '/account/security' },
      ],
    },
    {
      label: 'Platform',
      items: [
        { label: 'Agency', icon: 'business', path: '/agency/dashboard' },
        { label: 'Trust', icon: 'verified_user', path: '/agency/trust-score' },
        { label: 'Ecosystem', icon: 'hub', path: '/ecosystem' },
        { label: 'Global', icon: 'public', path: '/global' },
        { label: 'MVP', icon: 'fact_check', path: '/mvp' },
        { label: 'Infra', icon: 'rocket_launch', path: '/infrastructure' },
        { label: 'Smart', icon: 'devices_other', path: '/smart-property/devices' },
      ],
    },
  ]
  const navItems = navSections.flatMap((section) => section.items)
  const mobileNavItems = navItems.filter((item) =>
    ['/', '/explore', '/concierge', '/messages', '/profile'].includes(item.path)
  )

  const isActive = (path) =>
    location.pathname === path ||
    (path !== '/' && location.pathname.startsWith(`${path}/`)) ||
    (path === '/agency/dashboard' &&
      [
        '/agency',
        '/agency/dashboard',
        '/agency/overview',
        '/agency/team',
        '/agency/properties',
        '/agency/leads',
        '/agency/analytics',
      ].some((agencyPath) => location.pathname === agencyPath)) ||
    (path === '/ecosystem' && location.pathname.startsWith('/ecosystem')) ||
    (path === '/global' && location.pathname.startsWith('/global')) ||
    (path === '/mvp' && location.pathname.startsWith('/mvp')) ||
    (path === '/infrastructure' && location.pathname.startsWith('/infrastructure')) ||
    (path === '/neighborhoods' && location.pathname.startsWith('/neighborhoods')) ||
    (path === '/revenue-ops' && location.pathname.startsWith('/revenue-ops')) ||
    (path === '/partners' && location.pathname.startsWith('/partners')) ||
    (path === '/smart-property/devices' &&
      location.pathname.startsWith('/smart-property')) ||
    (path === '/account/security' && location.pathname.startsWith('/account'))

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-white/10 bg-[rgba(11,18,32,0.94)] px-3 pt-[calc(env(safe-area-inset-top)+1rem)] text-[#F8FAFC] shadow-[1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-2xl md:flex">
        <Link to="/" className="flex min-h-12 items-center gap-3 rounded-md px-3 py-2">
          <span className="text-2xl font-semibold tracking-normal">BaytMiftah</span>
        </Link>

        <nav className="mt-5 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-5 pr-1">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
                {section.label}
              </p>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-[0.95rem] font-semibold transition ${
                      isActive(item.path)
                        ? 'bg-[#E9C349] text-[#0F172A] shadow-[0_6px_20px_rgba(233,195,73,0.18)]'
                        : 'text-[#CBD5E1] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[1.35rem]">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 py-3">
          <button
            onClick={() => {
              localStorage.removeItem('baytmiftah_user')
              window.location.href = '/login'
            }}
            className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 font-semibold text-[#ff453a] transition hover:bg-white/10"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[rgba(11,18,32,0.94)] pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl md:hidden">
        <div className="flex min-h-16 items-center justify-around">
          {mobileNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex min-h-14 w-16 flex-col items-center justify-center rounded-md transition ${
                isActive(item.path)
                  ? 'text-[#E9C349]'
                  : 'text-[#CBD5E1] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-2xl leading-none">{item.icon}</span>
              <span className="mt-1 text-[0.68rem] font-semibold leading-none">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}

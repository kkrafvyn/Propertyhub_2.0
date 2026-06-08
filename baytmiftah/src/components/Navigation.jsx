import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const iconPaths = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  travel_explore: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M11 4a12 12 0 0 1 0 14" />
      <path d="M11 4a12 12 0 0 0 0 14" />
      <path d="M4.5 11h13" />
      <path d="m17 17 4 4" />
    </>
  ),
  support_agent: (
    <>
      <path d="M5 12a7 7 0 0 1 14 0" />
      <path d="M5 12v4a2 2 0 0 0 2 2h1v-6H5Z" />
      <path d="M19 12v4a2 2 0 0 1-2 2h-1v-6h3Z" />
      <path d="M14 20h2a3 3 0 0 0 3-3" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </>
  ),
  account_circle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="9" r="3" />
      <path d="M6.5 19a6.5 6.5 0 0 1 11 0" />
    </>
  ),
  real_estate_agent: (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M9 20v-5h6v5" />
      <path d="M8 12h2" />
      <path d="M14 12h2" />
    </>
  ),
  favorite: (
    <>
      <path d="M12 20s-7.5-4.6-8.5-10A4.4 4.4 0 0 1 12 6a4.4 4.4 0 0 1 8.5 4C19.5 15.4 12 20 12 20Z" />
    </>
  ),
  compare_arrows: (
    <>
      <path d="M7 7h11" />
      <path d="m15 4 3 3-3 3" />
      <path d="M17 17H6" />
      <path d="m9 14-3 3 3 3" />
    </>
  ),
  home_work: (
    <>
      <path d="M3.5 20.5h17" />
      <path d="M5.5 20.5v-11L12 4l6.5 5.5v11" />
      <path d="M9 20.5v-5h6v5" />
      <path d="M15.5 12h3" />
    </>
  ),
  map: (
    <>
      <path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2Z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </>
  ),
  calendar_month: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M4 10h16" />
      <path d="M8 14h2" />
      <path d="M14 14h2" />
    </>
  ),
  psychology: (
    <>
      <path d="M9 18.5a6.5 6.5 0 1 1 8-6.3" />
      <path d="M12 6v5l3 2" />
      <path d="M7 20h5" />
      <path d="M15 17h5" />
      <path d="m18 14 3 3-3 3" />
    </>
  ),
  contract: (
    <>
      <path d="M7 3.5h7l3 3V20.5H7Z" />
      <path d="M14 3.5v4h4" />
      <path d="M9.5 11h5" />
      <path d="M9.5 14h5" />
      <path d="M9.5 17h3" />
    </>
  ),
  handshake: (
    <>
      <path d="M7 13 4 10l4-4 4 4" />
      <path d="m17 13 3-3-4-4-4 4" />
      <path d="M8 14l4 4 4-4" />
      <path d="M10 12h4" />
    </>
  ),
  folder_managed: (
    <>
      <path d="M3.5 7.5h7l2 2h8v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
      <path d="M8 15.5h8" />
      <path d="m13 12.5 3 3-3 3" />
    </>
  ),
  payments: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M3.5 10h17" />
      <path d="M7 15h4" />
    </>
  ),
  monitoring: (
    <>
      <path d="M4 19h16" />
      <path d="M6 16v-4" />
      <path d="M12 16V7" />
      <path d="M18 16v-7" />
      <path d="m6 11 5-5 4 4 4-5" />
    </>
  ),
  sync_alt: (
    <>
      <path d="M7 7h12" />
      <path d="m16 4 3 3-3 3" />
      <path d="M17 17H5" />
      <path d="m8 14-3 3 3 3" />
    </>
  ),
  api: (
    <>
      <path d="M8 8 4 12l4 4" />
      <path d="m16 8 4 4-4 4" />
      <path d="m13.5 5-3 14" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
  business: (
    <>
      <rect x="5" y="5" width="14" height="15" rx="1.5" />
      <path d="M9 9h2" />
      <path d="M13 9h2" />
      <path d="M9 13h2" />
      <path d="M13 13h2" />
      <path d="M10 20v-4h4v4" />
    </>
  ),
  verified_user: (
    <>
      <path d="M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </>
  ),
  hub: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="5" cy="7" r="2" />
      <circle cx="19" cy="7" r="2" />
      <circle cx="19" cy="18" r="2" />
      <circle cx="5" cy="18" r="2" />
      <path d="m7 8 3 2" />
      <path d="m17 8-3 2" />
      <path d="m17 17-3-3" />
      <path d="m7 17 3-3" />
    </>
  ),
  public: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  fact_check: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="m8 10 1.5 1.5L12 9" />
      <path d="M14 10h3" />
      <path d="m8 15 1.5 1.5L12 14" />
      <path d="M14 15h3" />
    </>
  ),
  rocket_launch: (
    <>
      <path d="M13 4c3.5 1 5 3.5 5 7l-4 4-5-5Z" />
      <path d="M9 10 5 9l2.5-2.5" />
      <path d="m14 15 1 4 2.5-2.5" />
      <circle cx="14" cy="8" r="1.5" />
      <path d="M6 18l-2 2" />
      <path d="M8 19l-2 2" />
    </>
  ),
  devices_other: (
    <>
      <rect x="4" y="5" width="9" height="14" rx="2" />
      <rect x="15" y="9" width="5" height="10" rx="1.5" />
      <path d="M7.5 16h2" />
      <path d="M17 16h1" />
    </>
  ),
  logout: (
    <>
      <path d="M10 5H6v14h4" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </>
  ),
  menu: (
    <>
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h14" />
    </>
  ),
  chevron_left: <path d="m15 6-6 6 6 6" />,
}

function SvgIcon({ name, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-5 w-5 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {iconPaths[name] || iconPaths.home}
    </svg>
  )
}

export default function Navigation() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('baytmiftah_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    document.documentElement.dataset.sidebar = collapsed ? 'collapsed' : 'expanded'
    try {
      localStorage.setItem('baytmiftah_sidebar_collapsed', String(collapsed))
    } catch {
      // Sidebar state can stay in-memory if storage is unavailable.
    }
  }, [collapsed])

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
      <aside
        className={`fixed left-0 top-0 hidden h-screen flex-col border-r border-white/10 bg-[rgba(11,18,32,0.94)] px-3 pt-[calc(env(safe-area-inset-top)+1rem)] text-[#F8FAFC] shadow-[1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-2xl transition-[width] duration-200 md:flex ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`flex min-h-12 items-center gap-2 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <Link
            to="/"
            className={`min-h-11 items-center gap-3 rounded-md px-3 py-2 ${
              collapsed ? 'hidden' : 'flex'
            }`}
          >
            <span className="text-2xl font-semibold tracking-normal">BaytMiftah</span>
          </Link>
          <button
            onClick={() => setCollapsed((current) => !current)}
            className="flex h-11 w-11 items-center justify-center rounded-md text-[#CBD5E1] transition hover:bg-white/10 hover:text-white"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <SvgIcon
              name={collapsed ? 'menu' : 'chevron_left'}
              className={collapsed ? '' : 'transition'}
            />
          </button>
        </div>

        <nav className="mt-5 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden pb-5 pr-1">
          {navSections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
                  {section.label}
                </p>
              )}
              <div className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    aria-label={item.label}
                    className={`flex min-h-11 items-center rounded-md px-3 py-2 text-[0.95rem] font-semibold transition ${
                      collapsed ? 'justify-center' : 'gap-3'
                    } ${
                      isActive(item.path)
                        ? 'bg-[#E9C349] text-[#0F172A] shadow-[0_6px_20px_rgba(233,195,73,0.18)]'
                        : 'text-[#CBD5E1] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <SvgIcon name={item.icon} />
                    {!collapsed && <span>{item.label}</span>}
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
            className={`flex min-h-11 w-full items-center rounded-md px-3 py-2 font-semibold text-[#ff453a] transition hover:bg-white/10 ${
              collapsed ? 'justify-center' : 'gap-3'
            }`}
            title={collapsed ? 'Sign Out' : undefined}
            aria-label="Sign Out"
          >
            <SvgIcon name="logout" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

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
              <SvgIcon name={item.icon} className="h-6 w-6" />
              <span className="mt-1 text-[0.68rem] font-semibold leading-none">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}

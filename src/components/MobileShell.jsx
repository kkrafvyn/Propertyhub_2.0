import { NavLink } from 'react-router-dom'
import { LogoMark } from './Logo'
import { IconChevronLeft, IconHeart, IconHome, IconSearch } from './icons'

const tabs = [
  { to: '/m', label: 'Home', icon: IconHome, end: true },
  { to: '/m/explore', label: 'Explore', icon: IconSearch },
  { to: '/m/saved', label: 'Saved', icon: IconHeart },
  { to: '/m/messages', label: 'Messages', icon: MessageIcon },
  { to: '/m/profile', label: 'Profile', icon: ProfileIcon },
]

function MessageIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <path d="M4 5h16v10H7l-3 3V5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

function ProfileIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export default function MobileShell({ children, hideNav = false }) {
  return (
    <div className="min-h-screen bg-surface-subtle pb-20 text-ink">
      <div className="mx-auto max-w-lg">{children}</div>
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-surface-border bg-surface shadow-[0_-4px_20px_rgba(5,20,36,0.08)]">
          <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold ${
                    isActive ? 'text-brand-dark' : 'text-ink-secondary'
                  }`
                }
              >
                <Icon className="h-6 w-6" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

export function MobileHeader({ title, subtitle, backTo }) {
  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-surface px-4 py-4">
      <div className="flex items-center gap-2">
        {backTo ? (
          <NavLink to={backTo} className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-dark" aria-label="Go back">
            <IconChevronLeft />
          </NavLink>
        ) : (
          <LogoMark className="h-8 w-8" />
        )}
        <div>
          <h1 className="text-lg font-bold text-brand-dark">{title}</h1>
          {subtitle && <p className="text-xs text-ink-secondary">{subtitle}</p>}
        </div>
      </div>
    </header>
  )
}

export function MobileSearchBar({ value, onChange, placeholder = 'Search Accra neighborhoods' }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 shadow-search">
        <IconSearch className="h-5 w-5 shrink-0 text-brand-dark" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-muted"
        />
      </div>
    </div>
  )
}

export function MobileCategoryChips({ options, active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3">
      {options.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
            active === id ? 'bg-brand-dark text-brand' : 'bg-surface text-ink-secondary shadow-sm'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

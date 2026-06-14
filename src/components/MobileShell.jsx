import { Link, NavLink } from 'react-router-dom'
import Logo from './Logo'
import PushPrompt from './PushPrompt'
import { IconChevronLeft, IconHome } from './icons'
import { IconSearch } from './icons'
import { useTranslation } from '../i18n/LocaleContext'

function MessageIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <path d="M4 5h16v10H7l-3 3V5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

function AgentsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 20c0-3 2.5-5 6-5M14 20c0-2.2 1.8-4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
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
  const { t } = useTranslation()

  const tabs = [
    { to: '/m', label: t('mobile.home'), icon: IconHome, end: true },
    { to: '/m/explore', label: t('mobile.search'), icon: IconSearch },
    { to: '/m/messages', label: t('mobile.inbox'), icon: MessageIcon },
    { to: '/m/agent', label: t('mobile.agents'), icon: AgentsIcon },
    { to: '/m/profile', label: t('mobile.profile'), icon: ProfileIcon },
  ]

  return (
    <div className="mobile-bolt min-h-screen bg-white pb-[72px] text-ink">
      <div className="mx-auto max-w-lg">{children}</div>
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/5 bg-white shadow-bolt-nav">
          <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium transition ${
                    isActive ? 'font-semibold text-brand-forest' : 'text-ink-secondary'
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
      <PushPrompt />
    </div>
  )
}

export function MobileBoltHomeHeader({ title, tagline }) {
  return (
    <header className="sticky top-0 z-40 bg-white px-4 pb-3 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
          {tagline && <p className="mt-0.5 text-sm text-ink-secondary">{tagline}</p>}
        </div>
        <Link
          to="/m/profile"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-ink"
          aria-label="Profile"
        >
          <ProfileIcon className="h-5 w-5" />
        </Link>
      </div>
    </header>
  )
}

export function MobileHeader({ title, subtitle, backTo, showLogo = false }) {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        {backTo ? (
          <NavLink
            to={backTo}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F5] text-ink"
            aria-label={t('mobile.goBack')}
          >
            <IconChevronLeft className="h-5 w-5 rtl-flip" />
          </NavLink>
        ) : showLogo ? (
          <Logo size="sm" showText={false} to="/m" />
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-ink">{title}</h1>
          {subtitle && <p className="truncate text-xs text-ink-secondary">{subtitle}</p>}
        </div>
      </div>
    </header>
  )
}

export function MobileSearchBar({ value, onChange, placeholder }) {
  const { t } = useTranslation()

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3 rounded-xl bg-[#F5F5F5] px-4 py-3.5">
        <IconSearch className="h-4 w-4 shrink-0 text-ink-secondary" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? t('mobile.searchListings')}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-secondary"
        />
      </div>
    </div>
  )
}

export function MobileCategoryChips({ options, active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map(({ id, label }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
              isActive
                ? 'bg-brand-forest text-white shadow-sm'
                : 'border border-black/10 bg-white text-ink-secondary'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function MobileFiltersRow({ onFiltersClick }) {
  const { t } = useTranslation()

  return (
    <div className="flex gap-2 px-4 pb-3">
      <button
        type="button"
        onClick={onFiltersClick}
        className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-ink"
      >
        {t('mobile.filters')}
      </button>
    </div>
  )
}

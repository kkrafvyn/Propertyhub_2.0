import { Link } from 'react-router-dom'
import UserMenu from './UserMenu'
import Logo from './Logo'
import { IconGlobe, IconSearch } from './icons'

export function SearchPill({ location, onLocationChange, propertyType, onTypeChange }) {
  return (
    <div className="search-pill w-full max-w-[850px]">
      <div className="search-segment rounded-l-full">
        <label htmlFor="search-location" className="text-xs font-semibold text-ink">
          Location
        </label>
        <input
          id="search-location"
          type="text"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder="Search destinations"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
        />
      </div>

      <div className="h-8 w-px bg-surface-border" />

      <div className="search-segment">
        <label htmlFor="search-type" className="text-xs font-semibold text-ink">
          Property type
        </label>
        <select
          id="search-type"
          value={propertyType}
          onChange={(e) => onTypeChange(e.target.value)}
          className="w-full cursor-pointer bg-transparent text-sm text-ink outline-none"
        >
          <option value="any">Any type</option>
          <option value="apartment">Apartments</option>
          <option value="house">Houses</option>
          <option value="office">Commercial</option>
        </select>
      </div>

      <div className="h-8 w-px bg-surface-border" />

      <div className="search-segment">
        <span className="text-xs font-semibold text-ink">Price</span>
        <span className="text-sm text-ink-secondary">Add budget</span>
      </div>

      <button
        type="button"
        className="mr-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-dark text-brand transition hover:bg-ink"
        aria-label="Search"
      >
        <IconSearch className="h-4 w-4" />
      </button>
    </div>
  )
}

export function CompactSearch() {
  return (
    <Link to="/" className="search-pill w-full max-w-sm px-4 py-2.5">
      <div className="flex flex-1 items-center gap-2 text-sm">
        <span className="font-semibold text-ink">Anywhere</span>
        <span className="text-ink-muted">·</span>
        <span className="text-ink-secondary">Any type</span>
        <span className="text-ink-muted">·</span>
        <span className="text-ink-secondary">Add filters</span>
      </div>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-dark text-brand">
        <IconSearch className="h-3.5 w-3.5" />
      </span>
    </Link>
  )
}

function Header({ search, minimal = false, compareCount = 0 }) {
  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-surface shadow-header">
      <div className="mx-auto flex max-w-page items-center gap-6 px-6 py-4 lg:px-10">
        <Logo />
        {!minimal && <div className="flex flex-1 justify-center">{search}</div>}
        <div className={`flex shrink-0 items-center gap-2 ${minimal ? 'ml-auto' : ''}`}>
          {!minimal && (
            <>
              <Link to="/compare" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink hover:bg-surface-subtle lg:block">
                Compare{compareCount > 0 ? ` (${compareCount})` : ''}
              </Link>
              <Link to="/buyer" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink hover:bg-surface-subtle lg:block">
                Buyer
              </Link>
              <Link to="/agent" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink hover:bg-surface-subtle lg:block">
                Agent
              </Link>
            </>
          )}
          <Link
            to="/host"
            className="hidden rounded-full px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-subtle lg:block"
          >
            List your property
          </Link>
          <button
            type="button"
            className="hidden rounded-full p-3 transition hover:bg-surface-subtle lg:block"
            aria-label="Language and region"
          >
            <IconGlobe className="h-4 w-4" />
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-surface-border bg-surface-subtle">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm text-ink-secondary lg:px-10">
        <p>© {new Date().getFullYear()} BaytMiftah · Accra, Ghana</p>
        <div className="flex gap-6">
          <a href="#" className="underline hover:text-ink">Privacy</a>
          <a href="#" className="underline hover:text-ink">Terms</a>
          <a href="#" className="underline hover:text-ink">Support</a>
        </div>
      </div>
    </footer>
  )
}

export default function DesktopShell({ children, search, minimal = false, compareCount = 0 }) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <Header search={search} minimal={minimal} compareCount={compareCount} />
      <main className="mx-auto w-full max-w-page flex-1 px-6 py-8 lg:px-10">{children}</main>
      <Footer />
    </div>
  )
}

import { Link } from 'react-router-dom'
import UserMenu from './UserMenu'
import Logo from './Logo'
import LanguageSwitcher from './LanguageSwitcher'
import { IconSearch } from './icons'
import { useTranslation } from '../i18n/LocaleContext'

export function SearchPill({
  location,
  onLocationChange,
  propertyType,
  onTypeChange,
  budget = '',
  onBudgetChange,
}) {
  const { t } = useTranslation()

  return (
    <div className="search-pill max-w-[850px]">
      <div className="search-segment rounded-l-full">
        <label htmlFor="search-location" className="search-segment-label">
          {t('search.where')}
        </label>
        <input
          id="search-location"
          type="text"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder={t('search.searchDestinations')}
          className="search-segment-value"
        />
      </div>

      <div className="h-8 w-px shrink-0 bg-surface-border" />

      <div className="search-segment">
        <label htmlFor="search-type" className="search-segment-label">
          {t('search.type')}
        </label>
        <select
          id="search-type"
          value={propertyType}
          onChange={(e) => onTypeChange(e.target.value)}
          className="search-segment-value cursor-pointer"
        >
          <option value="any">{t('search.anyType')}</option>
          <option value="apartment">{t('search.apartments')}</option>
          <option value="house">{t('search.houses')}</option>
          <option value="office">{t('search.commercial')}</option>
        </select>
      </div>

      <div className="h-8 w-px shrink-0 bg-surface-border" />

      <div className="search-segment">
        <label htmlFor="search-budget" className="search-segment-label">
          {t('search.budget')}
        </label>
        {onBudgetChange ? (
          <input
            id="search-budget"
            type="text"
            value={budget}
            onChange={(e) => onBudgetChange(e.target.value)}
            placeholder={t('search.addBudget')}
            className="search-segment-value"
          />
        ) : (
          <span className="search-segment-value text-ink-secondary">{t('search.addBudget')}</span>
        )}
      </div>

      <button type="button" className="search-orb" aria-label={t('search.search')}>
        <IconSearch className="h-4 w-4" />
      </button>
    </div>
  )
}

export function CompactSearch() {
  const { t } = useTranslation()

  return (
    <Link
      to="/"
      className="flex max-w-[360px] items-center gap-3 rounded-full border border-surface-border bg-surface py-2 pl-6 pr-2 shadow-search transition hover:shadow-search-hover"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm">
        <span className="font-semibold text-ink">{t('search.anywhere')}</span>
        <span className="text-ink-muted">·</span>
        <span className="text-ink-secondary">{t('search.anyType')}</span>
        <span className="text-ink-muted">·</span>
        <span className="text-ink-secondary">{t('search.addBudget')}</span>
      </div>
      <span className="search-orb mr-0 h-8 w-8">
        <IconSearch className="h-3.5 w-3.5" />
      </span>
    </Link>
  )
}

function Header({ search, minimal = false, categoryBar = null, compareCount = 0 }) {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-surface">
      <div className="mx-auto max-w-page px-6 xl:px-20">
        <div className={`flex items-center gap-4 ${minimal ? 'h-[72px]' : 'h-[80px]'}`}>
          <Logo />

          {!minimal && (
            <div className="hidden flex-1 justify-center px-4 md:flex">
              {search}
            </div>
          )}

          <div className={`flex shrink-0 items-center gap-1 ${minimal ? 'ml-auto' : ''}`}>
            {!minimal && (
              <>
                <Link to="/compare" className="nav-pill hidden lg:inline-flex">
                  {t('nav.compare')}{compareCount > 0 ? ` (${compareCount})` : ''}
                </Link>
                <Link to="/saved" className="nav-pill hidden lg:inline-flex">
                  {t('nav.saved')}
                </Link>
              </>
            )}
            <Link to="/host" className="nav-pill hidden font-semibold lg:inline-flex">
              {t('nav.listProperty')}
            </Link>
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </div>

        {!minimal && categoryBar && (
          <div className="border-t border-surface-border pb-4 pt-2">
            {categoryBar}
          </div>
        )}
      </div>
    </header>
  )
}

function Footer() {
  const { t, locale } = useTranslation()
  const current = { en: 'English', ar: 'العربية', fr: 'Français', es: 'Español', pt: 'Português' }[locale] ?? 'English'

  const columns = [
    {
      title: t('footer.support'),
      links: [t('footer.helpCentre'), t('footer.safety'), t('footer.cancellation')],
    },
    {
      title: t('footer.hosting'),
      links: [t('nav.listProperty'), t('footer.hostResources'), t('footer.communityForum')],
    },
    {
      title: t('footer.company'),
      links: [t('footer.about'), t('footer.newsroom'), t('footer.careers')],
    },
  ]

  return (
    <footer className="mt-12 border-t border-surface-border bg-surface-subtle">
      <div className="mx-auto max-w-page px-6 py-12 xl:px-20">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map(({ title, links }) => (
            <div key={title}>
              <h3 className="mb-4 text-sm font-semibold text-ink">{title}</h3>
              <ul className="space-y-3">
                {links.map((label) => (
                  <li key={label}>
                    <a href="#" className="text-sm text-ink-secondary hover:underline">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-ink">{t('footer.legal')}</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-ink-secondary hover:underline">{t('footer.privacy')}</a></li>
              <li><a href="#" className="text-sm text-ink-secondary hover:underline">{t('footer.terms')}</a></li>
              <li><a href="#" className="text-sm text-ink-secondary hover:underline">{t('footer.sitemap')}</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-surface-border pt-6 text-sm text-ink-secondary">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-4">
            <LanguageSwitcher variant="compact" className="min-w-[140px]" />
            <span>{current}</span>
            <span>{t('footer.currency')}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function DesktopShell({
  children,
  search,
  categoryBar = null,
  minimal = false,
  compareCount = 0,
  fullBleed = false,
}) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <Header
        search={search}
        minimal={minimal}
        categoryBar={categoryBar}
        compareCount={compareCount}
      />
      <main
        className={
          fullBleed
            ? 'w-full'
            : 'mx-auto w-full max-w-page px-6 py-6 xl:px-20 xl:py-8'
        }
      >
        {children}
      </main>
      {!minimal && <Footer />}
    </div>
  )
}

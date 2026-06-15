import { Link } from 'react-router-dom'

import UserMenu from './UserMenu'

import Logo from './Logo'

import LanguageSwitcher from './LanguageSwitcher'

import NotificationBell from './NotificationBell'

import PushPrompt from './PushPrompt'

import { useCurrency } from '../context/CurrencyContext'

import { useTheme } from '../context/ThemeContext'

import { IconCard, IconHome, IconPin, IconSearch, IconSun, IconMoon } from './icons'

import { getLocaleMeta } from '../i18n'

import { useTranslation } from '../i18n/LocaleContext'



function SearchSegment({ icon: Icon, label, htmlFor, children, className = '' }) {

  return (

    <div className={`search-segment search-segment-icon ${className}`}>

      <Icon className="search-segment-icon-svg h-5 w-5 shrink-0" aria-hidden="true" />

      <div className="min-w-0 flex-1">

        <label htmlFor={htmlFor} className="search-segment-label">

          {label}

        </label>

        {children}

      </div>

    </div>

  )

}



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

    <div className="search-pill min-w-0 w-full max-w-full">

      <SearchSegment icon={IconPin} label={t('search.where')} htmlFor="search-location">

        <input

          id="search-location"

          type="text"

          value={location}

          onChange={(e) => onLocationChange(e.target.value)}

          placeholder={t('search.searchLocation')}

          className="search-segment-value"

        />

      </SearchSegment>



      <div className="search-divider" />



      <SearchSegment icon={IconHome} label={t('search.type')} htmlFor="search-type">

        <select

          id="search-type"

          value={propertyType}

          onChange={(e) => onTypeChange(e.target.value)}

          className="search-segment-value cursor-pointer"

        >

          <option value="any">{t('search.any')}</option>

          <option value="apartment">{t('search.apartments')}</option>

          <option value="house">{t('search.houses')}</option>

          <option value="office">{t('search.commercial')}</option>

        </select>

      </SearchSegment>



      <div className="search-divider hidden xl:block" />



      <SearchSegment icon={IconCard} label={t('search.budget')} htmlFor="search-budget" className="hidden xl:flex">

        <input

          id="search-budget"

          type="text"

          value={budget}

          onChange={(e) => onBudgetChange?.(e.target.value)}

          placeholder={t('search.any')}

          className="search-segment-value"

        />

      </SearchSegment>



      <button type="button" className="search-orb shrink-0" aria-label={t('search.search')}>

        <IconSearch className="h-5 w-5" />

      </button>

    </div>

  )

}



export function CompactSearch() {

  const { t } = useTranslation()



  return (

    <Link to="/" className="compact-search-pill">

      <div className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm">

        <span className="font-semibold text-ink">{t('search.anywhere')}</span>

        <span className="text-ink-muted">·</span>

        <span className="text-ink-secondary">{t('search.anyType')}</span>

        <span className="text-ink-muted">·</span>

        <span className="text-ink-secondary">{t('search.any')}</span>

      </div>

      <span className="search-orb mr-0 h-9 w-9">

        <IconSearch className="h-4 w-4" />

      </span>

    </Link>

  )

}



function Header({ search, minimal = false, categoryBar = null, compareCount = 0 }) {

  const { t } = useTranslation()

  const { theme, toggleTheme } = useTheme()



  return (

    <header className="desktop-header sticky top-0 z-50">

      <div className="mx-auto w-full min-w-0 max-w-page px-4 sm:px-6 xl:px-20">

        <div className={`flex min-w-0 items-center gap-3 sm:gap-4 ${minimal ? 'h-[72px]' : 'h-[72px] xl:h-[76px]'}`}>

          <Logo inverted />



          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">

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

            {!minimal && <NotificationBell />}

            <button type="button" onClick={toggleTheme} className="nav-pill hidden lg:inline-flex" aria-label="Toggle theme">

              {theme === 'dark' ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}

            </button>

            <UserMenu />

          </div>

        </div>



        {!minimal && search && (

          <div className="flex justify-center pb-5 pt-1">

            <div className="w-full max-w-[920px]">{search}</div>

          </div>

        )}



        {!minimal && categoryBar && (

          <div className="desktop-category-row border-t border-white/10 pb-4 pt-3">

            {categoryBar}

          </div>

        )}

      </div>

    </header>

  )

}



function Footer() {

  const { t, locale } = useTranslation()

  const { currency, setCurrency } = useCurrency()

  const current = getLocaleMeta(locale).label



  const columns = [

    {

      title: t('footer.support'),

      links: [

        { label: t('footer.helpCentre'), to: '/help' },

        { label: t('footer.safety'), to: '/help#safety' },

        { label: t('footer.cancellation'), to: '/help' },

      ],

    },

    {

      title: t('footer.hosting'),

      links: [

        { label: t('nav.listProperty'), to: '/host' },

        { label: t('footer.hostResources'), to: '/help#listings' },

        { label: t('referral.title'), to: '/referral' },

      ],

    },

    {

      title: t('footer.company'),

      links: [

        { label: t('footer.about'), to: '/help' },

        { label: t('footer.newsroom'), to: '/help' },

        { label: t('footer.careers'), to: '/help' },

      ],

    },

  ]



  return (

    <footer className="desktop-footer mt-12 border-t border-white/10">

      <div className="mx-auto max-w-page px-4 py-12 sm:px-6 xl:px-20">

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

          {columns.map(({ title, links }) => (

            <div key={title}>

              <h3 className="mb-4 text-sm font-semibold text-ink">{title}</h3>

              <ul className="space-y-3">

                {links.map(({ label, to }) => (

                  <li key={label}>

                    <Link to={to} className="text-sm text-ink-secondary hover:text-ink hover:underline">

                      {label}

                    </Link>

                  </li>

                ))}

              </ul>

            </div>

          ))}

          <div>

            <h3 className="mb-4 text-sm font-semibold text-ink">{t('footer.legal')}</h3>

            <ul className="space-y-3">

              <li><Link to="/privacy" className="text-sm text-ink-secondary hover:text-ink hover:underline">{t('footer.privacy')}</Link></li>

              <li><Link to="/terms" className="text-sm text-ink-secondary hover:text-ink hover:underline">{t('footer.terms')}</Link></li>

              <li><a href="#" className="text-sm text-ink-secondary hover:text-ink hover:underline">{t('footer.sitemap')}</a></li>

            </ul>

          </div>

        </div>



        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-ink-secondary">

          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>

          <div className="flex items-center gap-4">

            <LanguageSwitcher variant="compact" className="min-w-[140px]" />

            <select

              value={currency}

              onChange={(e) => setCurrency(e.target.value)}

              className="desktop-select rounded-lg px-2 py-1 text-sm"

              aria-label="Currency"

            >

              <option value="GHS">₵ GHS</option>

              <option value="USD">$ USD</option>

            </select>

            <span>{current}</span>

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

    <div className="desktop-shell min-h-screen min-h-[100dvh] overflow-x-clip text-ink">

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

            : 'mx-auto w-full min-w-0 max-w-page px-4 py-6 sm:px-6 xl:px-20 xl:py-8'

        }

      >

        {children}

      </main>

      {!minimal && <Footer />}

      <PushPrompt />

    </div>

  )

}



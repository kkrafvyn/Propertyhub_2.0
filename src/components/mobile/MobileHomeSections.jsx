import { Link } from 'react-router-dom'
import NotificationBell from '../NotificationBell'
import { IconHeart } from '../icons'
import { useTranslation } from '../../i18n/LocaleContext'

function ProfileAvatar({ to = '/m/profile' }) {
  return (
    <Link
      to={to}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-forest/10 text-brand-forest"
      aria-label="Profile"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75" />
        <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    </Link>
  )
}

export function MobileReferenceHeader() {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-white px-4 pb-3 pt-4">
      <div className="flex min-w-0 items-center gap-3">
        <ProfileAvatar />
        <h1 className="truncate text-xl font-bold text-ink">BaytMiftah</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          to="/m/saved"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-[#F5F5F5]"
          aria-label={t('mobile.saved')}
        >
          <IconHeart className="h-5 w-5" />
        </Link>
        <div className="relative">
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80'

export function MobileHeroBanner() {
  const { t } = useTranslation()

  return (
    <section className="relative mx-4 mb-5 overflow-hidden rounded-2xl">
      <img src={HERO_IMAGE} alt="" className="h-[200px] w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <h2 className="text-[22px] font-bold leading-tight text-white">
          {t('mobile.homeScreen.heroTitle')}
        </h2>
        <p className="mt-1.5 text-sm leading-snug text-white/90">
          {t('mobile.homeScreen.heroSubtitle')}
        </p>
      </div>
    </section>
  )
}

const TX_TABS = ['buy', 'rent', 'lease', 'stay']

export function MobileTransactionTabs({ active, onChange }) {
  const { t } = useTranslation()

  return (
    <div className="mb-4 grid grid-cols-4 gap-2 px-4">
      {TX_TABS.map((id) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex min-w-0 items-center justify-center gap-1 rounded-full px-2 py-2.5 text-sm font-semibold transition ${
              isActive
                ? 'bg-brand-forest text-white shadow-sm'
                : 'bg-[#F5F5F5] text-ink-secondary'
            }`}
          >
            {id === 'stay' && (
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
              </svg>
            )}
            <span className="truncate">{t(`mobile.homeScreen.${id}`)}</span>
          </button>
        )
      })}
    </div>
  )
}

const PROPERTY_TYPES = [
  { id: 'apartment', labelKey: 'categories.apartment', emoji: '🏢', bg: 'bg-blue-50' },
  { id: 'house', labelKey: 'categories.house', emoji: '🏠', bg: 'bg-green-50' },
  { id: 'townhouse', labelKey: 'mobile.homeScreen.townhouses', emoji: '🏘️', bg: 'bg-orange-50' },
  { id: 'office', labelKey: 'categories.office', emoji: '🏛️', bg: 'bg-purple-50' },
  { id: 'land', labelKey: 'mobile.homeScreen.land', emoji: '🌳', bg: 'bg-emerald-50' },
  { id: 'shortStay', labelKey: 'mobile.homeScreen.shortStay', emoji: '🛏️', bg: 'bg-rose-50' },
]

export function MobilePropertyTypeRow({ active, onChange }) {
  const { t } = useTranslation()

  return (
    <div className="mb-6 flex gap-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {PROPERTY_TYPES.map(({ id, labelKey, emoji, bg }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(isActive ? null : id)}
            className="flex w-[72px] shrink-0 flex-col items-center gap-2"
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition ${
                isActive ? 'ring-2 ring-brand-forest ring-offset-2' : ''
              } ${bg}`}
            >
              {emoji}
            </span>
            <span className={`text-center text-[11px] font-medium leading-tight ${isActive ? 'text-brand-forest' : 'text-ink-secondary'}`}>
              {t(labelKey)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function MobileCarouselSection({ title, seeAllTo, children }) {
  const { t } = useTranslation()

  return (
    <section className="mb-7">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="text-[17px] font-bold text-ink">{title}</h2>
        {seeAllTo && (
          <Link to={seeAllTo} className="text-sm font-semibold text-brand-forest">
            {t('mobile.homeScreen.seeAll')}
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  )
}

export function MobileHomeListingCard({ listing, to, badge, saved, onToggleSave }) {
  return (
    <div className="relative w-[260px] shrink-0">
      <Link to={to} className="block overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <div className="relative aspect-[4/3]">
          <img src={listing.image} alt="" className="h-full w-full object-cover" />
          {badge && (
            <span
              className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white ${
                badge.tone === 'blue' ? 'bg-blue-500' : 'bg-brand-forest'
              }`}
            >
              {badge.label}
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="truncate font-bold text-ink">{listing.title}</p>
          <p className="mt-1 text-sm font-bold text-brand-forest">{listing.priceLabel}</p>
        </div>
      </Link>
      {onToggleSave && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onToggleSave(listing.id)
          }}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm"
          aria-label="Save"
        >
          <IconHeart className={`h-4 w-4 ${saved ? 'text-brand-accent' : 'text-ink'}`} filled={saved} />
        </button>
      )}
    </div>
  )
}

const PROMO_GRADIENTS = [
  'from-emerald-700 to-emerald-900',
  'from-slate-700 to-slate-900',
  'from-teal-700 to-teal-900',
]

export function MobilePromoCard({ title, subtitle, to, index = 0 }) {
  return (
    <Link
      to={to}
      className={`relative flex h-[160px] w-[130px] shrink-0 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br p-3 text-white ${PROMO_GRADIENTS[index % PROMO_GRADIENTS.length]}`}
    >
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative">
        <p className="text-sm font-bold leading-tight">{title}</p>
        <p className="mt-2 text-[11px] font-semibold text-white/90">{subtitle}</p>
      </div>
    </Link>
  )
}

const AREA_IMAGES = {
  cantonments: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80',
  'east-legon': 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=600&q=80',
  'airport-residential': 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=600&q=80',
  labone: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=80',
}

export function MobileAreaCard({ area, count, to }) {
  const { t } = useTranslation()
  const image = AREA_IMAGES[area.slug] || AREA_IMAGES.cantonments

  return (
    <Link to={to} className="relative h-[120px] w-[140px] shrink-0 overflow-hidden rounded-2xl">
      <img src={image} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="text-sm font-bold text-white">{area.name}</p>
        <p className="text-[11px] text-white/85">
          {t('mobile.homeScreen.propertiesCount', { count })}
        </p>
      </div>
    </Link>
  )
}

export function filterHomeListings(listings, txTab, propType) {
  return listings.filter((l) => {
    const matchTx =
      txTab === 'buy' ? l.listingType === 'sale'
      : txTab === 'rent' ? l.listingType === 'rent'
      : txTab === 'lease' ? l.listingType === 'lease'
      : txTab === 'stay' ? l.listingType === 'rent' || l.instantBook
      : true

    const matchType =
      !propType ? true
      : propType === 'townhouse' ? l.type === 'house'
      : propType === 'shortStay' ? l.instantBook || l.listingType === 'rent'
      : propType === 'land' ? l.type === 'land'
      : l.type === propType

    return matchTx && matchType
  })
}

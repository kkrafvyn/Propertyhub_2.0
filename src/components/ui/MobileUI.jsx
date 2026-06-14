import { Link } from 'react-router-dom'
import { useTranslation } from '../../i18n/LocaleContext'

export function MobileCard({ children, className = '', as: Tag = 'div', ...props }) {
  return (
    <Tag className={`rounded-2xl bg-bolt-card p-4 shadow-bolt-card ${className}`} {...props}>
      {children}
    </Tag>
  )
}

export function MobileStat({ label, value }) {
  return (
    <MobileCard>
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="mt-1 text-lg font-bold text-ink">{value}</p>
    </MobileCard>
  )
}

export function MobilePrimaryButton({ children, className = '', as: Tag = 'button', ...props }) {
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-xl bg-brand-forest px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function MobileSecondaryButton({ children, className = '', as: Tag = 'button', ...props }) {
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-xl border border-black/10 bg-bolt-card px-5 py-3 text-sm font-semibold text-ink ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function MobileLinkRow({ to, children }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-2xl bg-bolt-card px-4 py-4 font-semibold text-ink shadow-bolt-card"
    >
      {children}
      <span className="text-ink-muted">›</span>
    </Link>
  )
}

export function MobileBadge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-bolt-bg text-ink',
    accent: 'bg-brand-forest/10 text-brand-forest',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  )
}

export function MobileEmpty({ title, description }) {
  return (
    <div className="rounded-2xl bg-bolt-card px-6 py-12 text-center shadow-bolt-card">
      <p className="font-bold text-ink">{title}</p>
      {description && <p className="mt-2 text-sm text-ink-secondary">{description}</p>}
    </div>
  )
}

export function MobileSectionTitle({ children }) {
  return <h2 className="text-[20px] font-bold tracking-tight text-ink">{children}</h2>
}

export function MobileTextLink({ to, children, className = '' }) {
  return (
    <Link to={to} className={`text-sm font-semibold text-brand-forest ${className}`}>
      {children}
    </Link>
  )
}

function listingMeta(listing, t) {
  const parts = []
  if (listing.rating > 0) parts.push(`★ ${listing.rating.toFixed(1)}`)
  if (listing.bedrooms > 0) parts.push(`${listing.bedrooms} bed`)
  if (listing.type) parts.push(t(`categories.${listing.type}`))
  return parts.join(' · ')
}

export function MobileBoltListingCard({ listing, to }) {
  const { t } = useTranslation()
  const meta = listingMeta(listing, t)

  return (
    <Link to={to} className="flex gap-3 rounded-2xl bg-bolt-card p-3 shadow-bolt-card transition active:scale-[0.99]">
      <img src={listing.image} alt="" className="h-[88px] w-[88px] shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1 py-0.5">
        <p className="truncate text-[15px] font-bold text-ink">{listing.title}</p>
        {meta && <p className="mt-0.5 truncate text-sm text-ink-secondary">{meta}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-ink">{listing.priceLabel}</p>
          {listing.verified && (
            <MobileBadge tone="accent">{t('categories.verified')}</MobileBadge>
          )}
        </div>
      </div>
    </Link>
  )
}

export function MobileBoltListingTile({ listing, to }) {
  const { t } = useTranslation()
  const meta = listingMeta(listing, t)

  return (
    <Link to={to} className="overflow-hidden rounded-2xl bg-bolt-card shadow-bolt-card">
      <img src={listing.image} alt="" className="aspect-[4/3] w-full object-cover" />
      <div className="p-3">
        <p className="truncate text-sm font-bold text-ink">{listing.title}</p>
        {meta && <p className="mt-0.5 truncate text-xs text-ink-secondary">{meta}</p>}
        <p className="mt-1 text-sm font-bold text-ink">{listing.priceLabel}</p>
      </div>
    </Link>
  )
}

export function MobileListingRow({ listing, to, hideLocation = false }) {
  if (hideLocation) {
    return <MobileBoltListingCard listing={listing} to={to} />
  }

  return (
    <Link to={to} className="flex gap-3 rounded-2xl bg-bolt-card p-3 shadow-bolt-card">
      <img src={listing.image} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-ink">{listing.title}</p>
        <p className="truncate text-sm text-ink-secondary">{listing.location}</p>
        <p className="mt-1 text-sm font-bold text-ink">{listing.priceLabel}</p>
      </div>
    </Link>
  )
}

export function MobileListingTile({ listing, to }) {
  return <MobileBoltListingTile listing={listing} to={to} />
}

export function MobileHubTile({ to, label, Icon }) {
  return (
    <Link to={to} className="rounded-2xl bg-bolt-card p-4 shadow-bolt-card">
      <Icon className="h-7 w-7 text-brand-forest" />
      <p className="mt-2 font-bold text-ink">{label}</p>
    </Link>
  )
}

import { Link } from 'react-router-dom'

export function MobileCard({ children, className = '', as: Tag = 'div', ...props }) {
  return (
    <Tag className={`rounded-xl border border-surface-border bg-surface p-4 shadow-sm ${className}`} {...props}>
      {children}
    </Tag>
  )
}

export function MobileStat({ label, value }) {
  return (
    <MobileCard>
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </MobileCard>
  )
}

export function MobilePrimaryButton({ children, className = '', as: Tag = 'button', ...props }) {
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-xl bg-brand-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function MobileSecondaryButton({ children, className = '', as: Tag = 'button', ...props }) {
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-xl border border-ink px-5 py-3 text-sm font-semibold text-ink ${className}`}
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
      className="flex items-center justify-between rounded-xl border border-surface-border bg-surface px-4 py-4 font-medium text-ink shadow-sm"
    >
      {children}
      <span className="text-ink-muted">›</span>
    </Link>
  )
}

export function MobileBadge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-surface-hover text-ink',
    accent: 'bg-brand-accent/10 text-brand-accent',
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
    <div className="rounded-xl border border-surface-border bg-surface px-6 py-12 text-center shadow-sm">
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="mt-2 text-sm text-ink-secondary">{description}</p>}
    </div>
  )
}

export function MobileSectionTitle({ children }) {
  return <h2 className="text-[17px] font-semibold tracking-tight text-ink">{children}</h2>
}

export function MobileTextLink({ to, children, className = '' }) {
  return (
    <Link to={to} className={`text-sm font-semibold text-ink underline ${className}`}>
      {children}
    </Link>
  )
}

export function MobileListingRow({ listing, to }) {
  return (
    <Link to={to} className="flex gap-3 rounded-xl border border-surface-border bg-surface p-3 shadow-sm">
      <img src={listing.image} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{listing.title}</p>
        <p className="truncate text-sm text-ink-secondary">{listing.location}</p>
        <p className="mt-1 text-sm font-semibold text-ink">{listing.priceLabel}</p>
      </div>
    </Link>
  )
}

export function MobileListingTile({ listing, to }) {
  return (
    <Link to={to} className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm">
      <img src={listing.image} alt="" className="aspect-square w-full object-cover" />
      <div className="p-2.5">
        <p className="truncate text-sm font-semibold text-ink">{listing.title}</p>
        <p className="text-xs font-semibold text-ink">{listing.priceLabel}</p>
      </div>
    </Link>
  )
}

export function MobileHubTile({ to, label, Icon }) {
  return (
    <Link to={to} className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
      <Icon className="h-7 w-7 text-ink" />
      <p className="mt-2 font-semibold text-ink">{label}</p>
    </Link>
  )
}

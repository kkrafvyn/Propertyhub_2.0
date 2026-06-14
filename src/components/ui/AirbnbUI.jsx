import { Link } from 'react-router-dom'

export const inputClass =
  'w-full rounded-lg border border-surface-border px-4 py-3 text-sm text-ink outline-none transition focus:border-ink'

export const selectClass =
  'w-full rounded-lg border border-surface-border px-4 py-3 text-sm text-ink outline-none transition focus:border-ink'

export function PageTitle({ title, subtitle, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-surface-border pb-6">
      <div>
        {title && <h1 className="section-heading">{title}</h1>}
        {subtitle && <p className="mt-2 text-base text-ink-secondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({ label, value, hint }) {
  return (
    <div className="panel-card p-5">
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-secondary">{hint}</p>}
    </div>
  )
}

export function StatGrid({ children, cols = 4 }) {
  const colClass = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  }[cols] || 'sm:grid-cols-2 lg:grid-cols-4'

  return <div className={`mb-8 grid gap-4 ${colClass}`}>{children}</div>
}

export function PanelCard({ title, children, footer, className = '' }) {
  return (
    <div className={`panel-card overflow-hidden ${className}`}>
      {title && (
        <div className="border-b border-surface-border px-5 py-4">
          <h3 className="font-semibold text-ink">{title}</h3>
        </div>
      )}
      <div className={title || footer ? 'p-5' : ''}>{children}</div>
      {footer && <div className="border-t border-surface-border px-5 py-4">{footer}</div>}
    </div>
  )
}

export function ItemCard({ children, className = '' }) {
  return (
    <article className={`panel-card p-4 ${className}`}>
      {children}
    </article>
  )
}

export function HubLinkCard({ to, label, desc }) {
  return (
    <Link to={to} className="hub-link-card group">
      <p className="font-semibold text-ink group-hover:underline">{label}</p>
      {desc && <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{desc}</p>}
    </Link>
  )
}

export function HubLinkGrid({ links }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {links.map((item) => (
        <HubLinkCard key={item.to} {...item} />
      ))}
    </div>
  )
}

export function DataRow({ primary, secondary, meta, action }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-surface-border py-3.5 text-sm last:border-0">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{primary}</p>
        {secondary && <p className="truncate text-ink-secondary">{secondary}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {meta && <span className="text-ink-secondary">{meta}</span>}
        {action}
      </div>
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-surface-hover text-ink',
    accent: 'bg-brand-accent/10 text-brand-accent',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-900',
    danger: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  )
}

export function Alert({ children, tone = 'info' }) {
  const tones = {
    info: 'border-surface-border bg-surface-subtle text-ink-secondary',
    success: 'border-green-200 bg-green-50 text-green-800',
    error: 'border-red-200 bg-red-50 text-red-800',
  }
  return (
    <p className={`mb-6 rounded-xl border px-4 py-3 text-sm ${tones[tone] || tones.info}`}>
      {children}
    </p>
  )
}

export function TablePanel({ children }) {
  return (
    <div className="panel-card overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

export function MediaCard({ image, title, subtitle, badge, children, className = '' }) {
  return (
    <ItemCard className={`flex gap-4 ${className}`}>
      {image && (
        <img src={image} alt="" className="h-24 w-32 shrink-0 rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        {badge && <div className="mb-1">{badge}</div>}
        <h2 className="font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>}
        {children}
      </div>
    </ItemCard>
  )
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  )
}

export function PrimaryButton({ children, className = '', as: Tag = 'button', ...props }) {
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-lg bg-brand-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function SecondaryButton({ children, className = '', as: Tag = 'button', ...props }) {
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-lg border border-ink px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-surface-hover disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function EmptyPanel({ title, description, action }) {
  return (
    <div className="panel-card px-8 py-16 text-center">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {description && <p className="mt-2 text-ink-secondary">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function TextLink({ to, children, className = '' }) {
  return (
    <Link to={to} className={`text-sm font-semibold text-ink underline ${className}`}>
      {children}
    </Link>
  )
}

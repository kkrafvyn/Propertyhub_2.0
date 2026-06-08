import React from 'react'

// Loading Spinner
export function Loader({ size = 'md', className = '' }) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size]

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizeClass} border-4 border-surface-container border-t-primary rounded-full animate-spin`}></div>
    </div>
  )
}

// Error Message
export function ErrorMessage({ message, onDismiss, className = '' }) {
  if (!message) return null

  return (
    <div className={`rounded-lg border border-error/30 bg-error/10 p-4 flex items-start gap-3 ${className}`}>
      <span className="material-symbols-outlined text-error mt-0.5">error</span>
      <div className="flex-1">
        <p className="text-error text-sm font-medium">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex h-11 w-11 items-center justify-center rounded-md text-error transition hover:bg-error/10"
          aria-label="Dismiss error"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      )}
    </div>
  )
}

// Success Message
export function SuccessMessage({ message, onDismiss, className = '' }) {
  if (!message) return null

  return (
    <div className={`rounded-lg border border-success/30 bg-success/10 p-4 flex items-start gap-3 ${className}`}>
      <span className="material-symbols-outlined text-success mt-0.5">check_circle</span>
      <div className="flex-1">
        <p className="text-success text-sm font-medium">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex h-11 w-11 items-center justify-center rounded-md text-success transition hover:bg-success/10"
          aria-label="Dismiss success message"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      )}
    </div>
  )
}

export function DataBanner({
  variant = 'info',
  title,
  description,
  action = null,
  className = '',
}) {
  const styles = {
    info: 'border-[#E9C349]/50 bg-[#fff7d6] text-[#071121]',
    warning: 'border-warning/40 bg-warning/10 text-[#071121]',
    error: 'border-error/40 bg-error/10 text-[#071121]',
  }[variant]

  const icon = {
    info: { name: 'info', className: 'text-[#B8860B]' },
    warning: { name: 'sync_problem', className: 'text-warning' },
    error: { name: 'error', className: 'text-error' },
  }[variant]

  return (
    <div className={`rounded-lg border p-4 ${styles} ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className={`material-symbols-outlined mt-0.5 ${icon.className}`}>
            {icon.name}
          </span>
          <div>
            {title && <p className="font-semibold">{title}</p>}
            {description && (
              <p className="mt-1 text-sm leading-6 text-[#596170]">
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
    </div>
  )
}

export function DemoModeBanner({ className = '' }) {
  return (
    <DataBanner
      className={className}
      variant="warning"
      title="Demo data active"
      description="Live Supabase data is not available for this view yet, so the interface is showing safe preview records."
    />
  )
}

export function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-surface-container-high ${className}`}
      aria-hidden="true"
    />
  )
}

export function LoadingState({ title = 'Loading data', rows = 3 }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container p-5">
      <div className="mb-5 flex items-center gap-3">
        <Loader size="sm" />
        <p className="font-semibold text-on-surface">{title}</p>
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonBlock key={index} className="h-12" />
        ))}
      </div>
    </div>
  )
}

export function RetryState({
  title = 'Unable to load data',
  description = 'Check the connection and try again.',
  onRetry,
}) {
  return (
    <div className="rounded-lg border border-error/40 bg-error/10 p-6 text-center">
      <span className="material-symbols-outlined text-5xl text-error">cloud_off</span>
      <h3 className="mt-4 text-2xl font-semibold text-on-surface">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-on-surface-variant">
        {description}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-5 px-4 py-2">
          Retry
        </button>
      )}
    </div>
  )
}

// Button Variants
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  className = '',
  ...props 
}) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'bg-error/10 text-error hover:bg-error/20 border border-error/30',
  }[variant]

  const sizeClass = {
    sm: 'px-3 py-1.5 text-label-sm',
    md: 'px-4 py-2 text-body-md',
    lg: 'px-6 py-3 text-body-lg',
  }[size]

  return (
    <button
      disabled={disabled || loading}
      className={`${variantClass} ${sizeClass} flex min-h-11 items-center justify-center gap-2 rounded-md transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {loading ? (
        <Loader size="sm" />
      ) : (
        icon && <span className="material-symbols-outlined text-lg">{icon}</span>
      )}
      {children}
    </button>
  )
}

// Input Field
export function Input({
  label,
  error,
  required,
  icon = null,
  type = 'text',
  className = '',
  ...props
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-semibold text-on-surface">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">
            {icon}
          </span>
        )}
        <input
          type={type}
          className={`input-field w-full ${icon ? 'pl-10' : ''} ${error ? 'border-error/30 bg-error/5' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-error text-label-sm">{error}</p>}
    </div>
  )
}

// Select Field
export function Select({
  label,
  error,
  required,
  options = [],
  className = '',
  ...props
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-semibold text-on-surface">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <select
        className={`input-field w-full appearance-none cursor-pointer pr-8 ${error ? 'border-error/30 bg-error/5' : ''} ${className}`}
        {...props}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-error text-label-sm">{error}</p>}
    </div>
  )
}

// Textarea
export function Textarea({
  label,
  error,
  required,
  className = '',
  ...props
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-semibold text-on-surface">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <textarea
        className={`input-field w-full resize-none ${error ? 'border-error/30 bg-error/5' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-error text-label-sm">{error}</p>}
    </div>
  )
}

// Checkbox
export function Checkbox({
  label,
  error,
  className = '',
  ...props
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1">
        <input
          type="checkbox"
          className="h-5 w-5 cursor-pointer rounded border border-outline accent-primary"
          {...props}
        />
        <span className="text-body-md text-on-surface">{label}</span>
      </label>
      {error && <p className="text-error text-label-sm">{error}</p>}
    </div>
  )
}

// Card
export function Card({ children, className = '', clickable = false, onClick = null }) {
  return (
    <div
      className={`card ${clickable ? 'cursor-pointer transition hover:border-secondary/60' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// Glass Card (for overlays/floating elements)
export function GlassCard({ children, className = '' }) {
  return (
    <div className={`glass-card ${className}`}>
      {children}
    </div>
  )
}

// Badge
export function Badge({ 
  children, 
  variant = 'primary',
  size = 'md',
  className = '' 
}) {
  const variantClass = {
    primary: 'bg-primary/20 text-primary',
    secondary: 'bg-secondary/20 text-secondary',
    success: 'bg-success/20 text-success',
    error: 'bg-error/20 text-error',
    warning: 'bg-warning/20 text-warning',
  }[variant]

  const sizeClass = {
    sm: 'px-2 py-0.5 text-label-sm',
    md: 'px-3 py-1 text-body-md',
  }[size]

  return (
    <span className={`${variantClass} ${sizeClass} rounded-full inline-block ${className}`}>
      {children}
    </span>
  )
}

// Divider
export function Divider({ className = '' }) {
  return <div className={`border-t border-outline ${className}`}></div>
}

// Empty State
export function EmptyState({ 
  icon = 'inbox', 
  title = 'No items found', 
  description = 'Try adjusting your filters',
  action = null 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="material-symbols-outlined mb-4 text-5xl text-on-surface-variant">
        {icon}
      </span>
      <h3 className="mb-2 text-2xl font-semibold text-on-surface">{title}</h3>
      <p className="mb-6 text-body-md text-on-surface-variant">{description}</p>
      {action}
    </div>
  )
}

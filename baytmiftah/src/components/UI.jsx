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
    <div className={`bg-error/10 border border-error/30 rounded-lg p-4 flex items-start gap-3 ${className}`}>
      <span className="material-symbols-outlined text-error mt-0.5">error</span>
      <div className="flex-1">
        <p className="text-error text-sm font-medium">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-error hover:bg-error/10 rounded p-1 transition"
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
    <div className={`bg-success/10 border border-success/30 rounded-lg p-4 flex items-start gap-3 ${className}`}>
      <span className="material-symbols-outlined text-success mt-0.5">check_circle</span>
      <div className="flex-1">
        <p className="text-success text-sm font-medium">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-success hover:bg-success/10 rounded p-1 transition"
        >
          <span className="material-symbols-outlined text-lg">close</span>
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
      className={`${variantClass} ${sizeClass} rounded-lg flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
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
        <label className="text-label-sm font-medium text-on-surface">
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
        <label className="text-label-sm font-medium text-on-surface">
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
        <label className="text-label-sm font-medium text-on-surface">
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
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="w-4 h-4 rounded border border-outline accent-primary cursor-pointer"
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
      className={`card ${clickable ? 'cursor-pointer hover:shadow-lg transition' : ''} ${className}`}
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
      <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">
        {icon}
      </span>
      <h3 className="text-headline-md text-on-surface mb-2">{title}</h3>
      <p className="text-body-md text-on-surface-variant mb-6">{description}</p>
      {action}
    </div>
  )
}

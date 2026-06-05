import React, { useEffect } from 'react'

// Modal Component
export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer = null,
  size = 'md',
  className = ''
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[size]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative bg-surface rounded-2xl shadow-2xl ${sizeClass} w-full mx-4 max-h-[90vh] overflow-y-auto ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline">
          <h2 className="text-headline-md text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-container rounded-full p-2 transition"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex gap-3 p-6 border-t border-outline justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// Toast Container (singleton)
let toastId = 0
const toastListeners = []

export const toast = {
  success: (message, duration = 3000) => {
    const id = toastId++
    toastListeners.forEach((listener) =>
      listener({
        id,
        message,
        type: 'success',
        duration,
      })
    )
  },
  error: (message, duration = 3000) => {
    const id = toastId++
    toastListeners.forEach((listener) =>
      listener({
        id,
        message,
        type: 'error',
        duration,
      })
    )
  },
  info: (message, duration = 3000) => {
    const id = toastId++
    toastListeners.forEach((listener) =>
      listener({
        id,
        message,
        type: 'info',
        duration,
      })
    )
  },
  warning: (message, duration = 3000) => {
    const id = toastId++
    toastListeners.forEach((listener) =>
      listener({
        id,
        message,
        type: 'warning',
        duration,
      })
    )
  },
}

// Toast Provider
export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([])

  React.useEffect(() => {
    const listener = (toast) => {
      setToasts((prev) => [...prev, toast])

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, toast.duration)

      return () => clearTimeout(timer)
    }

    toastListeners.push(listener)
    return () => {
      const index = toastListeners.indexOf(listener)
      if (index > -1) {
        toastListeners.splice(index, 1)
      }
    }
  }, [])

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            {...t}
            onRemove={() => removeToast(t.id)}
          />
        ))}
      </div>
    </>
  )
}

// Individual Toast Item
function ToastItem({ id, message, type, onRemove }) {
  const typeClass = {
    success: 'bg-success/10 border-success/30 text-success',
    error: 'bg-error/10 border-error/30 text-error',
    info: 'bg-info/10 border-info/30 text-info',
    warning: 'bg-warning/10 border-warning/30 text-warning',
  }[type]

  const icon = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning',
  }[type]

  return (
    <div
      className={`${typeClass} border rounded-lg p-4 flex items-start gap-3 pointer-events-auto max-w-xs animate-fade-in`}
    >
      <span className="material-symbols-outlined">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={onRemove}
        className="hover:opacity-70 transition"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  )
}

// Confirmation Dialog
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <p className="text-body-md text-on-surface-variant mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="btn-ghost"
        >
          {cancelText}
        </button>
        <button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className={isDangerous ? 'bg-error/10 text-error hover:bg-error/20 border border-error/30 rounded-lg px-4 py-2 transition' : 'btn-primary'}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  )
}

// Sheet/Drawer Component (Mobile friendly)
export function Sheet({
  isOpen,
  onClose,
  title,
  children,
  position = 'bottom',
  className = '',
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const positionClass = {
    bottom: 'bottom-0 left-0 right-0 rounded-t-3xl',
    right: 'right-0 top-0 bottom-0 rounded-l-3xl',
    left: 'left-0 top-0 bottom-0 rounded-r-3xl',
  }[position]

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className={`absolute bg-surface ${positionClass} shadow-2xl max-h-[90vh] overflow-y-auto ${className}`}>
        {/* Handle */}
        {position === 'bottom' && (
          <div className="flex justify-center pt-3">
            <div className="w-12 h-1 bg-on-surface-variant/20 rounded-full" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline">
          <h2 className="text-headline-md text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-container rounded-full p-2 transition"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

// Dropdown Menu
export function Dropdown({
  trigger,
  items = [],
  align = 'right',
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const ref = React.useRef(null)

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const alignClass = {
    left: 'left-0',
    right: 'right-0',
  }[align]

  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </button>

      {isOpen && (
        <div
          className={`absolute ${alignClass} mt-2 w-48 bg-surface-container rounded-lg shadow-lg border border-outline z-50 overflow-hidden`}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                item.onClick?.()
                setIsOpen(false)
              }}
              className="w-full text-left px-4 py-3 text-body-md text-on-surface hover:bg-surface-container-high transition flex items-center gap-2"
            >
              {item.icon && (
                <span className="material-symbols-outlined text-lg">
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

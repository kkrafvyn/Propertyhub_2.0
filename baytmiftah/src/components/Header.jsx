import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Header({ title, showBack = false, actions = [] }) {
  const navigate = useNavigate()

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass-card border-b border-outline-variant mx-auto">
      <div className="container-safe max-w-container mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-surface-container-high rounded-md transition"
              aria-label="Go back"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <h1 className="text-headline-md font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={`px-4 py-2 rounded-md transition ${
                action.variant === 'primary'
                  ? 'btn-primary'
                  : action.variant === 'secondary'
                  ? 'btn-secondary'
                  : 'hover:bg-surface-container-high'
              }`}
            >
              {action.icon && <span className="material-symbols-outlined">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

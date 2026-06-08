import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Header({ title, showBack = false, actions = [] }) {
  const navigate = useNavigate()

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-[rgba(7,21,36,0.9)] pt-[env(safe-area-inset-top)] text-[#F8FAFC] shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl md:left-64">
      <div className="container-safe mx-auto flex min-h-16 max-w-container items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-4">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-md transition hover:bg-white/10"
              aria-label="Go back"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <h1 className="line-clamp-1 text-xl font-semibold tracking-normal md:text-3xl">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={`inline-flex min-h-11 items-center gap-2 rounded-md px-4 py-2 transition ${
                action.variant === 'primary'
                  ? 'bg-[#E9C349] text-[#0F172A] font-bold hover:bg-[#F5D76B]'
                  : action.variant === 'secondary'
                    ? 'border border-[#334155] bg-[#0F172A] font-bold hover:bg-[#1E293B]'
                    : 'hover:bg-[#1E293B]'
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

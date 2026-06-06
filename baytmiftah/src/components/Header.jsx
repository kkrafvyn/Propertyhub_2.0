import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Header({ title, showBack = false, actions = [] }) {
  const navigate = useNavigate()

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-[#cbd3df] bg-white/95 text-[#071121] backdrop-blur-xl md:left-64">
      <div className="container-safe mx-auto flex max-w-container items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-4">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="rounded-md p-2 transition hover:bg-[#edf4ff]"
              aria-label="Go back"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <h1 className="line-clamp-1 text-xl font-black md:text-3xl">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition ${
                action.variant === 'primary'
                  ? 'bg-black text-white font-bold hover:bg-black/90'
                  : action.variant === 'secondary'
                    ? 'border border-[#cbd3df] bg-white font-bold hover:bg-[#edf4ff]'
                    : 'hover:bg-[#edf4ff]'
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

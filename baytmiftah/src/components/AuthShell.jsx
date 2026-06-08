import React from 'react'
import { Link } from 'react-router-dom'

const authBackground =
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1800&q=85'

const defaultHighlights = [
  ['verified', 'Verified marketplace access'],
  ['calendar', 'Booking and availability workflows'],
  ['lock', 'Secure Supabase-backed sessions'],
]

const iconPaths = {
  verified: (
    <>
      <path d="M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M4 10h16" />
      <path d="M8 14h2" />
      <path d="M14 14h2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  close: (
    <>
      <path d="m7 7 10 10" />
      <path d="m17 7-10 10" />
    </>
  ),
  arrow_back: <path d="M19 12H5m6-6-6 6 6 6" />,
  person_add: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M18 8v6" />
      <path d="M15 11h6" />
    </>
  ),
  groups: (
    <>
      <circle cx="8" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3.5 20a5 5 0 0 1 9 0" />
      <path d="M14 19a4 4 0 0 1 6.5 0" />
    </>
  ),
}

function AuthIcon({ name, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-5 w-5 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {iconPaths[name] || iconPaths.verified}
    </svg>
  )
}

export default function AuthShell({
  title,
  subtitle,
  headerLabel,
  backTo = '/explore',
  backIcon = 'close',
  children,
  footer,
  highlights = defaultHighlights,
}) {
  return (
    <main
      className="min-h-screen bg-[#051424] bg-cover bg-center px-4 py-4 text-[#071121] sm:px-5 lg:grid lg:place-items-center"
      style={{ backgroundImage: `linear-gradient(120deg, rgba(5,20,36,0.88), rgba(5,20,36,0.58)), url(${authBackground})` }}
    >
      <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-lg border border-white/15 bg-white/95 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl lg:grid-cols-[0.95fr_1fr]">
        <aside className="relative hidden min-h-[680px] overflow-hidden bg-[#0B1220] p-8 text-white lg:flex lg:flex-col">
          <img
            src={authBackground}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#071524]/95 via-[#071524]/72 to-[#071524]/38" />
          <div className="relative z-10 flex h-full flex-col">
            <Link to="/explore" className="text-2xl font-semibold tracking-normal">
              BaytMiftah
            </Link>
            <div className="mt-14">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#E9C349]">
                Unified access portal
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight">
                One secure login for every BaytMiftah role.
              </h1>
              <p className="mt-4 text-sm leading-6 text-[#CBD5E1]">
                Buyers, renters, owners, agents, agencies, and operators enter through the same account portal. Role permissions unlock inside the workspace after verification.
              </p>
            </div>

            <div className="mt-auto grid gap-3">
              {highlights.map(([icon, label]) => (
                <div key={label} className="flex min-h-12 items-center gap-3 rounded-md bg-white/10 px-4 py-3 backdrop-blur">
                  <AuthIcon name={icon} className="text-[#E9C349]" />
                  <span className="text-sm font-semibold text-[#F8FAFC]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex min-h-[640px] flex-col bg-white">
          <header className="relative border-b border-[#d8dde6] px-5 py-4 text-center sm:px-6">
            <Link
              to={backTo}
              aria-label="Go back"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-[#071121] hover:bg-[#f5f7fc]"
            >
              <AuthIcon name={backIcon} />
            </Link>
            <p className="text-base font-semibold">{headerLabel}</p>
          </header>

          <div className="flex flex-1 flex-col px-5 py-6 sm:px-8">
            <div>
              <h2 className="text-3xl font-semibold tracking-normal">{title}</h2>
              {subtitle && (
                <p className="mt-2 text-sm leading-6 text-[#596170]">{subtitle}</p>
              )}
            </div>
            <div className="mt-6 flex-1">{children}</div>
            {footer && (
              <div className="mt-6 border-t border-[#d8dde6] pt-5 text-center text-sm text-[#596170]">
                {footer}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

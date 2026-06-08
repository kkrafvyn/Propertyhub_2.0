import React from 'react'
import { Link } from 'react-router-dom'

const defaultHighlights = [
  ['verified_user', 'Verified marketplace access'],
  ['calendar_month', 'Booking and availability workflows'],
  ['lock', 'Secure Supabase-backed sessions'],
]

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
    <main className="min-h-screen bg-[#051424] px-4 py-4 text-[#071121] sm:px-5 lg:grid lg:place-items-center">
      <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-lg border border-white/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.32)] lg:grid-cols-[0.9fr_1fr]">
        <aside className="hidden bg-[#0B1220] p-8 text-white lg:flex lg:flex-col">
          <Link to="/explore" className="text-2xl font-semibold tracking-normal">
            BaytMiftah
          </Link>
          <div className="mt-14">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#E9C349]">
              Private property workspace
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              One secure entry for buyers, owners, agents, and operators.
            </h1>
            <p className="mt-4 text-sm leading-6 text-[#CBD5E1]">
              Continue into verified listings, booking calendars, agency tools, deal rooms, and account security from the same session.
            </p>
          </div>

          <div className="mt-auto grid gap-3">
            {highlights.map(([icon, label]) => (
              <div key={label} className="flex min-h-12 items-center gap-3 rounded-md bg-white/8 px-4 py-3">
                <span className="material-symbols-outlined text-[#E9C349]">{icon}</span>
                <span className="text-sm font-semibold text-[#F8FAFC]">{label}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex min-h-[640px] flex-col">
          <header className="relative border-b border-[#d8dde6] px-5 py-4 text-center sm:px-6">
            <Link
              to={backTo}
              aria-label="Go back"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[#071121] hover:bg-[#f5f7fc]"
            >
              <span className="material-symbols-outlined text-xl">{backIcon}</span>
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

import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface px-4 text-on-surface">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center">
        <div className="grid w-full gap-8 rounded-lg border border-outline-variant bg-surface-container p-6 shadow-2xl shadow-black/20 md:grid-cols-[1fr_320px] md:p-10">
          <section>
            <p className="text-label-sm mb-3 font-bold text-secondary">404</p>
            <h1 className="max-w-xl text-4xl font-black leading-tight md:text-6xl">
              This page is outside the portfolio.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-on-surface-variant">
              The route is unavailable or has moved. Jump back into a workspace area that is ready.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/" className="btn-primary inline-flex justify-center">
                Dashboard
              </Link>
              <Link to="/explore" className="btn-secondary inline-flex justify-center">
                Explore
              </Link>
              <Link to="/support" className="btn-ghost inline-flex justify-center">
                Support
              </Link>
            </div>
          </section>

          <aside className="rounded-lg border border-outline-variant bg-surface p-5">
            {[
              ['storefront', 'Marketplace', '/explore'],
              ['business_center', 'Agency console', '/agency/dashboard'],
              ['settings_input_antenna', 'Smart property', '/smart-property/devices'],
              ['analytics', 'Analytics', '/agency/analytics'],
            ].map(([icon, label, path]) => (
              <Link
                key={path}
                to={path}
                className="flex items-center justify-between border-b border-outline-variant py-4 last:border-b-0"
              >
                <span className="flex items-center gap-3 font-semibold">
                  <span className="material-symbols-outlined text-secondary">{icon}</span>
                  {label}
                </span>
                <span className="material-symbols-outlined text-on-surface-variant">arrow_forward</span>
              </Link>
            ))}
          </aside>
        </div>
      </div>
    </div>
  )
}

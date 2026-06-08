import React from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'

const endpoints = [
  ['GET', '/functions/v1/partner-api?resource=listings', 'Read approved listing inventory'],
  ['GET', '/functions/v1/partner-api?resource=availability', 'Read synced booking availability'],
  ['POST', '/functions/v1/partner-api?resource=leads', 'Create partner-attributed leads'],
]

export default function PartnerPortal() {
  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Partner API" />
        <div className="page-shell">
          <div className="content-shell grid gap-5 lg:grid-cols-[1fr_340px]">
            <section className="panel">
              <h2 className="text-2xl font-semibold text-secondary">API surface</h2>
              <div className="mt-5 overflow-hidden rounded-lg border border-outline-variant">
                {endpoints.map(([method, path, purpose]) => (
                  <div key={path} className="grid gap-2 border-b border-outline-variant bg-surface p-4 last:border-b-0 md:grid-cols-[80px_1fr_1fr]">
                    <span className="rounded-md bg-[#E9C349] px-3 py-1 text-center text-sm font-bold text-[#111827]">
                      {method}
                    </span>
                    <code className="text-sm text-on-surface">{path}</code>
                    <p className="text-sm text-on-surface-variant">{purpose}</p>
                  </div>
                ))}
              </div>
            </section>

            <aside className="space-y-4">
              <article className="panel bg-[#111827] text-white">
                <p className="text-sm uppercase tracking-widest text-[#E9C349]">Security model</p>
                <p className="mt-3 text-sm leading-6 text-white/75">
                  API keys are stored as SHA-256 hashes in Supabase. The Edge Function records usage events and never returns the raw key.
                </p>
              </article>
              <article className="panel">
                <h2 className="text-xl font-semibold text-secondary">Partner scopes</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['listings:read', 'availability:read', 'leads:write', 'events:read'].map((scope) => (
                    <span key={scope} className="rounded-md bg-surface px-3 py-2 text-sm font-semibold">
                      {scope}
                    </span>
                  ))}
                </div>
              </article>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}

import React from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'

const nodes = [
  ['Property', 'Cantonments Residences A-12'],
  ['Owner', 'Verified owner profile'],
  ['Agency', 'Mandate active'],
  ['Calendar', 'Booking.com and direct holds synced'],
  ['Documents', 'Title, inspection, and offer packet linked'],
  ['Devices', 'Smart lock and energy monitor attached'],
]

export default function PropertyGraph() {
  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Property Graph" />
        <div className="page-shell">
          <div className="content-shell section-stack">
            <section className="panel">
              <h2 className="text-2xl font-semibold text-secondary">Unified property identity</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
                One operational record connects ownership, listings, channel calendars, documents, smart devices, and transaction history.
              </p>
            </section>
            <section className="grid gap-4 md:grid-cols-3">
              {nodes.map(([title, body]) => (
                <article key={title} className="panel-compact">
                  <p className="text-sm uppercase tracking-widest text-on-surface-variant">{title}</p>
                  <h3 className="mt-3 text-xl font-semibold text-secondary">{body}</h3>
                </article>
              ))}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

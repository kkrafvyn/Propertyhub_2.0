import React from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import { getOwnerPortalSnapshot } from '../services/frontier-service'

export default function OwnerPortal() {
  const snapshot = getOwnerPortalSnapshot()
  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Owner Portal" />
        <div className="page-shell">
          <div className="content-shell section-stack">
            <section className="grid gap-4 md:grid-cols-5">
              {Object.entries(snapshot).map(([key, value]) => (
                <article key={key} className="panel-compact">
                  <p className="text-sm capitalize text-on-surface-variant">{key.replace(/[A-Z]/g, ' $&')}</p>
                  <p className="mt-2 text-2xl font-bold text-secondary">{value}</p>
                </article>
              ))}
            </section>
            <section className="grid gap-6 lg:grid-cols-3">
              {[
                ['Calendar approvals', 'Review booking holds, owner blocks, and channel sync changes.'],
                ['Documents', 'Track title, mandate, inspection, and transaction vault readiness.'],
                ['Agent performance', 'See response speed, lead quality, booking conversion, and close progress.'],
              ].map(([title, body]) => (
                <article key={title} className="panel">
                  <h2 className="text-xl font-semibold text-secondary">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">{body}</p>
                </article>
              ))}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

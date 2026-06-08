import React, { useEffect, useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import { getNeighborhood } from '../services/frontier-service'

export default function NeighborhoodIntelligence() {
  const [query, setQuery] = useState({ city: 'Accra', neighborhood: 'Cantonments' })
  const [data, setData] = useState(null)

  useEffect(() => {
    getNeighborhood(query.city, query.neighborhood).then(setData)
  }, [])

  const load = () => getNeighborhood(query.city, query.neighborhood).then(setData)
  const metrics = data?.metrics || {}

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Neighborhood Intelligence" />
        <div className="page-shell">
          <div className="content-shell section-stack">
            <section className="panel-compact">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input className="input-field" value={query.city} onChange={(event) => setQuery((current) => ({ ...current, city: event.target.value }))} />
                <input className="input-field" value={query.neighborhood} onChange={(event) => setQuery((current) => ({ ...current, neighborhood: event.target.value }))} />
                <button onClick={load} className="btn-primary justify-center">Refresh</button>
              </div>
            </section>
            <section className="grid gap-4 md:grid-cols-3">
              {Object.entries(metrics).map(([key, value]) => (
                <article key={key} className="panel">
                  <p className="text-sm capitalize text-on-surface-variant">{key.replace(/[A-Z]/g, ' $&')}</p>
                  <p className="mt-2 text-3xl font-bold text-secondary">{String(value)}</p>
                </article>
              ))}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

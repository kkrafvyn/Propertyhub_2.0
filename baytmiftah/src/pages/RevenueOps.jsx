import React, { useEffect, useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import { getRevenueOps } from '../services/frontier-service'

const formatMetric = (key, value) => {
  if (key === 'mrr' || key === 'boostRevenue') {
    return `GHS ${Number(value || 0).toLocaleString()}`
  }
  return value
}

export default function RevenueOps() {
  const [state, setState] = useState({ loading: true, data: null, error: '' })

  useEffect(() => {
    let alive = true
    getRevenueOps()
      .then((data) => {
        if (alive) setState({ loading: false, data, error: '' })
      })
      .catch((error) => {
        if (alive) setState({ loading: false, data: null, error: error.message || 'Unable to load revenue data.' })
      })
    return () => {
      alive = false
    }
  }, [])

  const metrics = state.data?.metrics || {}

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Revenue Ops" />
        <div className="page-shell">
          <div className="content-shell section-stack">
            {state.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {state.error}
              </div>
            )}

            <section className="grid gap-4 md:grid-cols-5">
              {state.loading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-32 animate-pulse rounded-lg bg-surface-container" />
                  ))
                : Object.entries(metrics).map(([key, value]) => (
                    <article key={key} className="panel-compact">
                      <p className="text-sm capitalize text-on-surface-variant">
                        {key.replace(/[A-Z]/g, ' $&')}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-secondary">
                        {formatMetric(key, value)}
                      </p>
                    </article>
                  ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              {[
                ['Boost performance', 'Track paid listing upgrades by category, city, and agent cohort.'],
                ['Checkout health', 'Watch Stripe and Paystack conversion from intent to paid session.'],
                ['Expansion queue', 'Prioritize agencies with inventory growth, repeat boosts, and low churn risk.'],
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

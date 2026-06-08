import React, { useEffect, useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import { DataBanner } from '../components/UI'
import { billingService } from '../services/production-service'

export default function Billing() {
  const [history, setHistory] = useState([])

  useEffect(() => {
    billingService.listHistory().then(setHistory)
  }, [])

  const totals = history.reduce(
    (summary, item) => {
      if (item.status === 'paid') summary.paid += Number(item.amount || 0)
      else summary.pending += Number(item.amount || 0)
      return summary
    },
    { paid: 0, pending: 0 }
  )

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Billing" />
        <div className="page-shell">
          <div className="content-shell section-stack">
            <DataBanner
              title="Stripe and Paystack webhooks"
              description="Checkout creation is wired. This page is ready to show confirmed payment events once the webhook function is deployed and provider secrets are set."
            />

            <section className="grid gap-4 md:grid-cols-3">
              {[
                ['Paid', `GHS ${totals.paid.toFixed(0)}`, 'check_circle'],
                ['Pending', `GHS ${totals.pending.toFixed(0)}`, 'pending'],
                ['Providers', 'Stripe + Paystack', 'payments'],
              ].map(([label, value, icon]) => (
                <article key={label} className="panel">
                  <span className="material-symbols-outlined text-3xl text-secondary">{icon}</span>
                  <p className="mt-4 text-sm text-on-surface-variant">{label}</p>
                  <p className="mt-1 text-3xl font-bold text-secondary">{value}</p>
                </article>
              ))}
            </section>

            <section className="panel">
              <h2 className="text-2xl font-semibold text-secondary">Payment history</h2>
              <div className="mt-5 space-y-3">
                {history.map((item) => (
                  <article key={item.id} className="grid gap-3 rounded-md bg-surface p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                    <div>
                      <p className="font-semibold">{item.description}</p>
                      <p className="text-sm text-on-surface-variant">{item.provider} / {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'staged'}</p>
                    </div>
                    <p className="font-bold text-secondary">{item.currency || 'GHS'} {item.amount}</p>
                    <span className="rounded-full bg-secondary/15 px-3 py-1 text-sm font-semibold text-secondary">{item.status}</span>
                  </article>
                ))}
                {history.length === 0 && (
                  <div className="empty-panel">
                    No billing events yet.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

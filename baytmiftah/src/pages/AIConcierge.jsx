import React, { useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import { runConcierge } from '../services/frontier-service'

export default function AIConcierge() {
  const [profile, setProfile] = useState({
    budget: '1800000',
    area: 'Cantonments',
    lifestyle: 'quiet luxury, smart home, strong commute',
    riskTolerance: 'low',
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const run = async (event) => {
    event.preventDefault()
    setLoading(true)
    setResult(await runConcierge(profile))
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="AI Buyer Concierge" />
        <div className="page-shell">
          <div className="content-shell grid gap-5 lg:grid-cols-[360px_1fr]">
            <form onSubmit={run} className="panel">
              <h2 className="text-2xl font-semibold text-secondary">Buyer intent</h2>
              <div className="mt-5 grid gap-4">
                {[
                  ['budget', 'Budget'],
                  ['area', 'Preferred area'],
                  ['lifestyle', 'Lifestyle'],
                  ['riskTolerance', 'Risk tolerance'],
                ].map(([key, label]) => (
                  <label key={key}>
                    <span className="text-sm font-semibold">{label}</span>
                    <input
                      className="input-field mt-2"
                      value={profile[key]}
                      onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))}
                    />
                  </label>
                ))}
                <button className="btn-primary justify-center" disabled={loading}>
                  {loading ? 'Matching...' : 'Find matches'}
                </button>
              </div>
            </form>
            <section className="panel">
              <h2 className="text-2xl font-semibold text-secondary">Recommendations</h2>
              <div className="mt-5 grid gap-4">
                {(result?.recommendations || []).map((item) => (
                  <article key={item.title} className="panel-inset">
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                    <p className="mt-2 text-on-surface-variant">{item.reason}</p>
                    <p className="mt-3 text-sm font-bold text-secondary">{item.nextAction}</p>
                  </article>
                ))}
                {!result && (
                  <div className="empty-panel">
                    Tell the concierge what the buyer wants.
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

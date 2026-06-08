import React, { useEffect, useState } from 'react'
import Header from '../../components/Header'
import Navigation from '../../components/Navigation'
import { Badge, DataBanner, LoadingState } from '../../components/UI'
import { trustScoreService } from '../../services/product-feature-service'

export default function AgencyTrustScore() {
  const [score, setScore] = useState(null)
  const [signals, setSignals] = useState([])
  const [source, setSource] = useState('')

  useEffect(() => {
    trustScoreService.getAgencyTrustScore().then((result) => {
      setScore(result.score)
      setSignals(result.signals)
      setSource(result.source)
    })
  }, [])

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Agency Trust Score" showBack />
        <div className="page-shell">
          <div className="content-shell section-stack">
            <DataBanner
              variant={source === 'supabase' ? 'info' : 'warning'}
              title="Trust score combines verification, responsiveness, accuracy, and dispute history"
              description="Use this as the public-facing confidence layer for agencies and the internal coaching layer for operators."
            />

            {score === null ? (
              <LoadingState title="Calculating trust score" />
            ) : (
              <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
                <div className="panel bg-[#111827] text-white">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/60">Current score</p>
                  <p className="mt-4 text-7xl font-semibold text-[#E9C349]">{score}</p>
                  <p className="mt-4 text-sm leading-6 text-white/70">
                    Strong enough for verified placement. Improve listing accuracy to unlock premium trust badges.
                  </p>
                  <Badge className="mt-5" variant={source === 'supabase' ? 'success' : 'warning'}>{source}</Badge>
                </div>
                <div className="panel">
                  <h2 className="text-2xl font-semibold text-secondary">Signals</h2>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {signals.map((signal) => (
                      <article key={signal.label} className="panel-inset">
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-semibold">{signal.label}</p>
                          <Badge variant={signal.status === 'strong' ? 'success' : 'warning'}>{signal.status}</Badge>
                        </div>
                        <div className="mt-4 h-2 rounded-full bg-surface-container-high">
                          <div
                            className="h-2 rounded-full bg-secondary"
                            style={{ width: `${Math.min(signal.value, 100)}%` }}
                          />
                        </div>
                        <p className="mt-2 text-sm text-on-surface-variant">{signal.value}% confidence</p>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

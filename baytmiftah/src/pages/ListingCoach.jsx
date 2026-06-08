import React, { useMemo, useState } from 'react'
import Header from '../components/Header'
import Navigation from '../components/Navigation'
import { Badge, DataBanner } from '../components/UI'
import { listingCoachService } from '../services/product-feature-service'

export default function ListingCoach() {
  const [draft, setDraft] = useState({
    title: 'Luxury townhouse in Cantonments',
    type: 'Townhouse',
    location: 'Cantonments, Accra',
    price: '4200000',
    sqft: '3200',
    mediaCount: 2,
    documentCount: 0,
    description: 'A quiet townhouse close to schools and embassies with private parking.',
  })

  const review = useMemo(() => listingCoachService.draftReview(draft), [draft])

  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="AI Listing Coach" showBack />
        <div className="page-shell">
          <div className="content-shell section-stack">
            <DataBanner
              title="Pre-publish quality review"
              description="This page gives agents a fast quality score before publishing. The same payload can call the real listing-ai Edge Function when the LLM key is deployed."
            />

            <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
              <form className="panel grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <input className="input-field" value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} />
                  <input className="input-field" value={draft.location} onChange={(event) => updateDraft('location', event.target.value)} />
                  <input className="input-field" value={draft.type} onChange={(event) => updateDraft('type', event.target.value)} />
                  <input className="input-field" type="number" value={draft.price} onChange={(event) => updateDraft('price', event.target.value)} />
                  <input className="input-field" type="number" value={draft.sqft} onChange={(event) => updateDraft('sqft', event.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="input-field" type="number" value={draft.mediaCount} onChange={(event) => updateDraft('mediaCount', event.target.value)} aria-label="Media count" />
                    <input className="input-field" type="number" value={draft.documentCount} onChange={(event) => updateDraft('documentCount', event.target.value)} aria-label="Document count" />
                  </div>
                </div>
                <textarea
                  className="input-field min-h-44"
                  value={draft.description}
                  onChange={(event) => updateDraft('description', event.target.value)}
                />
              </form>

              <aside className="space-y-6">
                <section className="panel bg-[#111827] text-white">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">Quality score</h2>
                    <span className="text-5xl font-semibold text-[#E9C349]">{review.score}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-white/70">{review.adminReviewNote}</p>
                </section>
                <section className="panel">
                  <h2 className="text-xl font-semibold text-secondary">Suggested headline</h2>
                  <p className="mt-3 text-sm font-semibold">{review.titleSuggestion}</p>
                  <p className="mt-2 text-sm text-on-surface-variant">{review.descriptionSuggestion}</p>
                </section>
                <section className="panel">
                  <h2 className="text-xl font-semibold text-secondary">Fix before publishing</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[...review.issues, ...review.suggestions, ...review.riskSignals].map((item) => (
                      <Badge key={item} variant={review.riskSignals.includes(item) ? 'error' : 'warning'}>
                        {item}
                      </Badge>
                    ))}
                    {review.issues.length + review.suggestions.length + review.riskSignals.length === 0 && (
                      <Badge variant="success">Ready to publish</Badge>
                    )}
                  </div>
                </section>
              </aside>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

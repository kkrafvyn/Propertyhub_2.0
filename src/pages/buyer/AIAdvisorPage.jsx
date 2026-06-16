import { useState } from 'react'
import ResponsivePageShell from '../../components/ResponsivePageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { askBuyerAdvisor } from '../../services/intelligence-service'

const prompts = [
  'Is this property overpriced?',
  'Is this neighborhood growing?',
  'What is the rental yield?',
]

function AIAdvisorContent() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAsk(q = question) {
    setLoading(true)
    const result = await askBuyerAdvisor({ question: q })
    setAnswer(result.answer)
    setSource(result.source)
    setLoading(false)
  }

  return (
    <>
      <h1 className="text-2xl font-semibold lg:hidden">AI buyer advisor</h1>
      <p className="mt-1 text-ink-secondary lg:hidden">Ask about pricing, neighborhoods, and investment potential.</p>

      <div className="mt-6 max-w-2xl lg:mt-0">
        <div className="flex flex-wrap gap-2">
          {prompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { setQuestion(p); handleAsk(p) }}
              className="rounded-full border border-surface-border bg-surface px-4 py-2 text-sm hover:bg-surface-subtle"
            >
              {p}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); handleAsk() }}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about a property or neighborhood…"
            className="flex-1 rounded-xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-ink"
          />
          <button type="submit" disabled={loading} className="rounded-xl bg-brand-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? '…' : 'Ask'}
          </button>
        </form>

        {answer && (
          <div className="mt-6 panel-card bg-surface-subtle p-5">
            <p className="text-sm leading-relaxed text-ink">{answer}</p>
            {source && (
              <p className="mt-3 text-xs text-ink-secondary">Source: {source === 'supabase' ? 'BaytMiftah AI' : 'Local advisor'}</p>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function AIAdvisorLayout() {
  return (
    <ResponsivePageShell titleKey="hubs.buyer.aiAdvisor.title" subtitleKey="hubs.buyer.aiAdvisor.subtitle">
      <AIAdvisorContent />
    </ResponsivePageShell>
  )
}

export default function AIAdvisorPage() {
  return <ProtectedRoute><AIAdvisorLayout /></ProtectedRoute>
}

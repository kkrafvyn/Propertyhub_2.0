import { useState } from 'react'
import DesktopShell, { CompactSearch } from '../../components/DesktopShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { askBuyerAdvisor } from '../../services/intelligence-service'

const prompts = [
  'Is this property overpriced?',
  'Is this neighborhood growing?',
  'What is the rental yield?',
]

function AIAdvisor() {
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
    <DesktopShell search={<CompactSearch />}>
      <h1 className="text-2xl font-semibold">AI buyer advisor</h1>
      <p className="mt-1 text-ink-secondary">Ask about pricing, neighborhoods, and investment potential.</p>

      <div className="mt-8 max-w-2xl">
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
          className="mt-4 flex gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about a property or neighborhood…"
            className="flex-1 rounded-xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-brand-dark"
          />
          <button type="submit" disabled={loading} className="rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-brand disabled:opacity-60">
            {loading ? '…' : 'Ask'}
          </button>
        </form>

        {answer && (
          <div className="mt-6 rounded-card border border-surface-border bg-brand-light p-5">
            <p className="text-sm leading-relaxed text-brand-dark">{answer}</p>
            {source && (
              <p className="mt-3 text-xs text-brand-dark/60">Source: {source === 'supabase' ? 'BaytMiftah AI' : 'Local advisor'}</p>
            )}
          </div>
        )}
      </div>
    </DesktopShell>
  )
}

export default function AIAdvisorPage() {
  return <ProtectedRoute><AIAdvisor /></ProtectedRoute>
}

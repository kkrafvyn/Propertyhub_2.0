import { useEffect, useState } from 'react'
import DesktopShell, { CompactSearch } from '../../components/DesktopShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchOffers, submitOffer } from '../../services/offer-service'

function OfferRoom() {
  const [offers, setOffers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [property, setProperty] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchOffers().then(({ offers: rows }) => setOffers(rows))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    await submitOffer({ property, amount, notes })
    const { offers: rows } = await fetchOffers()
    setOffers(rows)
    setShowForm(false)
    setProperty('')
    setAmount('')
    setNotes('')
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Offer room</h1>
          <p className="mt-1 text-ink-secondary">Submit offers and track negotiation status.</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-brand">
          New offer
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-3 rounded-card border border-surface-border bg-surface-subtle p-5">
          <input required value={property} onChange={(e) => setProperty(e.target.value)} placeholder="Property" className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm" />
          <input required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Offer amount (GHS)" className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Terms and notes" rows={3} className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-brand">Submit offer</button>
        </form>
      )}

      <div className="mt-8 space-y-3">
        {offers.map((o) => (
          <article key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-surface-border bg-surface p-4">
            <div>
              <p className="font-semibold">{o.property}</p>
              <p className="text-sm text-ink-secondary">
                GHS {Number(o.amount).toLocaleString()}
                {o.counterAmount ? ` · Counter: GHS ${Number(o.counterAmount).toLocaleString()}` : ''}
                {' · '}{o.updated}
              </p>
            </div>
            <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold capitalize text-brand-dark">{o.status}</span>
          </article>
        ))}
      </div>
    </DesktopShell>
  )
}

export default function OfferRoomPage() {
  return <ProtectedRoute><OfferRoom /></ProtectedRoute>
}

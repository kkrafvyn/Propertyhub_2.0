import React, { useMemo, useState } from 'react'
import Header from '../components/Header'
import Navigation from '../components/Navigation'
import { Badge, DataBanner, EmptyState } from '../components/UI'
import { createOfferPacket, getOfferPackets, markOfferPacketSigned } from '../services/offer-service'

export default function OfferRoom() {
  const [offers, setOffers] = useState(getOfferPackets())
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({
    buyerName: '',
    propertyTitle: '',
    amount: '',
    contingencies: 'Inspection and document verification',
  })

  const totals = useMemo(() => ({
    drafted: offers.filter((offer) => offer.status === 'drafted').length,
    signed: offers.filter((offer) => offer.signatureStatus === 'signed').length,
  }), [offers])

  const refresh = () => setOffers(getOfferPackets())

  const submitOffer = async (event) => {
    event.preventDefault()
    const result = await createOfferPacket({
      buyerName: form.buyerName,
      propertyTitle: form.propertyTitle,
      amount: Number(form.amount),
      contingencies: form.contingencies,
    })
    setStatus(
      result.source === 'supabase'
        ? 'Offer packet saved to Supabase persistence.'
        : 'Offer packet staged locally until the offer table and e-sign provider are live.'
    )
    setForm({
      buyerName: '',
      propertyTitle: '',
      amount: '',
      contingencies: 'Inspection and document verification',
    })
    refresh()
  }

  const signOffer = async (id) => {
    const result = await markOfferPacketSigned(id)
    setStatus(result.source === 'supabase' ? 'Signature status synced.' : 'Signature status staged locally.')
    refresh()
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Offer Room" showBack />
        <div className="page-shell">
          <div className="content-shell section-stack">
            <DataBanner
              variant="warning"
              title="Offer workflow ready for provider wiring"
              description="Draft offers, track signatures, and prepare transaction handoff. Real e-sign provider webhooks can update the same packet status."
            />

            <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div className="panel">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="panel-inset">
                    <p className="text-sm text-on-surface-variant">Packets</p>
                    <p className="mt-1 text-3xl font-semibold text-secondary">{offers.length}</p>
                  </div>
                  <div className="panel-inset">
                    <p className="text-sm text-on-surface-variant">Drafted</p>
                    <p className="mt-1 text-3xl font-semibold text-secondary">{totals.drafted}</p>
                  </div>
                  <div className="panel-inset">
                    <p className="text-sm text-on-surface-variant">Signed</p>
                    <p className="mt-1 text-3xl font-semibold text-secondary">{totals.signed}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {offers.length ? offers.map((offer) => (
                    <article key={offer.id} className="panel-inset">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-semibold">{offer.propertyTitle || offer.property_title || 'Property offer'}</p>
                          <p className="mt-1 text-sm text-on-surface-variant">
                            {offer.buyerName || offer.buyer_name || 'Buyer'} / GHS {offer.amount || 0}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={offer.signatureStatus === 'signed' ? 'success' : 'warning'}>
                            {offer.signatureStatus}
                          </Badge>
                          <button
                            onClick={() => signOffer(offer.id)}
                            className="btn-secondary px-3 py-2 text-sm"
                            disabled={offer.signatureStatus === 'signed'}
                          >
                            Mark signed
                          </button>
                        </div>
                      </div>
                    </article>
                  )) : (
                    <EmptyState
                      icon="contract"
                      title="No offer packets"
                      description="Create the first buyer offer and send it into the transaction flow."
                    />
                  )}
                </div>
              </div>

              <aside className="panel">
                <h2 className="text-xl font-semibold text-secondary">Draft offer</h2>
                <form onSubmit={submitOffer} className="mt-5 grid gap-3">
                  <input
                    className="input-field"
                    value={form.buyerName}
                    onChange={(event) => setForm((current) => ({ ...current, buyerName: event.target.value }))}
                    placeholder="Buyer name"
                    required
                  />
                  <input
                    className="input-field"
                    value={form.propertyTitle}
                    onChange={(event) => setForm((current) => ({ ...current, propertyTitle: event.target.value }))}
                    placeholder="Property"
                    required
                  />
                  <input
                    type="number"
                    className="input-field"
                    value={form.amount}
                    onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="Offer amount"
                    required
                  />
                  <textarea
                    className="input-field min-h-28"
                    value={form.contingencies}
                    onChange={(event) => setForm((current) => ({ ...current, contingencies: event.target.value }))}
                  />
                  <button className="btn-primary justify-center">Create packet</button>
                </form>
                {status && <p className="mt-4 rounded-md bg-secondary/10 p-3 text-sm text-secondary">{status}</p>}
              </aside>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

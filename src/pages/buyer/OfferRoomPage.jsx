import { useEffect, useState } from 'react'

import { Link } from 'react-router-dom'

import ResponsivePageShell from '../../components/ResponsivePageShell'

import ProtectedRoute from '../../components/ProtectedRoute'

import KycBanner from '../../components/KycBanner'

import { useTranslation } from '../../i18n/LocaleContext'

import { canSubmitOffer } from '../../lib/kyc'

import { fetchMyKyc } from '../../services/trust-service'

import { fetchOffers, fetchIncomingOffers, submitOffer, updateOffer } from '../../services/offer-service'



function OfferActions({ offer, busy, onAcceptCounter, onWithdraw, onCounter, onAccept, onReject }) {

  return (

    <div className="mt-3 flex flex-wrap gap-2">

      {offer.status === 'countered' && onAcceptCounter && (

        <button

          type="button"

          disabled={busy === offer.id}

          onClick={() => onAcceptCounter(offer)}

          className="rounded-lg bg-mobile-forest px-3 py-1.5 text-xs font-semibold text-white"

        >

          Accept counter

        </button>

      )}

      {offer.status === 'pending' && onCounter && (

        <>

          <button

            type="button"

            disabled={busy === offer.id}

            onClick={() => onCounter(offer)}

            className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink"

          >

            Counter

          </button>

          <button

            type="button"

            disabled={busy === offer.id}

            onClick={() => onAccept(offer.id)}

            className="rounded-lg bg-mobile-forest px-3 py-1.5 text-xs font-semibold text-white"

          >

            Accept

          </button>

          <button

            type="button"

            disabled={busy === offer.id}

            onClick={() => onReject(offer.id)}

            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"

          >

            Reject

          </button>

        </>

      )}

      {offer.status === 'accepted' && offer.transactionId && (

        <Link to="/finance/escrow" className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink">

          Fund escrow

        </Link>

      )}

      {(offer.status === 'pending' || offer.status === 'countered') && onWithdraw && (

        <button

          type="button"

          disabled={busy === offer.id}

          onClick={() => onWithdraw(offer.id)}

          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-secondary"

        >

          Withdraw

        </button>

      )}

    </div>

  )

}



function OfferCard({ offer, busy, actions }) {

  return (

    <article key={offer.id} className="panel-card bg-surface p-4">

      <div className="flex flex-wrap items-start justify-between gap-3">

        <div>

          <p className="font-semibold">{offer.property}</p>

          <p className="text-sm text-ink-secondary">

            GHS {Number(offer.amount).toLocaleString()}

            {offer.counterAmount ? ` · Counter: GHS ${Number(offer.counterAmount).toLocaleString()}` : ''}

            {' · '}{offer.updated}

          </p>

          {offer.counterNotes && <p className="mt-1 text-xs text-ink-secondary">{offer.counterNotes}</p>}

          {offer.notes && !offer.counterNotes && <p className="mt-1 text-xs text-ink-secondary">{offer.notes}</p>}

          {offer.transactionId && (

            <Link to="/transactions" className="mt-1 inline-block text-xs font-semibold text-mobile-forest underline">

              View transaction

            </Link>

          )}

        </div>

        <span className="rounded-full bg-surface-hover px-3 py-1 text-xs font-semibold capitalize text-ink">{offer.status}</span>

      </div>

      <OfferActions offer={offer} busy={busy} {...actions} />

    </article>

  )

}



function OfferRoomContent() {

  const { t } = useTranslation()

  const [tab, setTab] = useState('mine')

  const [offers, setOffers] = useState([])

  const [incoming, setIncoming] = useState([])

  const [kyc, setKyc] = useState(null)

  const [showForm, setShowForm] = useState(false)

  const [property, setProperty] = useState('')

  const [listingId, setListingId] = useState('')

  const [amount, setAmount] = useState('')

  const [notes, setNotes] = useState('')

  const [kycError, setKycError] = useState('')

  const [busy, setBusy] = useState(null)

  const [counterOffer, setCounterOffer] = useState(null)

  const [counterAmount, setCounterAmount] = useState('')

  const [counterNotes, setCounterNotes] = useState('')



  function reload() {

    fetchOffers().then(({ offers: rows }) => setOffers(rows))

    fetchIncomingOffers().then(({ offers: rows }) => setIncoming(rows))

    fetchMyKyc().then(({ kyc: record }) => setKyc(record))

  }



  useEffect(() => { reload() }, [])



  function openForm() {

    if (!canSubmitOffer(kyc)) {

      setKycError(t('kycPage.requiredBody'))

      setShowForm(false)

      return

    }

    setKycError('')

    setShowForm(true)

  }



  async function handleSubmit(e) {

    e.preventDefault()

    if (!canSubmitOffer(kyc)) {

      setKycError(t('kycPage.requiredBody'))

      return

    }

    setBusy('submit')

    await submitOffer({ property, amount, notes, listingId: listingId || undefined })

    reload()

    setShowForm(false)

    setProperty('')

    setListingId('')

    setAmount('')

    setNotes('')

    setBusy(null)

  }



  async function handleAcceptCounter(offer) {

    setBusy(offer.id)

    await updateOffer(offer.id, 'accept')

    reload()

    setBusy(null)

  }



  async function handleWithdraw(offerId) {

    setBusy(offerId)

    await updateOffer(offerId, 'withdraw')

    reload()

    setBusy(null)

  }



  async function handleAccept(offerId) {

    setBusy(offerId)

    await updateOffer(offerId, 'accept')

    reload()

    setBusy(null)

  }



  async function handleReject(offerId) {

    setBusy(offerId)

    await updateOffer(offerId, 'reject')

    reload()

    setBusy(null)

  }



  async function handleCounterSubmit(e) {

    e.preventDefault()

    if (!counterOffer) return

    setBusy(counterOffer.id)

    await updateOffer(counterOffer.id, 'counter', {

      counterAmount: Number(counterAmount),

      counterNotes,

    })

    setCounterOffer(null)

    setCounterAmount('')

    setCounterNotes('')

    reload()

    setBusy(null)

  }



  const displayed = tab === 'mine' ? offers : incoming



  return (

    <>

      <div className="flex flex-wrap items-start justify-between gap-3">

        <div>

          <h1 className="text-2xl font-semibold lg:hidden">Offer room</h1>

          <p className="mt-1 text-ink-secondary lg:hidden">Submit offers and track negotiation status.</p>

        </div>

        <button type="button" onClick={openForm} className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">

          New offer

        </button>

      </div>



      <div className="mt-4 flex gap-2 border-b border-surface-border">

        <button

          type="button"

          onClick={() => setTab('mine')}

          className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab === 'mine' ? 'border-brand-accent text-ink' : 'border-transparent text-ink-secondary'}`}

        >

          My offers

        </button>

        <button

          type="button"

          onClick={() => setTab('incoming')}

          className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab === 'incoming' ? 'border-brand-accent text-ink' : 'border-transparent text-ink-secondary'}`}

        >

          Incoming {incoming.length > 0 ? `(${incoming.filter((o) => o.status === 'pending').length})` : ''}

        </button>

      </div>



      <KycBanner kyc={kyc} />

      {kycError && (

        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{kycError}</p>

      )}



      {showForm && (

        <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-3 panel-card bg-surface-subtle p-5">

          <input required value={property} onChange={(e) => setProperty(e.target.value)} placeholder="Property name" className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm" />

          <input value={listingId} onChange={(e) => setListingId(e.target.value)} placeholder="Listing ID (optional)" className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm" />

          <input required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Offer amount (GHS)" className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm" />

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Terms and notes" rows={3} className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm" />

          <button type="submit" disabled={busy === 'submit'} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white">Submit offer</button>

        </form>

      )}



      {counterOffer && (

        <form onSubmit={handleCounterSubmit} className="mt-6 max-w-lg space-y-3 panel-card bg-surface-subtle p-5">

          <p className="text-sm font-semibold">Counter offer for {counterOffer.property}</p>

          <input required type="number" value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)} placeholder="Counter amount (GHS)" className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm" />

          <textarea value={counterNotes} onChange={(e) => setCounterNotes(e.target.value)} placeholder="Counter terms" rows={2} className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm" />

          <div className="flex gap-2">

            <button type="submit" disabled={busy === counterOffer.id} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white">Send counter</button>

            <button type="button" onClick={() => setCounterOffer(null)} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold text-ink-secondary">Cancel</button>

          </div>

        </form>

      )}



      <div className="mt-8 space-y-3">

        {displayed.length === 0 && (

          <p className="text-sm text-ink-secondary">

            {tab === 'incoming' ? 'No incoming offers on your listings.' : 'No offers yet — submit one to get started.'}

          </p>

        )}

        {displayed.map((o) => (

          <OfferCard

            key={o.id}

            offer={o}

            busy={busy}

            actions={tab === 'mine' ? {

              onAcceptCounter: handleAcceptCounter,

              onWithdraw: handleWithdraw,

            } : {

              onCounter: (offer) => { setCounterOffer(offer); setCounterAmount(String(offer.amount)); },

              onAccept: handleAccept,

              onReject: handleReject,

            }}

          />

        ))}

      </div>

    </>

  )

}



function OfferRoomLayout() {

  return (

    <ResponsivePageShell title="Offer room" subtitle="Submit and negotiate offers">

      <OfferRoomContent />

    </ResponsivePageShell>

  )

}



export default function OfferRoomPage() {

  return <ProtectedRoute><OfferRoomLayout /></ProtectedRoute>

}


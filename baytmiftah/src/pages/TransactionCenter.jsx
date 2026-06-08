import React, { useEffect, useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import { transactionService } from '../services/production-service'

const checklistItems = [
  'Identity verified',
  'Ownership documents reviewed',
  'Offer accepted',
  'E-sign packet completed',
  'Payment proof attached',
  'Closing handover scheduled',
]

export default function TransactionCenter() {
  const [summary, setSummary] = useState({ documents: [], negotiations: [], checklists: [] })
  const [documentTitle, setDocumentTitle] = useState('')
  const [counterAmount, setCounterAmount] = useState('')
  const [status, setStatus] = useState('')

  const loadSummary = () => transactionService.getSummary().then(setSummary)

  useEffect(() => {
    loadSummary()
  }, [])

  const addDocument = async (event) => {
    event.preventDefault()
    await transactionService.addDocument({
      title: documentTitle,
      documentType: 'deal_document',
      status: 'draft',
    })
    setDocumentTitle('')
    setStatus('Document added to the transaction vault.')
    loadSummary()
  }

  const addCounterOffer = async (event) => {
    event.preventDefault()
    await transactionService.addCounterOffer({
      amount: Number(counterAmount),
      message: 'Counter-offer staged from BaytMiftah transaction center.',
    })
    setCounterAmount('')
    setStatus('Counter-offer recorded.')
    loadSummary()
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Transaction Center" />
        <div className="page-shell">
          <div className="content-shell grid gap-5 xl:grid-cols-[1fr_360px]">
            <section className="space-y-6">
              <div className="panel">
                <h2 className="text-2xl font-semibold text-secondary">Document vault</h2>
                <form onSubmit={addDocument} className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    className="input-field flex-1"
                    value={documentTitle}
                    onChange={(event) => setDocumentTitle(event.target.value)}
                    placeholder="Add document title"
                    required
                  />
                  <button className="btn-primary">Add document</button>
                </form>
                <div className="mt-5 grid gap-3">
                  {summary.documents.map((doc) => (
                    <article key={doc.id} className="panel-inset">
                      <p className="font-semibold">{doc.title}</p>
                      <p className="text-sm text-on-surface-variant">{doc.document_type || doc.documentType} / {doc.status}</p>
                    </article>
                  ))}
                  {summary.documents.length === 0 && <p className="text-sm text-on-surface-variant">No documents yet.</p>}
                </div>
              </div>

              <div className="panel">
                <h2 className="text-2xl font-semibold text-secondary">Negotiation thread</h2>
                <form onSubmit={addCounterOffer} className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="number"
                    className="input-field flex-1"
                    value={counterAmount}
                    onChange={(event) => setCounterAmount(event.target.value)}
                    placeholder="Counter amount"
                    required
                  />
                  <button className="btn-secondary">Record counter</button>
                </form>
                <div className="mt-5 grid gap-3">
                  {summary.negotiations.map((event) => (
                    <article key={event.id} className="panel-inset">
                      <p className="font-semibold">{event.event_type || 'Event'} {event.amount ? `/ GHS ${event.amount}` : ''}</p>
                      <p className="text-sm text-on-surface-variant">{event.message || event.status}</p>
                    </article>
                  ))}
                  {summary.negotiations.length === 0 && <p className="text-sm text-on-surface-variant">No negotiation events yet.</p>}
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <section className="panel bg-[#111827] text-white">
                <h2 className="text-2xl font-semibold">Closing checklist</h2>
                <ul className="mt-5 space-y-3">
                  {checklistItems.map((item, index) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className={`material-symbols-outlined ${index < 2 ? 'text-[#E9C349]' : 'text-white/35'}`}>
                        {index < 2 ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="panel">
                <h2 className="text-xl font-semibold text-secondary">Provider readiness</h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  E-sign provider, document storage policies, and payment proof verification can plug into this transaction contract.
                </p>
              </section>
              {status && <p className="rounded-md bg-secondary/10 p-3 text-sm text-secondary">{status}</p>}
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}

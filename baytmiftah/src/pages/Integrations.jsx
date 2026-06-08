import React, { useEffect, useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import { messagingService } from '../services/production-service'

const integrations = [
  ['Email', 'Resend', 'Transactional templates and saved-search alerts'],
  ['SMS', 'Twilio', 'Viewing reminders and urgent lead notifications'],
  ['WhatsApp', 'WhatsApp Business', 'Agent handoff, lead follow-up, booking updates'],
  ['Push', 'Web Push', 'Browser notifications for saves, leads, and bookings'],
]

export default function Integrations() {
  const [logs, setLogs] = useState([])
  const [dispatch, setDispatch] = useState({
    channel: 'email',
    recipient: '',
    title: 'BaytMiftah test',
    body: 'Delivery pipeline test.',
  })
  const [status, setStatus] = useState('')

  const loadLogs = () => messagingService.listDeliveryLogs().then(setLogs)

  useEffect(() => {
    loadLogs()
  }, [])

  const queueDispatch = async (event) => {
    event.preventDefault()
    const result = await messagingService.queueDispatch(dispatch)
    setStatus(result.source === 'local' ? 'Delivery staged locally.' : 'Delivery queued.')
    loadLogs()
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Integrations" />
        <div className="px-4 pt-24 md:px-8">
          <div className="mx-auto max-w-container space-y-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {integrations.map(([name, provider, description]) => (
                <article key={name} className="rounded-lg border border-outline-variant bg-surface-container p-6">
                  <p className="text-sm font-bold uppercase tracking-widest text-secondary">{provider}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{name}</h2>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <form onSubmit={queueDispatch} className="rounded-lg border border-outline-variant bg-surface-container p-6">
                <h2 className="text-2xl font-semibold text-secondary">Queue test delivery</h2>
                <div className="mt-5 grid gap-3">
                  <select
                    className="input-field"
                    value={dispatch.channel}
                    onChange={(event) => setDispatch((current) => ({ ...current, channel: event.target.value }))}
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="push">Push</option>
                  </select>
                  <input
                    className="input-field"
                    value={dispatch.recipient}
                    onChange={(event) => setDispatch((current) => ({ ...current, recipient: event.target.value }))}
                    placeholder="Recipient"
                  />
                  <input
                    className="input-field"
                    value={dispatch.title}
                    onChange={(event) => setDispatch((current) => ({ ...current, title: event.target.value }))}
                  />
                  <textarea
                    className="input-field min-h-24"
                    value={dispatch.body}
                    onChange={(event) => setDispatch((current) => ({ ...current, body: event.target.value }))}
                  />
                  <button className="btn-primary justify-center">Queue delivery</button>
                </div>
                {status && <p className="mt-4 text-sm text-secondary">{status}</p>}
              </form>

              <section className="rounded-lg border border-outline-variant bg-surface-container p-6">
                <h2 className="text-2xl font-semibold text-secondary">Delivery logs</h2>
                <div className="mt-5 space-y-3">
                  {logs.map((log) => (
                    <article key={log.id} className="rounded-md bg-surface p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold">{log.title || log.channel}</p>
                          <p className="text-sm text-on-surface-variant">{log.recipient || 'No recipient'} / {log.channel}</p>
                        </div>
                        <span className="rounded-full bg-secondary/15 px-3 py-1 text-sm font-semibold text-secondary">
                          {log.status}
                        </span>
                      </div>
                    </article>
                  ))}
                  {logs.length === 0 && (
                    <div className="rounded-md border border-dashed border-outline-variant p-8 text-center text-on-surface-variant">
                      No delivery logs yet.
                    </div>
                  )}
                </div>
              </section>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

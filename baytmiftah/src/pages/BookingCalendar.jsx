import React, { useEffect, useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import { DataBanner } from '../components/UI'
import { channelCalendarService } from '../services/production-service'

export default function BookingCalendar() {
  const [blocks, setBlocks] = useState([])
  const [form, setForm] = useState({
    provider: 'booking.com',
    importUrl: '',
    startsOn: '',
    endsOn: '',
    reason: 'Owner hold',
  })
  const [status, setStatus] = useState('')

  const loadBlocks = () => channelCalendarService.listBlocks().then(setBlocks)

  useEffect(() => {
    loadBlocks()
  }, [])

  const addBlock = async (event) => {
    event.preventDefault()
    await channelCalendarService.createBlock({
      startsOn: form.startsOn,
      endsOn: form.endsOn,
      reason: form.reason,
      source: 'manual',
      status: 'occupied',
    })
    setStatus('Availability block added.')
    loadBlocks()
  }

  const connectChannel = async () => {
    const result = await channelCalendarService.connectChannel({
      provider: form.provider,
      importUrl: form.importUrl,
    })
    setStatus(
      result.export_token
        ? `Channel connected. Export token: ${result.export_token}`
        : 'Channel connection staged locally.'
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Availability Calendar" />
        <div className="page-shell">
          <div className="content-shell section-stack">
            <DataBanner
              title="Channel sync ready"
              description="Use iCal import/export first, then replace the same contract with Booking.com Connectivity or a channel manager API when provider access is approved."
            />

            <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="panel">
                <h2 className="text-2xl font-semibold text-secondary">Occupied dates</h2>
                <div className="mt-5 grid gap-3">
                  {blocks.map((block) => (
                    <article key={block.id} className="panel-inset">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold">{block.reason || 'Occupied'}</p>
                          <p className="text-sm text-on-surface-variant">
                            {block.starts_on || block.startsOn} to {block.ends_on || block.endsOn}
                          </p>
                        </div>
                        <span className="rounded-full bg-secondary/15 px-3 py-1 text-sm font-semibold text-secondary">
                          {block.source || 'baytmiftah'}
                        </span>
                      </div>
                    </article>
                  ))}
                  {blocks.length === 0 && (
                    <div className="empty-panel">
                      No occupied dates yet.
                    </div>
                  )}
                </div>
              </div>

              <aside className="space-y-6">
                <section className="panel">
                  <h2 className="text-xl font-semibold text-secondary">Connect channel</h2>
                  <label className="mt-4 block">
                    <span className="text-sm font-semibold">Provider</span>
                    <select
                      className="input-field mt-2"
                      value={form.provider}
                      onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value }))}
                    >
                      <option value="booking.com">Booking.com</option>
                      <option value="airbnb">Airbnb</option>
                      <option value="vrbo">Vrbo</option>
                      <option value="google-calendar">Google Calendar</option>
                    </select>
                  </label>
                  <label className="mt-4 block">
                    <span className="text-sm font-semibold">iCal import URL</span>
                    <input
                      className="input-field mt-2"
                      value={form.importUrl}
                      onChange={(event) => setForm((current) => ({ ...current, importUrl: event.target.value }))}
                      placeholder="https://..."
                    />
                  </label>
                  <button onClick={connectChannel} className="btn-secondary mt-5 w-full justify-center">
                    Connect calendar
                  </button>
                </section>

                <form onSubmit={addBlock} className="panel">
                  <h2 className="text-xl font-semibold text-secondary">Manual block</h2>
                  <div className="mt-4 grid gap-3">
                    <input
                      type="date"
                      className="input-field"
                      value={form.startsOn}
                      onChange={(event) => setForm((current) => ({ ...current, startsOn: event.target.value }))}
                      required
                    />
                    <input
                      type="date"
                      className="input-field"
                      value={form.endsOn}
                      onChange={(event) => setForm((current) => ({ ...current, endsOn: event.target.value }))}
                      required
                    />
                    <input
                      className="input-field"
                      value={form.reason}
                      onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                    />
                    <button className="btn-primary justify-center">Block dates</button>
                  </div>
                </form>
              </aside>
            </section>

            {status && <p className="rounded-md bg-secondary/10 p-3 text-sm text-secondary">{status}</p>}
          </div>
        </div>
      </main>
    </div>
  )
}

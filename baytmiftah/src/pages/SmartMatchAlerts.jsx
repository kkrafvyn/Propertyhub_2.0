import React, { useEffect, useState } from 'react'
import Header from '../components/Header'
import Navigation from '../components/Navigation'
import { Badge, DataBanner, EmptyState, LoadingState } from '../components/UI'
import { smartMatchService } from '../services/product-feature-service'

export default function SmartMatchAlerts() {
  const [alerts, setAlerts] = useState([])
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({
    name: '',
    location: '',
    budget: '',
    cadence: 'Instant',
  })

  const loadAlerts = async () => {
    setLoading(true)
    const result = await smartMatchService.listAlerts()
    setAlerts(result.alerts)
    setSource(result.source)
    setLoading(false)
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  const saveAlert = async (event) => {
    event.preventDefault()
    const result = await smartMatchService.saveAlert(form)
    setStatus(
      result.source === 'supabase'
        ? 'Smart match saved to Supabase.'
        : 'Smart match staged locally until saved-search persistence is deployed.'
    )
    setForm({ name: '', location: '', budget: '', cadence: 'Instant' })
    loadAlerts()
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Smart Match Alerts" showBack />
        <div className="page-shell">
          <div className="content-shell section-stack">
            <DataBanner
              variant={source === 'supabase' ? 'info' : 'warning'}
              title="Buyer alerts and saved search automation"
              description="Turn search intent into alerts that can trigger push, email, WhatsApp, and realtime updates once notification providers are live."
            />

            <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div className="panel">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-2xl font-semibold text-secondary">Active match rules</h2>
                  <Badge variant={source === 'supabase' ? 'success' : 'warning'}>{source || 'loading'}</Badge>
                </div>
                {loading ? (
                  <LoadingState className="mt-6" title="Loading match rules" />
                ) : alerts.length ? (
                  <div className="mt-6 grid gap-3">
                    {alerts.map((alert) => (
                      <article key={alert.id} className="panel-inset">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="font-semibold">{alert.name}</p>
                            <p className="mt-1 text-sm text-on-surface-variant">
                              {alert.location} / {alert.budget} / {alert.cadence}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={alert.status === 'active' ? 'success' : 'warning'}>{alert.status}</Badge>
                            <Badge variant="secondary">{alert.matches} matches</Badge>
                            {alert.channels.map((channel) => (
                              <Badge key={channel} variant="primary">{channel}</Badge>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="travel_explore"
                    title="No smart matches"
                    description="Create a rule from budget, area, and channel preferences."
                  />
                )}
              </div>

              <aside className="panel">
                <h2 className="text-xl font-semibold text-secondary">Create alert</h2>
                <form onSubmit={saveAlert} className="mt-5 grid gap-3">
                  <input
                    className="input-field"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Alert name"
                    required
                  />
                  <input
                    className="input-field"
                    value={form.location}
                    onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                    placeholder="Preferred area"
                    required
                  />
                  <input
                    className="input-field"
                    value={form.budget}
                    onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))}
                    placeholder="Budget"
                  />
                  <select
                    className="input-field"
                    value={form.cadence}
                    onChange={(event) => setForm((current) => ({ ...current, cadence: event.target.value }))}
                  >
                    <option>Instant</option>
                    <option>Daily digest</option>
                    <option>Weekly digest</option>
                  </select>
                  <button className="btn-primary justify-center">Save alert</button>
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

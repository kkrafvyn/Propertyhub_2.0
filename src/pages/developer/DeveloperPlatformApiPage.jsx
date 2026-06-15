import { useEffect, useState } from 'react'
import DeveloperShell from '../../components/DeveloperShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchPlatformServices, fetchMarketRegions, resolveRegionConfig, fetchPlatformArchitecture, fetchAnalyticsFacts, fetchPartnerApiKeys, createPartnerApiKey, revokePartnerApiKey, runAnalyticsAggregation, fetchPlatformGateway, fetchPaymentsConfig } from '../../services/platform-service'
import { setStoredRegionId } from '../../lib/market-context'

function PlatformApi() {
  const [services, setServices] = useState([])
  const [regions, setRegions] = useState([])
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [config, setConfig] = useState(null)
  const [architecture, setArchitecture] = useState(null)
  const [facts, setFacts] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [newKeyName, setNewKeyName] = useState('Production partner')
  const [createdKey, setCreatedKey] = useState(null)
  const [aggMessage, setAggMessage] = useState('')
  const [webhooks, setWebhooks] = useState(null)
  const [cronUrl, setCronUrl] = useState('')

  useEffect(() => {
    fetchPlatformServices().then(({ services: rows }) => setServices(rows ?? []))
    fetchPlatformArchitecture().then(setArchitecture)
    fetchAnalyticsFacts().then(({ facts: rows }) => setFacts(rows ?? []))
    fetchMarketRegions().then(({ regions: rows }) => {
      setRegions(rows ?? [])
      if (rows?.[0]) setSelectedRegion(rows[0].id)
    })
    fetchPartnerApiKeys().then(({ keys }) => setApiKeys(keys ?? []))
    Promise.all([fetchPlatformGateway(), fetchPaymentsConfig()]).then(([gw, pay]) => {
      setWebhooks(gw?.webhooks ?? pay?.webhooks ?? {})
      setCronUrl(gw?.cron?.nightly ?? '')
    })
  }, [])

  useEffect(() => {
    if (!selectedRegion) return
    resolveRegionConfig({ regionId: selectedRegion }).then(setConfig)
  }, [selectedRegion])

  function handleRegionChange(id) {
    setSelectedRegion(id)
    setStoredRegionId(id)
  }

  async function handleCreateKey() {
    const result = await createPartnerApiKey(newKeyName)
    if (result?.key) setCreatedKey(result.key)
    fetchPartnerApiKeys().then(({ keys }) => setApiKeys(keys ?? []))
  }

  async function handleRevokeKey(id) {
    await revokePartnerApiKey(id)
    fetchPartnerApiKeys().then(({ keys }) => setApiKeys(keys ?? []))
  }

  async function handleAggregate() {
    const result = await runAnalyticsAggregation(selectedRegion)
    setAggMessage(`Aggregated ${result.count ?? 0} facts for ${result.period ?? 'current period'}.`)
    fetchAnalyticsFacts().then(({ facts: rows }) => setFacts(rows ?? []))
  }

  return (
    <DeveloperShell title="Platform API" subtitle="Global Real Estate OS — production architecture">
      {architecture && (
        <section className="mb-8 rounded-xl border border-surface-border bg-surface-subtle p-4">
          <p className="text-sm font-semibold text-ink">{architecture.philosophy}</p>
          <p className="mt-2 text-xs text-ink-secondary">{architecture.booking_flow}</p>
          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
            <div><span className="font-semibold">Clients</span><p className="text-ink-secondary">{architecture.clients?.join(' · ')}</p></div>
            <div><span className="font-semibold">Gateway</span><p className="text-ink-secondary">{architecture.gateway?.path}</p></div>
            <div><span className="font-semibold">Integrations</span><p className="text-ink-secondary">{architecture.integrations?.length ?? 0} partners</p></div>
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Core services</h2>
        <p className="mb-4 text-sm text-ink-secondary">
          Frontend is optional. Partners integrate via Edge Functions — property, booking, utility, billing, payments, wallet, identity.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((svc) => (
            <article key={svc.id} className="panel-card bg-surface p-4">
              <p className="font-semibold text-ink">{svc.name}</p>
              <code className="mt-1 block text-xs text-ink-secondary">
                {svc.path ?? `/functions/v1/${svc.fn}`}
              </code>
            </article>
          ))}
        </div>
      </section>

      {webhooks && (
        <section className="mb-8">
          <h2 className="mb-2 text-lg font-semibold">Payment webhooks</h2>
          <p className="mb-3 text-sm text-ink-secondary">Register these URLs in Paystack, Stripe, and Razorpay dashboards.</p>
          <ul className="space-y-2 text-sm">
            {Object.entries(webhooks).map(([provider, url]) => (
              <li key={provider} className="rounded-lg border border-surface-border px-3 py-2">
                <span className="font-semibold capitalize">{provider}</span>
                <code className="mt-1 block break-all text-xs text-ink-secondary">{url}</code>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cronUrl && (
        <section className="mb-8">
          <h2 className="mb-2 text-lg font-semibold">Nightly cron</h2>
          <p className="mb-2 text-sm text-ink-secondary">
            POST with <code className="text-xs">Authorization: Bearer CRON_SECRET</code> — schedule daily in Supabase Cron or GitHub Actions.
          </p>
          <code className="block break-all rounded-lg border border-surface-border bg-surface-subtle px-3 py-2 text-xs">{cronUrl}</code>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Region-by-region scaling</h2>
        <p className="mb-4 text-sm text-ink-secondary">
          Launch one market tier at a time. Each region loads its own utility, payment, and compliance plugins.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {regions.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleRegionChange(r.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${selectedRegion === r.id ? 'bg-brand-accent text-white' : 'border border-surface-border'}`}
            >
              {r.name}
            </button>
          ))}
        </div>
        {config && (
          <div className="grid gap-4 sm:grid-cols-3">
            {['utility', 'payment', 'compliance'].map((mod) => {
              const block = config.plugins?.[mod] ?? config.modules?.[mod]
              return (
                <article key={mod} className="panel-card bg-surface-subtle p-4">
                  <p className="text-xs font-bold uppercase text-ink-secondary">{mod}</p>
                  <p className="mt-1 font-semibold capitalize">{block?.default ?? '—'}</p>
                  <ul className="mt-2 space-y-1 text-xs text-ink-secondary">
                    {(block?.adapters ?? []).slice(0, 4).map((a) => (
                      <li key={a.adapter_id ?? a.id}>{a.name ?? a.adapter_id}</li>
                    ))}
                  </ul>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {facts.length > 0 && (
        <section className="mb-8">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Analytics facts (warehouse layer)</h2>
            <button type="button" onClick={handleAggregate} className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold">
              Run aggregation
            </button>
          </div>
          {aggMessage && <p className="mb-2 text-sm text-ink-secondary">{aggMessage}</p>}
          <div className="grid gap-2 sm:grid-cols-3">
            {facts.slice(0, 6).map((f) => (
              <article key={f.id} className="rounded-lg border border-surface-border px-3 py-2 text-sm">
                <p className="font-semibold capitalize">{f.fact_type?.replace(/_/g, ' ')}</p>
                <p className="text-ink-secondary">{f.dimension_value}: {f.metric_value}{f.currency ? ` ${f.currency}` : ''}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Partner API keys</h2>
        <p className="mb-4 text-sm text-ink-secondary">
          Create keys for external integrations. Pass as <code className="text-xs">X-Api-Key: bm_live_…</code> — rate limited per key.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            placeholder="Key name"
          />
          <button type="button" onClick={handleCreateKey} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white">
            Create API key
          </button>
        </div>
        {createdKey && (
          <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:bg-amber-900/20">
            New key (copy now): <code className="break-all text-xs">{createdKey}</code>
          </p>
        )}
        <ul className="space-y-2 text-sm">
          {apiKeys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border px-3 py-2">
              <span>{k.name} · <code className="text-xs">{k.key_prefix}…</code></span>
              <button type="button" onClick={() => handleRevokeKey(k.id)} className="text-xs font-semibold text-red-600">Revoke</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Partner integration</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-ink-secondary">
          <li>Utility aggregators plug into <code className="text-xs">/utilities</code></li>
          <li>Fintech partners via <code className="text-xs">/payments</code> (Paystack, Stripe, Razorpay)</li>
          <li>Property managers via <code className="text-xs">/platform?action=resolve</code></li>
          <li>Manual fallback always available when API partners are unavailable</li>
        </ul>
      </section>
    </DeveloperShell>
  )
}

export default function DeveloperPlatformApiPage() {
  return <ProtectedRoute><PlatformApi /></ProtectedRoute>
}

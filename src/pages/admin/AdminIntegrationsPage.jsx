import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchDocuSignConnect } from '../../services/docusign-service'

function Integrations() {
  const [config, setConfig] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDocuSignConnect()
      .then(setConfig)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <AdminShell titleKey="hubs.admin.integrations.title" subtitleKey="hubs.admin.integrations.subtitle">
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <section className="panel-card bg-surface-subtle p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">DocuSign Connect</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${config?.configured ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'}`}>
            {config?.configured ? 'API keys set' : 'Demo mode'}
          </span>
        </div>

        {config && (
          <>
            <p className="mt-3 text-sm text-ink-secondary">Register this webhook URL in DocuSign Admin → Integrations → Connect:</p>
            <code className="mt-2 block break-all rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs">{config.webhook_url}</code>

            <p className="mt-4 text-sm font-semibold">Return URL (after signing)</p>
            <code className="mt-1 block break-all text-xs text-ink-secondary">{config.return_url}</code>

            <p className="mt-4 text-sm font-semibold">Subscribe to events</p>
            <ul className="mt-1 list-inside list-disc text-sm text-ink-secondary">
              {(config.events ?? []).map((ev) => (
                <li key={ev}>{ev}</li>
              ))}
            </ul>

            <ol className="mt-6 space-y-2 text-sm text-ink-secondary">
              {(config.registration_steps ?? []).map((step, i) => (
                <li key={step}><span className="font-semibold text-ink">{i + 1}.</span> {step}</li>
              ))}
            </ol>

            <p className="mt-6 text-xs text-ink-secondary">
              Edge secrets: {(config.env_vars ?? []).join(' · ')}
            </p>
          </>
        )}
      </section>
    </AdminShell>
  )
}

export default function AdminIntegrationsPage() {
  return <ProtectedRoute><Integrations /></ProtectedRoute>
}

import { useEffect, useState } from 'react'
import ManageShell from '../../components/ManageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { PanelCard } from '../../components/ui/AirbnbUI'
import { fetchIncomingRentalApplications, reviewRentalApplication } from '../../services/rental-application-service'
import { useTranslation } from '../../i18n/LocaleContext'

function Applications() {
  const { t } = useTranslation()
  const [applications, setApplications] = useState([])
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState('')

  function reload() {
    fetchIncomingRentalApplications().then(({ applications: rows }) => setApplications(rows ?? []))
  }

  useEffect(() => { reload() }, [])

  async function handleReview(id, decision) {
    setBusy(id)
    setMessage('')
    const result = await reviewRentalApplication(id, decision)
    if (result?.lease_id) {
      setMessage(`Application approved — lease ${result.lease_id} created. Tenant can sign in Renter workspace.`)
    } else if (result?.ok) {
      setMessage(decision === 'approved' ? 'Application approved.' : 'Application rejected.')
    }
    reload()
    setBusy(null)
  }

  const pending = applications.filter((a) => a.status === 'submitted')

  return (
    <ManageShell titleKey="hubs.manage.applications.title" subtitleKey="hubs.manage.applications.subtitle">
      {message && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm text-ink">{message}</p>
      )}

      {pending.length === 0 && applications.length === 0 ? (
        <PanelCard title={t('hubs.manage.applications.empty')}>
          <p className="text-sm text-ink-secondary">When renters apply to your listings, they appear here for approval.</p>
        </PanelCard>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <article key={app.id} className="panel-card bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{app.property}</p>
                  <p className="text-sm text-ink-secondary">
                    Move-in: {app.moveInDate ?? '—'}
                    {app.income ? ` · Income GHS ${Number(app.income).toLocaleString()}` : ''}
                    {app.occupants ? ` · ${app.occupants} occupant(s)` : ''}
                  </p>
                  {app.notes && <p className="mt-1 text-xs text-ink-secondary">{app.notes}</p>}
                  {app.leaseId && (
                    <p className="mt-1 text-xs font-semibold text-mobile-forest">Lease: {app.leaseId}</p>
                  )}
                </div>
                <span className="rounded-full bg-surface-hover px-3 py-1 text-xs font-semibold capitalize text-ink">{app.status}</span>
              </div>
              {app.status === 'submitted' && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy === app.id}
                    onClick={() => handleReview(app.id, 'approved')}
                    className="rounded-lg bg-mobile-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy === app.id}
                    onClick={() => handleReview(app.id, 'rejected')}
                    className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold text-ink-secondary disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </ManageShell>
  )
}

export default function ManageApplicationsPage() {
  return <ProtectedRoute><Applications /></ProtectedRoute>
}

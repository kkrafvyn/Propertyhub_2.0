import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../../components/DesktopShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import RoleProtectedRoute from '../../components/RoleProtectedRoute'
import AdminShell from '../../components/AdminShell'
import { Badge, PageTitle, PrimaryButton, TextLink } from '../../components/ui/AirbnbUI'
import { useTranslation } from '../../i18n/LocaleContext'
import {
  assignServiceRequest,
  fetchMyServiceRequests,
  fetchServiceRequestQueue,
  syncDirectoryProfiles,
  updateServiceRequestStatus,
} from '../../services/marketplace-profiles-service'

function statusTone(status) {
  if (status === 'completed') return 'success'
  if (status === 'assigned') return 'accent'
  if (status === 'cancelled') return 'neutral'
  return 'warning'
}

export function MyServiceRequestsPage() {
  const { t } = useTranslation()
  const [requests, setRequests] = useState([])

  useEffect(() => {
    fetchMyServiceRequests().then(({ requests: rows }) => setRequests(rows ?? []))
  }, [])

  async function cancelRequest(id) {
    await updateServiceRequestStatus({ requestId: id, status: 'cancelled' })
    fetchMyServiceRequests().then(({ requests: rows }) => setRequests(rows ?? []))
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      <TextLink to="/services" className="mb-4 inline-block">{t('marketplaceDiscovery.backToServices')}</TextLink>
      <PageTitle title={t('marketplaceDiscovery.myRequestsTitle')} />
      <div className="space-y-3">
        {requests.length === 0 && (
          <p className="text-ink-secondary">{t('marketplaceDiscovery.noRequests')}</p>
        )}
        {requests.map((r) => (
          <article key={r.id} className="panel-card bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{r.marketplace_services?.name ?? r.service_id}</p>
                <p className="text-sm text-ink-secondary">{r.marketplace_services?.provider ?? '—'}</p>
                {r.message && <p className="mt-2 text-sm text-ink-secondary">{r.message}</p>}
                {r.provider_name && (
                  <p className="mt-1 text-sm">{t('marketplaceDiscovery.assignedTo', { provider: r.provider_name })}</p>
                )}
              </div>
              <Badge tone={statusTone(r.status)}>{r.status}</Badge>
            </div>
            {r.status === 'open' && (
              <button type="button" onClick={() => cancelRequest(r.id)} className="mt-3 text-sm font-semibold text-ink underline">
                {t('marketplaceDiscovery.cancelRequest')}
              </button>
            )}
          </article>
        ))}
      </div>
    </DesktopShell>
  )
}

export function ServiceDispatchPage() {
  const { t } = useTranslation()
  const [requests, setRequests] = useState([])
  const [providers, setProviders] = useState([])
  const [assignments, setAssignments] = useState({})
  const [message, setMessage] = useState('')

  function reload() {
    fetchServiceRequestQueue().then(({ requests: rows, providers: provs }) => {
      setRequests(rows ?? [])
      setProviders(provs ?? [])
    })
  }

  useEffect(() => { reload() }, [])

  async function handleAssign(requestId) {
    const providerName = assignments[requestId]
    if (!providerName) return
    await assignServiceRequest({ requestId, providerName })
    reload()
  }

  async function markComplete(requestId) {
    await updateServiceRequestStatus({ requestId, status: 'completed' })
    reload()
  }

  async function handleSyncDirectory() {
    const result = await syncDirectoryProfiles()
    setMessage(t('marketplaceDiscovery.directorySynced', {
      agencies: result?.agenciesSynced ?? 0,
      agents: result?.agentsSynced ?? 0,
    }))
  }

  return (
    <AdminShell titleKey="marketplaceDiscovery.dispatchTitle" subtitleKey="marketplaceDiscovery.dispatchSubtitle">
      <div className="mb-6 flex flex-wrap gap-3">
        <PrimaryButton type="button" onClick={handleSyncDirectory}>{t('marketplaceDiscovery.syncDirectory')}</PrimaryButton>
        <Link to="/agencies" className="self-center text-sm font-semibold text-brand-accent underline">{t('marketplaceDiscovery.viewDirectory')}</Link>
      </div>
      {message && <p className="mb-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm">{message}</p>}
      <div className="space-y-4">
        {requests.length === 0 && (
          <p className="text-ink-secondary">{t('marketplaceDiscovery.queueEmpty')}</p>
        )}
        {requests.map((r) => (
          <article key={r.id} className="panel-card bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{r.marketplace_services?.name ?? r.service_id}</p>
                <p className="text-sm text-ink-secondary">{r.message || t('marketplaceDiscovery.noMessage')}</p>
                <p className="mt-1 text-xs text-ink-muted">{new Date(r.created_at).toLocaleString()}</p>
              </div>
              <Badge tone={statusTone(r.status)}>{r.status}</Badge>
            </div>
            {r.status !== 'completed' && (
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <select
                  className="rounded-lg border border-surface-border px-3 py-2 text-sm"
                  value={assignments[r.id] ?? r.provider_name ?? ''}
                  onChange={(e) => setAssignments((prev) => ({ ...prev, [r.id]: e.target.value }))}
                >
                  <option value="">{t('marketplaceDiscovery.selectProvider')}</option>
                  {providers.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <PrimaryButton type="button" onClick={() => handleAssign(r.id)}>{t('marketplaceDiscovery.assignProvider')}</PrimaryButton>
                {r.status === 'assigned' && (
                  <button type="button" onClick={() => markComplete(r.id)} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold">
                    {t('marketplaceDiscovery.markComplete')}
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </AdminShell>
  )
}

export function MyServiceRequestsPageExport() {
  return <ProtectedRoute><MyServiceRequestsPage /></ProtectedRoute>
}

export function ServiceDispatchPageExport() {
  return (
    <RoleProtectedRoute require={['admin', 'moderation', 'agency', 'manage']}>
      <ServiceDispatchPage />
    </RoleProtectedRoute>
  )
}

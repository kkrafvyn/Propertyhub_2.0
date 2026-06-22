import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../../components/DesktopShell'
import { Badge, HubLinkCard, ItemCard, PageTitle, PrimaryButton, StatCard, StatGrid, TextLink } from '../../components/ui/AirbnbUI'
import { useTranslation } from '../../i18n/LocaleContext'
import {
  fetchMarketplaceServices,
  fetchPublicAgencies,
  fetchPublicAgency,
  fetchPublicAgents,
  fetchPublicAgent,
  requestMarketplaceService,
} from '../../services/marketplace-profiles-service'
import { fetchListings } from '../../services/marketplace-service'
import ListingCard from '../../components/ListingCard'

export function ServicesMarketplacePage() {
  const { t } = useTranslation()
  const [services, setServices] = useState([])
  const [selected, setSelected] = useState(null)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchMarketplaceServices().then(({ services: rows }) => setServices(rows ?? []))
  }, [])

  async function submitRequest() {
    if (!selected) return
    setSubmitting(true)
    setStatus(null)
    const result = await requestMarketplaceService({ serviceId: selected.id, message })
    setSubmitting(false)
    setStatus(result.ok ? 'sent' : 'failed')
    if (result.ok) {
      setSelected(null)
      setMessage('')
    }
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      <PageTitle title={t('marketplaceDiscovery.services.title')} />
      <div className="mb-4">
        <TextLink to="/services/requests">{t('marketplaceDiscovery.trackRequests')}</TextLink>
      </div>
      {status === 'sent' && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">{t('marketplaceDiscovery.serviceRequestSent')}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <ItemCard key={s.id} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{s.name}</p>
                <p className="text-sm text-ink-secondary">{s.provider}</p>
              </div>
              {s.verified && <Badge tone="success">{t('common.verified')}</Badge>}
            </div>
            <p className="mt-2 text-xs uppercase tracking-wide text-ink-secondary">{s.category}</p>
            <p className="mt-1 text-sm font-medium text-ink">{s.price}</p>
            <p className="mt-1 text-sm text-ink-secondary">{t('marketplaceDiscovery.rating', { rating: s.rating })}</p>
            <PrimaryButton type="button" onClick={() => setSelected(s)} className="mt-4 w-full">{t('marketplaceDiscovery.requestService')}</PrimaryButton>
          </ItemCard>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-card">
            <h3 className="text-lg font-semibold">{t('marketplaceDiscovery.serviceRequestTitle')}</h3>
            <p className="mt-1 text-sm text-ink-secondary">{selected.name}</p>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="mt-4 w-full rounded-lg border border-surface-border px-3 py-2 text-sm" placeholder={t('marketplaceDiscovery.serviceRequestMessage')} />
            {status === 'failed' && <p className="mt-2 text-sm text-red-600">{t('marketplaceDiscovery.serviceRequestFailed')}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold">{t('common.close')}</button>
              <button type="button" onClick={submitRequest} disabled={submitting} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{t('marketplaceDiscovery.serviceRequestSubmit')}</button>
            </div>
          </div>
        </div>
      )}
    </DesktopShell>
  )
}

export function AgenciesIndexPage() {
  const { t } = useTranslation()
  const [agencies, setAgencies] = useState([])

  useEffect(() => {
    fetchPublicAgencies().then(({ agencies: rows }) => setAgencies(rows ?? []))
  }, [])

  return (
    <DesktopShell search={<CompactSearch />}>
      <PageTitle title={t('marketplaceDiscovery.agencies.title')} />
      <div className="grid gap-4 sm:grid-cols-2">
        {agencies.map((a) => (
          <HubLinkCard
            key={a.id}
            to={`/agencies/${a.id}`}
            label={a.name}
            desc={`${a.location} · ${t('marketplaceDiscovery.trustScore', { score: a.trustScore })} · ${a.activeListings} ${t('marketplaceDiscovery.listings')}`}
          />
        ))}
      </div>
    </DesktopShell>
  )
}

export function AgencyProfilePage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [agency, setAgency] = useState(null)
  const [reputation, setReputation] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchPublicAgency(id).then(({ agency: a, reputation: rep }) => {
        setAgency(a)
        setReputation(rep)
      }),
      fetchListings().then(({ listings: rows }) => setListings((rows ?? []).slice(0, 4))),
    ]).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <DesktopShell search={<CompactSearch />}>
        <p className="text-ink-secondary">{t('common.loading')}</p>
      </DesktopShell>
    )
  }

  if (!agency) {
    return (
      <DesktopShell search={<CompactSearch />}>
        <p className="text-ink-secondary">{t('marketplaceDiscovery.agencyNotFound')}</p>
      </DesktopShell>
    )
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      <TextLink to="/agencies" className="mb-4 inline-block">{t('marketplaceDiscovery.backToAgencies')}</TextLink>
      <PageTitle
        title={agency.name}
        subtitle={agency.location}
        action={agency.verified ? <Badge tone="success">{t('marketplaceDiscovery.verifiedAgency')}</Badge> : null}
      />
      <StatGrid cols={3}>
        <StatCard label={t('marketplaceDiscovery.trustScoreLabel')} value={`${reputation?.score ?? agency.trustScore}%`} />
        <StatCard label={t('marketplaceDiscovery.activeListings')} value={agency.activeListings} />
        <StatCard label={t('marketplaceDiscovery.specialties')} value={agency.specialties?.length ?? 0} />
      </StatGrid>
      <p className="my-6 text-ink-secondary">{agency.bio}</p>
      <div className="mb-2 flex flex-wrap gap-2">
        {agency.specialties?.map((s) => (
          <span key={s} className="rounded-full bg-surface-subtle px-3 py-1 text-xs font-medium text-ink">{s}</span>
        ))}
      </div>
      <h2 className="mb-4 mt-8 text-lg font-semibold">{t('marketplaceDiscovery.featuredListings')}</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
      <PrimaryButton as={Link} to="/messages" className="mt-8">{t('marketplaceDiscovery.contactAgency')}</PrimaryButton>
    </DesktopShell>
  )
}

export function AgentsIndexPage() {
  const { t } = useTranslation()
  const [agents, setAgents] = useState([])

  useEffect(() => {
    fetchPublicAgents().then(({ agents: rows }) => setAgents(rows ?? []))
  }, [])

  return (
    <DesktopShell search={<CompactSearch />}>
      <PageTitle title={t('marketplaceDiscovery.agents.title')} />
      <div className="grid gap-4 sm:grid-cols-2">
        {agents.map((a) => (
          <HubLinkCard
            key={a.id}
            to={`/agents/${a.id}`}
            label={a.name}
            desc={`${a.agency} · ${t('marketplaceDiscovery.rating', { rating: a.rating })} · ${a.dealsClosed} ${t('marketplaceDiscovery.deals')}`}
          />
        ))}
      </div>
    </DesktopShell>
  )
}

export function AgentProfilePage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [agent, setAgent] = useState(null)
  const [reputation, setReputation] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchPublicAgent(id).then(({ agent: a, reputation: rep }) => {
      setAgent(a)
      setReputation(rep)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <DesktopShell search={<CompactSearch />}>
        <p className="text-ink-secondary">{t('common.loading')}</p>
      </DesktopShell>
    )
  }

  if (!agent) {
    return (
      <DesktopShell search={<CompactSearch />}>
        <p className="text-ink-secondary">{t('marketplaceDiscovery.agentNotFound')}</p>
      </DesktopShell>
    )
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      <TextLink to="/agents" className="mb-4 inline-block">{t('marketplaceDiscovery.backToAgents')}</TextLink>
      <PageTitle title={agent.name} subtitle={agent.agency} />
      <StatGrid cols={3}>
        <StatCard label={t('marketplaceDiscovery.ratingLabel')} value={reputation?.score ? `${Math.round(reputation.score)}%` : agent.rating} />
        <StatCard label={t('marketplaceDiscovery.dealsClosed')} value={agent.dealsClosed} />
        <StatCard label={t('marketplaceDiscovery.specialties')} value={agent.specialties?.join(', ')} />
      </StatGrid>
      <p className="my-6 text-ink-secondary">{agent.bio}</p>
      <div className="flex flex-wrap gap-3">
        <PrimaryButton as={Link} to="/messages">{t('marketplaceDiscovery.messageAgent')}</PrimaryButton>
        {agent.agencyId && (
          <Link to={`/agencies/${agent.agencyId}`} className="self-center text-sm font-semibold text-ink underline">
            {t('marketplaceDiscovery.viewAgency')}
          </Link>
        )}
      </div>
    </DesktopShell>
  )
}

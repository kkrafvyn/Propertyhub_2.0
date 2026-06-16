import { useEffect, useState } from 'react'
import EnterpriseShell from '../../components/EnterpriseShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchPortfolios, fetchOrgLinks, linkOrgPortfolio } from '../../services/enterprise-service'
import { fetchOrganizations } from '../../services/organization-service'

function Portfolios() {
  const [portfolios, setPortfolios] = useState([])
  const [orgs, setOrgs] = useState([])
  const [links, setLinks] = useState([])
  const [linkForm, setLinkForm] = useState({ org_id: '', portfolio_id: '' })
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchPortfolios().then(({ portfolios: rows }) => setPortfolios(rows))
    fetchOrganizations().then(({ organizations }) => setOrgs(organizations ?? []))
    fetchOrgLinks().then(({ links: rows }) => setLinks(rows))
  }, [])

  async function handleLink(e) {
    e.preventDefault()
    if (!linkForm.org_id || !linkForm.portfolio_id) return
    await linkOrgPortfolio(linkForm.org_id, linkForm.portfolio_id)
    const refreshed = await fetchOrgLinks()
    setLinks(refreshed.links ?? [])
    setMessage('Portfolio linked to organization.')
    setLinkForm({ org_id: '', portfolio_id: '' })
  }

  return (
    <EnterpriseShell titleKey="hubs.enterprise.portfolios.title" subtitleKey="hubs.enterprise.portfolios.subtitle">
      {message && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm text-ink">{message}</p>
      )}

      <form onSubmit={handleLink} className="mb-6 panel-card bg-surface-subtle p-4">
        <p className="mb-3 text-sm font-semibold text-ink">Link portfolio to organization</p>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm"
            value={linkForm.org_id}
            onChange={(e) => setLinkForm((f) => ({ ...f, org_id: e.target.value }))}
          >
            <option value="">Select organization</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm"
            value={linkForm.portfolio_id}
            onChange={(e) => setLinkForm((f) => ({ ...f, portfolio_id: e.target.value }))}
          >
            <option value="">Select portfolio</option>
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white">
            Link
          </button>
        </div>
        {links.length > 0 && (
          <p className="mt-2 text-xs text-ink-secondary">{links.length} active org↔portfolio link(s)</p>
        )}
      </form>

      <div className="grid gap-4 sm:grid-cols-2">
        {portfolios.map((p) => (
          <article key={p.id} className="panel-card bg-surface p-5">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold">{p.name}</h2>
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-bold text-ink">{p.country}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-ink">{p.value}</p>
            <div className="mt-3 flex gap-4 text-sm text-ink-secondary">
              <span>{p.assets} assets</span>
              <span>Yield {p.yield}</span>
              <span className="capitalize">Risk: {p.risk}</span>
            </div>
            {p.organization_id && (
              <p className="mt-2 text-xs text-ink-secondary">Org: {p.organization_id}</p>
            )}
          </article>
        ))}
      </div>
    </EnterpriseShell>
  )
}

export default function EnterprisePortfoliosPage() {
  return <ProtectedRoute><Portfolios /></ProtectedRoute>
}

import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { leads } from '../../data/agency'

export default function AgencyLeadsPage() {
  return (
    <ProtectedRoute>
      <AgencyShell title="Leads" subtitle="Track inquiries and viewing pipeline">
        <div className="space-y-3">
          {leads.map((lead) => (
            <article key={lead.id} className="rounded-card border border-surface-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{lead.name}</p>
                  <p className="text-sm text-ink-secondary">{lead.property}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{lead.value}</p>
                  <p className="text-xs text-ink-secondary">{lead.updated}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">{lead.stage}</span>
                <button type="button" className="rounded-full border border-surface-border px-3 py-1 text-xs font-semibold">Open</button>
              </div>
            </article>
          ))}
        </div>
      </AgencyShell>
    </ProtectedRoute>
  )
}

import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { agencyListings } from '../../data/agency'

export default function AgencyPropertiesPage() {
  return (
    <ProtectedRoute>
      <AgencyShell title="Properties" subtitle="Manage agency listings">
        <div className="grid gap-4 sm:grid-cols-2">
          {agencyListings.map((item) => (
            <article key={item.id} className="rounded-card border border-surface-border bg-surface p-5">
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-ink-secondary">{item.views} views · {item.status}</p>
              <button type="button" className="mt-4 text-sm font-semibold text-brand-dark underline">Edit listing</button>
            </article>
          ))}
        </div>
        <button type="button" className="mt-6 rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-brand">
          Add property
        </button>
      </AgencyShell>
    </ProtectedRoute>
  )
}

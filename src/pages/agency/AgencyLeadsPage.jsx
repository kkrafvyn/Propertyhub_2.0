import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { Badge, ItemCard, SecondaryButton } from '../../components/ui/AirbnbUI'
import { leads } from '../../data/agency'

export default function AgencyLeadsPage() {
  return (
    <ProtectedRoute>
      <AgencyShell titleKey="hubs.agency.leads.title" subtitleKey="hubs.agency.leads.subtitle">
        <div className="space-y-3">
          {leads.map((lead) => (
            <ItemCard key={lead.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{lead.name}</p>
                  <p className="text-sm text-ink-secondary">{lead.property}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-ink">{lead.value}</p>
                  <p className="text-xs text-ink-secondary">{lead.updated}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Badge tone="neutral">{lead.stage}</Badge>
                <SecondaryButton className="px-3 py-1 text-xs">Open</SecondaryButton>
              </div>
            </ItemCard>
          ))}
        </div>
      </AgencyShell>
    </ProtectedRoute>
  )
}

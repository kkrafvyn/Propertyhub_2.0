import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { Badge, ItemCard, SecondaryButton } from '../../components/ui/AirbnbUI'
import { fetchAgencyLeads } from '../../services/agency-service'

function Leads() {
  const [leads, setLeads] = useState([])

  useEffect(() => {
    fetchAgencyLeads().then(({ leads: rows }) => setLeads(rows))
  }, [])

  return (
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
                <p className="text-sm font-medium text-ink">
                  {typeof lead.value === 'number' ? `GHS ${lead.value.toLocaleString()}` : lead.value}
                </p>
                <p className="text-xs text-ink-secondary">{lead.updated || lead.updated_label}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Badge tone="neutral">{lead.stage}</Badge>
              <SecondaryButton as={Link} to="/agent/leads" className="px-3 py-1 text-xs">Open CRM</SecondaryButton>
            </div>
          </ItemCard>
        ))}
      </div>
    </AgencyShell>
  )
}

export default function AgencyLeadsPage() {
  return <ProtectedRoute><Leads /></ProtectedRoute>
}

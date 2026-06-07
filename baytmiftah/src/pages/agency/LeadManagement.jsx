import React, { useEffect, useState } from 'react'
import PropTechShell from '../../components/PropTechShell'
import { agencyCrmService } from '../../services/mvp-service'
import { useAgencyStore } from '../../store/useAgencyStore'

const demoLeads = [
  {
    id: 'demo-1',
    name: 'Sarah Jennings',
    property_interest: 'Waterfront Luxury Estates',
    status: 'new',
    follow_up_status: 'new',
    intent_score: 72,
    assigned_to: 'Elena Rodriguez',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    name: 'Mark Thompson',
    property_interest: 'Commercial Loft Space',
    status: 'assigned',
    follow_up_status: 'qualified',
    intent_score: 86,
    assigned_to: 'Marcus Chen',
    created_at: new Date().toISOString(),
  },
]

export default function LeadManagement() {
  const { currentAgency, leads, fetchLeads } = useAgencyStore()
  const [filter, setFilter] = useState('all')
  const [pipelineStages, setPipelineStages] = useState([])

  useEffect(() => {
    if (currentAgency?.id) fetchLeads(currentAgency.id)
  }, [currentAgency?.id])

  useEffect(() => {
    if (!currentAgency?.id) return
    agencyCrmService
      .getPipeline(currentAgency.id)
      .then((stages) => setPipelineStages(stages || []))
      .catch(() => setPipelineStages([]))
  }, [currentAgency?.id])

  const sourceLeads = leads.length > 0 ? leads : demoLeads
  const filteredLeads = sourceLeads.filter((lead) => {
    const leadStatus = lead.follow_up_status || lead.status
    return filter === 'all' || leadStatus === filter
  })
  const stageLabels = pipelineStages.length > 0
    ? pipelineStages.map((stage) => stage.name).join(' -> ')
    : 'New lead -> Contacted -> Qualified -> Viewing booked -> Offer -> Won'

  return (
    <PropTechShell
      active="Agency"
      brand="PropFlow Agency"
      sidebarTitle="Global Realty"
      sidebarSubtitle="Enterprise Suite"
      searchPlaceholder="Search leads..."
      primaryAction="+ Create"
    >
      <main className="px-5 py-10 md:px-8">
        <section className="mx-auto max-w-7xl">
          <h1 className="text-5xl font-black">Lead Management</h1>
          <p className="mt-3 text-xl text-[#303744]">
            Track new inquiries, assignments, and closing momentum.
          </p>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[#596170]">
            CRM pipeline: {stageLabels}
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-4">
            {[
              ['Total Leads', sourceLeads.length],
              ['New', sourceLeads.filter((lead) => (lead.follow_up_status || lead.status) === 'new').length],
              ['Qualified', sourceLeads.filter((lead) => (lead.follow_up_status || lead.status) === 'qualified').length],
              ['Won', sourceLeads.filter((lead) => (lead.follow_up_status || lead.status) === 'won').length],
            ].map(([label, value]) => (
              <article key={label} className="rounded-lg border border-[#cbd3df] bg-white p-6">
                <p className="text-[#303744]">{label}</p>
                <p className="mt-2 text-4xl font-black">{value}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {['all', 'new', 'contacted', 'qualified', 'viewing', 'offer', 'won', 'lost'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-full px-6 py-3 font-semibold capitalize ${
                  filter === status ? 'bg-black text-white' : 'bg-[#dbeafe]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <section className="mt-8 overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
            <div className="grid min-w-[980px] grid-cols-[1.1fr_1.3fr_0.8fr_0.7fr_1fr_0.8fr] bg-[#edf4ff] px-8 py-5 font-semibold uppercase tracking-widest">
              <span>Name</span>
              <span>Property Interest</span>
              <span>Follow Up</span>
              <span>Intent</span>
              <span>Assigned To</span>
              <span>Date</span>
            </div>
            {filteredLeads.map((lead) => (
              <div key={lead.id} className="grid min-w-[980px] grid-cols-[1.1fr_1.3fr_0.8fr_0.7fr_1fr_0.8fr] border-t border-[#d8dde6] px-8 py-6 text-lg">
                <strong>{lead.name}</strong>
                <span>{lead.property_interest}</span>
                <span
                  className={`w-fit rounded-full px-4 py-1 text-sm font-bold capitalize ${
                    (lead.follow_up_status || lead.status) === 'new'
                      ? 'bg-[#dbeafe]'
                      : ['qualified', 'viewing', 'offer', 'won'].includes(lead.follow_up_status || lead.status)
                        ? 'bg-[#62efad] text-[#006c48]'
                        : 'bg-[#e5e7eb]'
                  }`}
                >
                  {lead.follow_up_status || lead.status}
                </span>
                <span className="font-black">{lead.intent_score ?? 50}</span>
                <span>{lead.assigned_to || '-'}</span>
                <span>{new Date(lead.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </section>
        </section>
      </main>
    </PropTechShell>
  )
}

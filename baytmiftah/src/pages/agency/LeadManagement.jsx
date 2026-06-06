import React, { useEffect, useState } from 'react'
import PropTechShell from '../../components/PropTechShell'
import { useAgencyStore } from '../../store/useAgencyStore'

const demoLeads = [
  {
    id: 'demo-1',
    name: 'Sarah Jennings',
    property_interest: 'Waterfront Luxury Estates',
    status: 'new',
    assigned_to: 'Elena Rodriguez',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    name: 'Mark Thompson',
    property_interest: 'Commercial Loft Space',
    status: 'assigned',
    assigned_to: 'Marcus Chen',
    created_at: new Date().toISOString(),
  },
]

export default function LeadManagement() {
  const { currentAgency, leads, fetchLeads } = useAgencyStore()
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (currentAgency?.id) fetchLeads(currentAgency.id)
  }, [currentAgency?.id])

  const sourceLeads = leads.length > 0 ? leads : demoLeads
  const filteredLeads = sourceLeads.filter((lead) => filter === 'all' || lead.status === filter)

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

          <div className="mt-8 grid gap-5 md:grid-cols-4">
            {[
              ['Total Leads', sourceLeads.length],
              ['New', sourceLeads.filter((lead) => lead.status === 'new').length],
              ['Assigned', sourceLeads.filter((lead) => lead.status === 'assigned').length],
              ['Closed', sourceLeads.filter((lead) => lead.status === 'closed').length],
            ].map(([label, value]) => (
              <article key={label} className="rounded-lg border border-[#cbd3df] bg-white p-6">
                <p className="text-[#303744]">{label}</p>
                <p className="mt-2 text-4xl font-black">{value}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {['all', 'new', 'assigned', 'closed'].map((status) => (
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
            <div className="grid min-w-[840px] grid-cols-[1.2fr_1.4fr_0.8fr_1fr_0.8fr] bg-[#edf4ff] px-8 py-5 font-semibold uppercase tracking-widest">
              <span>Name</span>
              <span>Property Interest</span>
              <span>Status</span>
              <span>Assigned To</span>
              <span>Date</span>
            </div>
            {filteredLeads.map((lead) => (
              <div key={lead.id} className="grid min-w-[840px] grid-cols-[1.2fr_1.4fr_0.8fr_1fr_0.8fr] border-t border-[#d8dde6] px-8 py-6 text-lg">
                <strong>{lead.name}</strong>
                <span>{lead.property_interest}</span>
                <span
                  className={`w-fit rounded-full px-4 py-1 text-sm font-bold capitalize ${
                    lead.status === 'new'
                      ? 'bg-[#dbeafe]'
                      : lead.status === 'assigned'
                        ? 'bg-[#62efad] text-[#006c48]'
                        : 'bg-[#e5e7eb]'
                  }`}
                >
                  {lead.status}
                </span>
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

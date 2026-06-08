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
  const [selectedLead, setSelectedLead] = useState(null)
  const [leadOverrides, setLeadOverrides] = useState({})
  const [leadNotes, setLeadNotes] = useState({})
  const [draftNote, setDraftNote] = useState('')
  const [draftTask, setDraftTask] = useState('')

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

  const sourceLeads = (leads.length > 0 ? leads : demoLeads).map((lead) => ({
    ...lead,
    ...leadOverrides[lead.id],
  }))
  const filteredLeads = sourceLeads.filter((lead) => {
    const leadStatus = lead.follow_up_status || lead.status
    return filter === 'all' || leadStatus === filter
  })
  const stageLabels = pipelineStages.length > 0
    ? pipelineStages.map((stage) => stage.name).join(' -> ')
    : 'New lead -> Contacted -> Qualified -> Viewing booked -> Offer -> Won'
  const pipeline = ['new', 'contacted', 'qualified', 'viewing', 'offer', 'won', 'lost']

  const updateLeadStage = (lead, stage) => {
    const updated = { ...lead, follow_up_status: stage, status: stage }
    setLeadOverrides((current) => ({
      ...current,
      [lead.id]: updated,
    }))
    setSelectedLead(updated)

    if (!String(lead.id).startsWith('demo-')) {
      agencyCrmService
        .updateLead({ leadId: lead.id, followUpStatus: stage })
        .catch(() => {})
    }
  }

  const addLeadNote = () => {
    if (!selectedLead || !draftNote.trim()) return
    setLeadNotes((current) => ({
      ...current,
      [selectedLead.id]: [
        ...(current[selectedLead.id] || []),
        {
          id: `note-${Date.now()}`,
          type: 'note',
          title: draftNote.trim(),
          created_at: new Date().toISOString(),
        },
      ],
    }))
    setDraftNote('')
  }

  const addLeadTask = () => {
    if (!selectedLead || !draftTask.trim()) return
    setLeadNotes((current) => ({
      ...current,
      [selectedLead.id]: [
        ...(current[selectedLead.id] || []),
        {
          id: `task-${Date.now()}`,
          type: 'task',
          title: draftTask.trim(),
          created_at: new Date().toISOString(),
        },
      ],
    }))
    setDraftTask('')
  }

  return (
    <PropTechShell
      active="Agency"
      brand="BaytMiftah Agency"
      sidebarTitle="Global Realty"
      sidebarSubtitle="Enterprise Suite"
      searchPlaceholder="Search leads..."
      primaryAction="+ Create"
    >
      <main className="px-5 py-10 md:px-8">
        <section className="mx-auto max-w-7xl">
          <h1 className="text-5xl font-black">Lead Management</h1>
          <p className="mt-3 text-lg leading-7 text-[#303744]">
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
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="grid min-w-[980px] grid-cols-[1.1fr_1.3fr_0.8fr_0.7fr_1fr_0.8fr] border-t border-[#d8dde6] px-8 py-5 text-left text-base transition hover:bg-[#f8faff]"
              >
                <strong>{lead.name}</strong>
                <span>{lead.property_interest}</span>
                <span
                  className={`w-fit rounded-full px-4 py-1 text-sm font-bold capitalize ${
                    (lead.follow_up_status || lead.status) === 'new'
                      ? 'bg-[#dbeafe]'
                      : ['qualified', 'viewing', 'offer', 'won'].includes(lead.follow_up_status || lead.status)
                        ? 'bg-[#F5D76B] text-[#0F172A]'
                        : 'bg-[#e5e7eb]'
                  }`}
                >
                  {lead.follow_up_status || lead.status}
                </span>
                <span className="font-black">{lead.intent_score ?? 50}</span>
                <span>{lead.assigned_to || '-'}</span>
                <span>{new Date(lead.created_at).toLocaleDateString()}</span>
              </button>
            ))}
            {filteredLeads.length === 0 && (
              <div className="border-t border-[#d8dde6] p-10 text-center">
                <span className="material-symbols-outlined text-5xl text-[#E9C349]">person_search</span>
                <h2 className="mt-4 text-2xl font-bold">No leads match this stage</h2>
                <p className="mx-auto mt-2 max-w-md text-[#596170]">
                  Switch filters or create a new inquiry from a property listing.
                </p>
              </div>
            )}
          </section>
        </section>

        {selectedLead && (
          <div className="fixed inset-0 z-50 bg-black/40 p-4 backdrop-blur-sm" onClick={() => setSelectedLead(null)}>
            <aside
              className="ml-auto h-full max-w-xl overflow-y-auto rounded-lg bg-white p-5 text-[#071121] shadow-2xl sm:p-7"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-[#E9C349]">Lead detail</p>
                  <h2 className="mt-2 text-3xl font-black">{selectedLead.name}</h2>
                  <p className="mt-1 text-[#596170]">{selectedLead.property_interest}</p>
                </div>
                <button onClick={() => setSelectedLead(null)} className="rounded-md p-2 hover:bg-[#edf4ff]">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  ['Stage', selectedLead.follow_up_status || selectedLead.status],
                  ['Intent score', `${selectedLead.intent_score ?? 50}/100`],
                  ['Assigned to', selectedLead.assigned_to || 'Unassigned'],
                  ['Created', new Date(selectedLead.created_at).toLocaleDateString()],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-[#cbd3df] bg-[#f8faff] p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#596170]">{label}</p>
                    <p className="mt-2 text-xl font-bold capitalize">{value}</p>
                  </div>
                ))}
              </div>

              <section className="mt-8 rounded-lg border border-[#cbd3df] p-5">
                <h3 className="text-xl font-bold">Pipeline stage</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {pipeline.map((stage) => (
                    <button
                      key={stage}
                      onClick={() => updateLeadStage(selectedLead, stage)}
                      className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
                        (selectedLead.follow_up_status || selectedLead.status) === stage
                          ? 'bg-black text-white'
                          : 'bg-[#edf4ff]'
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </section>

              <section className="mt-6 rounded-lg border border-[#cbd3df] p-5">
                <h3 className="text-xl font-bold">Next actions</h3>
                <div className="mt-4 grid gap-3">
                  {['Schedule viewing', 'Send qualification email', 'Assign agent', 'Mark as offer'].map((action) => (
                    <button
                      key={action}
                      onClick={() =>
                        action === 'Mark as offer'
                          ? updateLeadStage(selectedLead, 'offer')
                          : setDraftTask(action)
                      }
                      className="flex items-center justify-between rounded-md bg-[#edf4ff] px-4 py-3 text-left font-semibold"
                    >
                      {action}
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="mt-6 rounded-lg border border-[#cbd3df] p-5">
                <h3 className="text-xl font-bold">Notes and tasks</h3>
                <div className="mt-4 grid gap-3">
                  <textarea
                    value={draftNote}
                    onChange={(event) => setDraftNote(event.target.value)}
                    placeholder="Add a note from the call, tour, or buyer qualification..."
                    className="min-h-24 rounded-md border border-[#cbd3df] p-3"
                  />
                  <button onClick={addLeadNote} className="rounded-md bg-black px-4 py-3 font-bold text-white">
                    Add Note
                  </button>
                  <div className="flex gap-2">
                    <input
                      value={draftTask}
                      onChange={(event) => setDraftTask(event.target.value)}
                      placeholder="Add task"
                      className="min-w-0 flex-1 rounded-md border border-[#cbd3df] px-3"
                    />
                    <button onClick={addLeadTask} className="rounded-md bg-[#edf4ff] px-4 py-3 font-bold">
                      Add Task
                    </button>
                  </div>
                </div>
              </section>

              <section className="mt-6 rounded-lg border border-[#cbd3df] p-5">
                <h3 className="text-xl font-bold">Timeline</h3>
                <div className="mt-4 space-y-3">
                  {[
                    {
                      id: 'created',
                      type: 'created',
                      title: 'Lead created from property inquiry',
                      created_at: selectedLead.created_at,
                    },
                    ...(leadNotes[selectedLead.id] || []),
                  ].map((item) => (
                    <div key={item.id} className="rounded-md bg-[#f8faff] p-3">
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm capitalize text-[#596170]">
                        {item.type} / {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        )}
      </main>
    </PropTechShell>
  )
}

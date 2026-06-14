import { useEffect, useState } from 'react'
import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import LeadPipelineBoard from '../../components/LeadPipelineBoard'
import { fetchLeads, updateLeadStage } from '../../services/agent-service'
import { sendLeadMessage } from '../../services/comms-service'

function LeadsBoard() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeads().then(({ leads: rows }) => {
      setLeads(rows)
      setLoading(false)
    })
  }, [])

  async function handleStageChange(leadId, stage) {
    await updateLeadStage(leadId, stage)
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage, updated_label: 'Just now' } : l)))
  }

  if (loading) {
    return (
      <AgentShell titleKey="hubs.agent.leads.title" subtitleKey="hubs.agent.leads.subtitle">
        <div className="h-48 animate-pulse rounded-xl bg-surface-hover" />
      </AgentShell>
    )
  }

  return (
    <AgentShell titleKey="hubs.agent.leads.title" subtitleKey="hubs.agent.leads.pipelineSubtitle">
      <LeadPipelineBoard leads={leads} onStageChange={handleStageChange} onMessage={sendLeadMessage} />
    </AgentShell>
  )
}

export default function AgentLeadsPage() {
  return <ProtectedRoute><LeadsBoard /></ProtectedRoute>
}

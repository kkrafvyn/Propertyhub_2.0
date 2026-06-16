import { useEffect, useState } from 'react'
import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import LeadPipelineBoard from '../../components/LeadPipelineBoard'
import { fetchLeads, rescoreLeads, updateLeadStage } from '../../services/agent-service'
import { sendLeadMessage } from '../../services/comms-service'
import { useTranslation } from '../../i18n/LocaleContext'

function LeadsBoard() {
  const { t } = useTranslation()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)

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

  async function handleRescore() {
    setScoring(true)
    await rescoreLeads()
    const { leads: rows } = await fetchLeads()
    setLeads(rows)
    setScoring(false)
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
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={handleRescore} disabled={scoring} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-hover disabled:opacity-60">
          {scoring ? t('extensions.crm.rescoring') : t('extensions.crm.rescoreLeads')}
        </button>
      </div>
      <LeadPipelineBoard leads={leads} onStageChange={handleStageChange} onMessage={sendLeadMessage} />
    </AgentShell>
  )
}

export default function AgentLeadsPage() {
  return <ProtectedRoute><LeadsBoard /></ProtectedRoute>
}

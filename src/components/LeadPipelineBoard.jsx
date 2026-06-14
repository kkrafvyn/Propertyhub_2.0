import { useState } from 'react'
import { LEAD_STAGES } from '../data/agent'
import { useTranslation } from '../i18n/LocaleContext'

const stageLabelKeys = {
  lead: 'extensions.crm.stageLead',
  contacted: 'extensions.crm.stageContacted',
  viewing: 'extensions.crm.stageViewing',
  offer: 'extensions.crm.stageOffer',
  closed: 'extensions.crm.stageClosed',
}

function LeadPipelineBoard({ leads, onStageChange, onMessage, compact = false }) {
  const { t } = useTranslation()
  const [dragId, setDragId] = useState(null)
  const [msgLead, setMsgLead] = useState(null)
  const [msgBody, setMsgBody] = useState('')
  const [channel, setChannel] = useState('whatsapp')

  const byStage = LEAD_STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage)
    return acc
  }, {})

  function onDrop(stage) {
    if (dragId && onStageChange) onStageChange(dragId, stage)
    setDragId(null)
  }

  async function sendMessage() {
    if (!msgLead || !msgBody.trim()) return
    await onMessage?.({ lead: msgLead, body: msgBody.trim(), channel })
    setMsgBody('')
    setMsgLead(null)
  }

  function advanceStage(leadId, currentStage) {
    const idx = LEAD_STAGES.indexOf(currentStage)
    if (idx >= 0 && idx < LEAD_STAGES.length - 1 && onStageChange) {
      onStageChange(leadId, LEAD_STAGES[idx + 1])
    }
  }

  return (
    <>
      <div className={`flex gap-4 overflow-x-auto pb-4 ${compact ? 'snap-x snap-mandatory' : ''}`}>
        {LEAD_STAGES.map((stage) => (
          <div
            key={stage}
            className={`${compact ? 'min-w-[85vw] snap-center' : 'min-w-[240px] flex-1'} panel-card bg-surface-subtle p-3`}
            onDragOver={(e) => !compact && e.preventDefault()}
            onDrop={() => !compact && onDrop(stage)}
          >
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-secondary">
              {t(stageLabelKeys[stage])} ({byStage[stage].length})
            </h3>
            <div className="space-y-2">
              {byStage[stage].map((lead) => (
                <article
                  key={lead.id}
                  draggable={!compact}
                  onDragStart={() => !compact && setDragId(lead.id)}
                  className={`rounded-lg border border-surface-border bg-surface p-3 text-sm shadow-sm ${compact ? '' : 'cursor-grab active:cursor-grabbing'}`}
                >
                  <p className="font-semibold">{lead.name}</p>
                  <p className="text-ink-secondary">{lead.property}</p>
                  {lead.phone && <p className="text-xs text-ink-muted">{lead.phone}</p>}
                  <p className="mt-1 text-xs text-ink-muted">
                    GHS {Number(lead.value).toLocaleString()} · {lead.updated_label || lead.updated}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {compact && stage !== 'closed' && (
                      <button type="button" onClick={() => advanceStage(lead.id, stage)} className="text-xs font-semibold text-brand-accent underline">
                        {t('extensions.crm.advance')}
                      </button>
                    )}
                    <button type="button" onClick={() => { setMsgLead(lead); setChannel('whatsapp') }} className="text-xs font-semibold text-ink underline">
                      {t('extensions.crm.whatsapp')}
                    </button>
                    <button type="button" onClick={() => { setMsgLead(lead); setChannel('sms') }} className="text-xs font-semibold text-ink underline">
                      {t('extensions.crm.sms')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>

      {msgLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-card">
            <h3 className="text-lg font-semibold">{t('extensions.crm.messageLead', { name: msgLead.name })}</h3>
            <p className="mt-1 text-sm text-ink-secondary">{channel === 'whatsapp' ? t('extensions.crm.whatsapp') : t('extensions.crm.sms')}</p>
            <textarea value={msgBody} onChange={(e) => setMsgBody(e.target.value)} rows={4} className="mt-4 w-full rounded-lg border border-surface-border px-3 py-2 text-sm" placeholder={t('extensions.crm.messagePlaceholder')} />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setMsgLead(null)} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold">{t('common.close')}</button>
              <button type="button" onClick={sendMessage} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white">{t('extensions.crm.send')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default LeadPipelineBoard

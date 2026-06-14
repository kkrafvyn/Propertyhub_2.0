import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import { logLeadMessageInDb } from '../lib/supabase-db'

export async function sendLeadMessage({ lead, body, channel }) {
  const phone = lead.phone?.replace(/\D/g, '') || ''
  const text = encodeURIComponent(body)

  if (channel === 'whatsapp' && phone) {
    window.open(`https://wa.me/${phone.startsWith('233') ? phone : `233${phone.replace(/^0/, '')}`}?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await logLeadMessageInDb({
        leadId: lead.id,
        agentId: user.id,
        channel,
        body,
        phone: lead.phone,
        status: channel === 'whatsapp' ? 'opened' : 'queued',
      })
    }
  }

  try {
    return await callEdgeFunction('communications', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'send', channel, phone: lead.phone, body, lead_id: lead.id },
    })
  } catch {
    return { ok: true, channel, source: 'local' }
  }
}

export default { sendLeadMessage }

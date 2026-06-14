import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()

  try {
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

    const body = await req.json()
    if (body.action !== 'send') return errorResponse('Unsupported action', 404)

    const { channel, phone, body: message, lead_id: leadId } = body
    if (!channel || !message) return errorResponse('channel and body required')

    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioFrom = Deno.env.get('TWILIO_FROM_NUMBER')

    let status = 'queued'
    let providerRef: string | null = null

    if (channel === 'sms' && twilioSid && twilioToken && twilioFrom && phone) {
      const auth = btoa(`${twilioSid}:${twilioToken}`)
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: phone, From: twilioFrom, Body: message }),
      })
      const payload = await res.json()
      status = res.ok ? 'sent' : 'failed'
      providerRef = payload?.sid ?? null
    } else if (channel === 'whatsapp') {
      status = 'opened'
    }

    await admin.from('lead_messages').insert({
      lead_id: leadId ?? 'unknown',
      agent_id: user.id,
      channel,
      body: message,
      phone: phone ?? null,
      status,
    })

    return jsonResponse({ ok: true, channel, status, provider_ref: providerRef })
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})

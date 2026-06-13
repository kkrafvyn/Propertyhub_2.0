import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'

async function sendViaResend(to: string, subject: string, body: string) {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) return false

  const from = Deno.env.get('EMAIL_FROM') || 'BaytMiftah <noreply@baytmiftah.com>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html: body }),
  })
  return res.ok
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const admin = createAdminClient()

  if (req.method === 'POST') {
    const body = await req.json()

    if (body.action === 'queue') {
      const row = {
        to_email: body.to,
        subject: body.subject,
        body: body.body,
        status: 'pending',
      }
      const { data, error } = await admin.from('email_outbox').insert(row).select('*').single()
      if (error) return errorResponse(error.message, 400)

      const sent = await sendViaResend(body.to, body.subject, body.body)
      if (sent) {
        await admin.from('email_outbox').update({ status: 'sent' }).eq('id', data.id)
        return jsonResponse({ ok: true, sent: true, id: data.id })
      }

      return jsonResponse({
        ok: true, sent: false, id: data.id,
        message: 'Queued — set RESEND_API_KEY in Edge Function secrets to send.',
      })
    }

    if (body.action === 'welcome') {
      const user = await getUserFromRequest(req)
      if (!user?.email) return errorResponse('Authentication required', 401)
      const name = user.user_metadata?.display_name || user.email.split('@')[0]
      const html = `<p>Welcome to BaytMiftah, ${name}!</p><p>Your real estate operating system is ready.</p>`
      return jsonResponse(await sendViaResend(user.email, 'Welcome to BaytMiftah', html)
        ? { ok: true, sent: true }
        : { ok: true, sent: false, message: 'RESEND_API_KEY not configured' })
    }

    return errorResponse('Unsupported action', 404)
  }

  return errorResponse('Method not allowed', 405)
})

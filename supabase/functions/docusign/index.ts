import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { edgeFunctionUrl } from '../_shared/platform-urls.ts'
import { isStaffRole, getProfileRole } from '../_shared/roles.ts'

async function getDocusignToken(integrationKey: string, userId: string, _privateKey: string) {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = btoa(JSON.stringify({
    iss: integrationKey,
    sub: userId,
    aud: 'account-d.docusign.com',
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation',
  }))
  return `${header}.${payload}.unsigned`
}

async function handleSignedEnvelope(admin: ReturnType<typeof createAdminClient>, envelopeId: string) {
  const { data: envelope } = await admin.from('lease_envelopes').select('*').eq('envelope_id', envelopeId).maybeSingle()
  if (!envelope) return { ok: false, reason: 'envelope_not_found' }

  await admin.from('lease_envelopes').update({ status: 'completed' }).eq('envelope_id', envelopeId)
  await admin.from('lease_documents').update({ status: 'signed', signed_at: new Date().toISOString().slice(0, 10) })
    .eq('id', envelope.document_id)

  if (envelope.document_id) {
    const { data: doc } = await admin.from('lease_documents').select('lease_id, user_id').eq('id', envelope.document_id).maybeSingle()
    if (doc?.lease_id) {
      await admin.from('leases').update({ signed: true, status: 'active' }).eq('id', doc.lease_id).eq('user_id', doc.user_id)
    }
  }

  return { ok: true, envelope_id: envelopeId }
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const admin = createAdminClient()
  const url = new URL(req.url)
  const queryAction = url.searchParams.get('action')

  // Public DocuSign Connect webhook (no JWT)
  if (req.method === 'POST' && queryAction === 'webhook') {
    try {
      const body = await req.json().catch(() => ({}))
      const envelopeId = body.envelope_id
        ?? body.data?.envelopeId
        ?? body.data?.envelopeSummary?.envelopeId
        ?? body.envelopeSummary?.envelopeId

      const event = body.event ?? body.status ?? body.data?.envelopeSummary?.status ?? 'completed'
      if (!envelopeId) return errorResponse('envelope_id required', 400)

      if (String(event).toLowerCase().includes('complete') || String(event).toLowerCase() === 'envelope-completed') {
        const result = await handleSignedEnvelope(admin, String(envelopeId))
        return jsonResponse({ ...result, status: event })
      }

      return jsonResponse({ ok: true, envelope_id: envelopeId, status: event, ignored: true })
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : 'Webhook error', 500)
    }
  }

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  try {
    if (req.method === 'GET' && queryAction === 'connect') {
      const role = await getProfileRole(admin, user.id)
      if (!isStaffRole(role)) return errorResponse('Forbidden', 403)

      const webhookUrl = edgeFunctionUrl('docusign', { action: 'webhook' })
      const siteUrl = Deno.env.get('SITE_URL') ?? 'https://phub-sigma.vercel.app'

      return jsonResponse({
        webhook_url: webhookUrl,
        return_url: `${siteUrl}/renter/sign?signed=1`,
        events: ['envelope-completed', 'envelope-declined', 'envelope-voided'],
        registration_steps: [
          'Log in to DocuSign Admin → Integrations → Connect',
          'Add Configuration → Custom',
          `Set URL to: ${webhookUrl}`,
          'Enable Include Envelope Data and HMAC (optional)',
          'Subscribe to envelope-completed events',
          'Save and publish the Connect configuration',
        ],
        env_vars: [
          'DOCUSIGN_INTEGRATION_KEY',
          'DOCUSIGN_ACCOUNT_ID',
          'DOCUSIGN_USER_ID',
          'DOCUSIGN_PRIVATE_KEY',
          'DOCUSIGN_BASE_URL',
          'SITE_URL',
        ],
        configured: Boolean(
          Deno.env.get('DOCUSIGN_INTEGRATION_KEY')
          && Deno.env.get('DOCUSIGN_ACCOUNT_ID')
          && Deno.env.get('DOCUSIGN_USER_ID'),
        ),
        source: 'docusign',
      })
    }

    if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

    const body = await req.json()

    if (body.action === 'webhook') {
      const envelopeId = body.envelope_id ?? body.data?.envelopeId
      if (!envelopeId) return errorResponse('envelope_id required', 400)
      const result = await handleSignedEnvelope(admin, String(envelopeId))
      return jsonResponse({ ...result, status: body.status ?? body.event ?? 'completed' })
    }

    if (body.action !== 'create_envelope') return errorResponse('Unsupported action', 404)

    const { document_id: documentId, document_name: documentName, signer_email: signerEmail, signer_name: signerName } = body
    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY')
    const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID')
    const apiUserId = Deno.env.get('DOCUSIGN_USER_ID')
    const privateKey = Deno.env.get('DOCUSIGN_PRIVATE_KEY')
    const baseUrl = Deno.env.get('DOCUSIGN_BASE_URL') ?? 'https://demo.docusign.net/restapi'

    if (integrationKey && accountId && apiUserId && privateKey) {
      const token = await getDocusignToken(integrationKey, apiUserId, privateKey)
      const envelopeRes = await fetch(`${baseUrl}/v2.1/accounts/${accountId}/envelopes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailSubject: `Please sign: ${documentName ?? 'Lease agreement'}`,
          documents: [{
            documentId: '1',
            name: documentName ?? 'Lease',
            fileExtension: 'pdf',
            documentBase64: body.document_base64 ?? '',
          }],
          recipients: {
            signers: [{
              email: signerEmail ?? user.email,
              name: signerName ?? user.email,
              recipientId: '1',
              clientUserId: user.id,
            }],
          },
          status: 'sent',
        }),
      }).catch(() => null)

      if (envelopeRes?.ok) {
        const envelope = await envelopeRes.json()
        const viewRes = await fetch(`${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelope.envelopeId}/views/recipient`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            returnUrl: `${Deno.env.get('SITE_URL') ?? 'https://phub-sigma.vercel.app'}/renter/sign?signed=1`,
            authenticationMethod: 'none',
            email: signerEmail ?? user.email,
            userName: signerName ?? user.email,
            clientUserId: user.id,
          }),
        })
        const view = viewRes.ok ? await viewRes.json() : null
        const signingUrl = view?.url ?? `${baseUrl}/signing/${envelope.envelopeId}`

        await admin.from('lease_envelopes').insert({
          user_id: user.id,
          document_id: documentId,
          envelope_id: envelope.envelopeId,
          signing_url: signingUrl,
          status: 'sent',
        })

        return jsonResponse({
          ok: true,
          envelope_id: envelope.envelopeId,
          signing_url: signingUrl,
          source: 'docusign',
        })
      }
    }

    const demoEnvelope = `demo-${documentId}`
    const demoUrl = `/renter/sign?doc=${encodeURIComponent(documentId)}&demo=1`
    await admin.from('lease_envelopes').insert({
      user_id: user.id,
      document_id: documentId,
      envelope_id: demoEnvelope,
      signing_url: demoUrl,
      status: 'demo',
    })

    return jsonResponse({
      ok: true,
      envelope_id: demoEnvelope,
      signing_url: demoUrl,
      demo: true,
      message: 'Set DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_ACCOUNT_ID, DOCUSIGN_USER_ID, DOCUSIGN_PRIVATE_KEY for live signing',
    })
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})

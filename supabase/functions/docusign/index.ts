import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'

async function getDocusignToken(integrationKey: string, userId: string, privateKey: string) {
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
  // Production: sign with privateKey via crypto.subtle or external JWT lib
  return `${header}.${payload}.unsigned`
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()

  try {
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

    const body = await req.json()
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
            returnUrl: `${Deno.env.get('SITE_URL') ?? 'https://propertyhub-2-0.vercel.app'}/renter/sign?signed=1`,
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

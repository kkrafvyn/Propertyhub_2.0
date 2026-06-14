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
    if (body.action !== 'create_envelope') return errorResponse('Unsupported action', 404)

    const { document_id: documentId, document_name: documentName, signer_email: signerEmail, signer_name: signerName } = body
    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY')
    const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID')
    const baseUrl = Deno.env.get('DOCUSIGN_BASE_URL') ?? 'https://demo.docusign.net/restapi'

    if (integrationKey && accountId) {
      const envelopeId = crypto.randomUUID()
      const signingUrl = `${baseUrl}/signing/${envelopeId}?email=${encodeURIComponent(signerEmail ?? user.email ?? '')}`
      await admin.from('lease_envelopes').insert({
        user_id: user.id,
        document_id: documentId,
        envelope_id: envelopeId,
        signing_url: signingUrl,
        status: 'sent',
      })
      return jsonResponse({
        ok: true,
        envelope_id: envelopeId,
        signing_url: signingUrl,
        document_name: documentName,
        signer_name: signerName,
        source: 'docusign',
      })
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
      message: 'Set DOCUSIGN_INTEGRATION_KEY and DOCUSIGN_ACCOUNT_ID for live signing',
    })
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})

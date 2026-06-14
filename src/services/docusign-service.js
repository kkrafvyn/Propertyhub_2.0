import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import { createLeaseEnvelopeInDb } from '../lib/supabase-db'

export async function createSigningSession(documentId, documentName) {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      try {
        const payload = await callEdgeFunction('docusign', {
          method: 'POST',
          allowAnonymous: false,
          body: {
            action: 'create_envelope',
            document_id: documentId,
            document_name: documentName,
            signer_email: user.email,
            signer_name: user.user_metadata?.display_name || user.email,
          },
        })
        if (payload?.signing_url) {
          await createLeaseEnvelopeInDb({
            userId: user.id,
            documentId,
            envelopeId: payload.envelope_id,
            signingUrl: payload.signing_url,
            status: 'sent',
          })
          return { ok: true, signingUrl: payload.signing_url, source: 'supabase' }
        }
      } catch {
        /* demo fallback */
      }
      const demoUrl = `/renter/sign?doc=${encodeURIComponent(documentId)}&demo=1`
      await createLeaseEnvelopeInDb({
        userId: user.id,
        documentId,
        envelopeId: `demo-${documentId}`,
        signingUrl: demoUrl,
        status: 'demo',
      })
      return { ok: true, signingUrl: demoUrl, demo: true, source: 'local' }
    }
  }
  return { ok: false, message: 'Sign in required' }
}

export default { createSigningSession }

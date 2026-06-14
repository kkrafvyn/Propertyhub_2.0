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
    if (body.action === 'register') {
      const { token, platform } = body
      if (!token) return errorResponse('token required')

      await admin.from('push_tokens').upsert(
        { user_id: user.id, token, platform: platform ?? 'web' },
        { onConflict: 'user_id,token' },
      )

      const fcmKey = Deno.env.get('FCM_SERVER_KEY')
      return jsonResponse({
        ok: true,
        registered: true,
        fcm_configured: !!fcmKey,
        message: fcmKey ? 'Token saved — FCM ready' : 'Token saved — set FCM_SERVER_KEY to send pushes',
      })
    }

    if (body.action === 'send_test') {
      const fcmKey = Deno.env.get('FCM_SERVER_KEY')
      if (!fcmKey) {
        return jsonResponse({ ok: true, sent: false, message: 'FCM_SERVER_KEY not configured' })
      }
      const { data: tokens } = await admin.from('push_tokens').select('token').eq('user_id', user.id).limit(1)
      if (!tokens?.length) return errorResponse('No push tokens registered', 404)
      return jsonResponse({ ok: true, sent: true, message: 'Test push queued (legacy FCM API stub)' })
    }

    return errorResponse('Unsupported action', 404)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (req.method === 'GET') {
      if (action === 'dashboard') {
        const { data: creds } = await admin.from('access_credentials').select('*').eq('user_id', user.id).eq('revoked', false)
        const { data: energy } = await admin.from('energy_readings').select('*').order('period', { ascending: false }).limit(1)
        return jsonResponse({
          access: {
            doors: (creds ?? []).map((c) => ({ id: c.device_id, name: c.credential_type, status: 'locked' })),
            energyKwh: energy?.[0]?.kwh ?? 0,
            energyCost: energy?.[0]?.cost ?? 0,
          },
          source: 'supabase',
        })
      }

      if (action === 'visitors') {
        const { data } = await admin.from('visitor_passes').select('*').eq('tenant_user_id', user.id).order('created_at', { ascending: false })
        return jsonResponse({ passes: data ?? [], source: 'supabase' })
      }

      if (action === 'announcements') {
        const { data } = await admin.from('community_announcements').select('*').order('published_at', { ascending: false }).limit(20)
        return jsonResponse({ announcements: data ?? [], source: 'supabase' })
      }

      if (action === 'energy') {
        const { data } = await admin.from('energy_readings').select('*').order('period', { ascending: false }).limit(12)
        return jsonResponse({ readings: data ?? [], source: 'supabase' })
      }

      return errorResponse('Unsupported action', 404)
    }

    if (req.method === 'POST') {
      const body = await req.json()

      if (body.action === 'create_visitor_pass') {
        const code = String(Math.floor(1000 + Math.random() * 9000))
        const row = {
          id: `vp-${crypto.randomUUID().slice(0, 8)}`,
          tenant_user_id: user.id,
          property_id: body.property_id ?? 'default',
          guest_name: body.guest_name,
          valid_from: body.valid_from,
          valid_to: body.valid_to,
          access_code: code,
          status: 'active',
        }
        const { error } = await admin.from('visitor_passes').insert(row)
        if (error) return errorResponse(error.message, 400)
        return jsonResponse({ ok: true, pass: row })
      }

      if (body.action === 'unlock') {
        await admin.from('visitor_access_logs').insert({
          id: `val-${crypto.randomUUID().slice(0, 8)}`,
          device_id: body.device_id,
          event_at: new Date().toISOString(),
          success: true,
        })
        return jsonResponse({ ok: true, device_id: body.device_id, unlocked: true })
      }
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})

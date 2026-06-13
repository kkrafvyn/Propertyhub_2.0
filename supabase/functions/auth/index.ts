import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (req.method === 'GET' && action === 'me') {
      const user = await getUserFromRequest(req)
      if (!user) return errorResponse('Authentication required', 401)

      const admin = createAdminClient()
      const { data: profile } = await admin
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      return jsonResponse({
        user: {
          id: user.id,
          email: user.email,
          ...profile,
        },
      })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
      const client = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      if (body.action === 'signup') {
        const metadata = body.metadata ?? {}
        const { data, error } = await client.auth.signUp({
          email: body.email,
          password: body.password,
          options: { data: metadata },
        })
        if (error) return errorResponse(error.message, 400)

        if (data.user) {
          const admin = createAdminClient()
          await admin.from('user_profiles').upsert({
            id: data.user.id,
            email: body.email,
            display_name: metadata.display_name || body.email.split('@')[0],
            role: metadata.role || 'buyer',
          })
        }

        return jsonResponse({ user: data.user, session: data.session })
      }

      if (body.action === 'login') {
        const { data, error } = await client.auth.signInWithPassword({
          email: body.email,
          password: body.password,
        })
        if (error) return errorResponse(error.message, 400)
        return jsonResponse({ user: data.user, session: data.session })
      }
    }

    return errorResponse('Unsupported request', 404)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})

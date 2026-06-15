/** Partner API key verification and rate limiting */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface ApiKeyContext {
  keyId: string
  userId: string
  scopes: string[]
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function extractApiKey(req: Request): string | null {
  const explicit = req.headers.get('x-api-key')
  if (explicit?.trim()) return explicit.trim()

  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7).trim()
  return token.startsWith('bm_live_') ? token : null
}

export async function verifyPartnerApiKey(
  admin: SupabaseClient,
  rawKey: string,
): Promise<{ ok: true; ctx: ApiKeyContext } | { ok: false; status: number; message: string }> {
  if (!rawKey.startsWith('bm_live_')) {
    return { ok: false, status: 401, message: 'Invalid API key format' }
  }

  const prefix = rawKey.slice(0, 16)
  const hash = await sha256Hex(rawKey)

  const { data: row } = await admin
    .from('platform_api_keys')
    .select('*')
    .eq('key_hash', hash)
    .eq('active', true)
    .maybeSingle()

  if (!row) {
    return { ok: false, status: 401, message: 'Invalid API key' }
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { ok: false, status: 401, message: 'API key expired' }
  }

  const now = new Date()
  const windowStart = row.minute_window ? new Date(row.minute_window) : null
  const sameWindow = windowStart && now.getTime() - windowStart.getTime() < 60_000
  const count = sameWindow ? Number(row.requests_this_minute) + 1 : 1

  if (count > Number(row.rate_limit_per_minute)) {
    return { ok: false, status: 429, message: 'Rate limit exceeded' }
  }

  await admin.from('platform_api_keys').update({
    requests_this_minute: count,
    minute_window: sameWindow ? row.minute_window : now.toISOString(),
    last_used_at: now.toISOString(),
  }).eq('id', row.id)

  return {
    ok: true,
    ctx: {
      keyId: row.id,
      userId: row.user_id,
      scopes: row.scopes ?? ['read'],
    },
  }
}

export async function createPartnerApiKey(
  admin: SupabaseClient,
  userId: string,
  name: string,
  scopes: string[] = ['read'],
): Promise<{ id: string; key: string; prefix: string }> {
  const id = `pak-${crypto.randomUUID().slice(0, 8)}`
  const secret = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().slice(0, 8)
  const key = `bm_live_${secret}`
  const prefix = key.slice(0, 16)
  const keyHash = await sha256Hex(key)

  await admin.from('platform_api_keys').insert({
    id,
    user_id: userId,
    name,
    key_hash: keyHash,
    key_prefix: prefix,
    scopes,
    rate_limit_per_minute: 120,
  })

  return { id, key, prefix }
}

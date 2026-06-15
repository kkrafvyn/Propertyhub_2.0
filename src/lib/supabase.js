import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

/** Edge functions require the legacy JWT anon key; sb_publishable_* is rejected at the gateway. */
function resolveSupabaseClientKey(...candidates) {
  const keys = candidates.filter(Boolean)
  const jwt = keys.find((k) => String(k).startsWith('eyJ'))
  return jwt ?? keys[0] ?? ''
}

export const supabaseAnonKey = resolveSupabaseClientKey(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export const isSupabaseConfigured = Boolean(supabase)

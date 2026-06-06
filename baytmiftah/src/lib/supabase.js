import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'placeholder-anon-key'

if (
  !import.meta.env.VITE_SUPABASE_URL ||
  (!import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
) {
  console.warn(
    'Missing VITE_SUPABASE_URL and a Supabase publishable/anon key. Supabase calls will fail until these are configured.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase

import { supabase, supabaseAnonKey, supabaseUrl } from './supabase'

function buildUrl(functionName, query = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })
  const search = params.toString()
  return `${supabaseUrl}/functions/v1/${functionName}${search ? `?${search}` : ''}`
}

export async function callEdgeFunction(functionName, options = {}) {
  const {
    method = 'GET',
    query,
    body,
    headers = {},
    allowAnonymous = true,
  } = options

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured. Check your .env file.')
  }

  const session = supabase ? (await supabase.auth.getSession()).data.session : null

  if (!allowAnonymous && !session?.access_token) {
    throw new Error('Please sign in to continue.')
  }

  const response = await fetch(buildUrl(functionName, query), {
    method,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${session?.access_token ?? supabaseAnonKey}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Edge function "${functionName}" failed`)
  }

  return payload
}

export default callEdgeFunction

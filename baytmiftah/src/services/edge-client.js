import { supabase, supabaseAnonKey, supabaseUrl } from '../lib/supabase'

const buildPath = (functionName, query = {}) => {
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })

  const search = params.toString()
  return `${functionName}${search ? `?${search}` : ''}`
}

export async function callEdgeFunction(functionName, options = {}) {
  const {
    method = 'GET',
    query,
    body,
    headers = {},
    allowAnonymous = false,
  } = options

  const path = buildPath(functionName, query)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!allowAnonymous && !session?.access_token) {
    throw new Error('Please sign in to continue.')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${path}`, {
    method,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${session?.access_token || supabaseAnonKey}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Edge Function ${functionName} failed`)
  }

  return payload
}

export default callEdgeFunction

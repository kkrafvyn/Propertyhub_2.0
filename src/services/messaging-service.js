import { callEdgeFunction } from '../lib/edge-client'
import { conversations, getConversation } from '../data/messages'

export async function fetchConversations() {
  try {
    const payload = await callEdgeFunction('messaging', {
      allowAnonymous: false,
      query: { action: 'list' },
    })
    const rows = payload?.conversations ?? []
    if (!rows.length) return { conversations, source: 'local' }
    return { conversations: rows, source: 'supabase' }
  } catch {
    return { conversations, source: 'local' }
  }
}

export async function fetchConversation(id) {
  try {
    const payload = await callEdgeFunction('messaging', {
      allowAnonymous: false,
      query: { action: 'thread', id },
    })
    if (payload?.conversation) return { conversation: payload.conversation, source: 'supabase' }
  } catch {
    /* fallback */
  }
  const conversation = getConversation(id)
  return { conversation, source: conversation ? 'local' : 'none' }
}

export async function sendMessage(conversationId, body) {
  try {
    return await callEdgeFunction('messaging', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'send', conversation_id: conversationId, body },
    })
  } catch {
    return { ok: true, source: 'local', message: { body, at: new Date().toISOString() } }
  }
}

export default { fetchConversations, fetchConversation, sendMessage }

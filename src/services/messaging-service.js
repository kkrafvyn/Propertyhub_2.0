import { callEdgeFunction } from '../lib/edge-client'
import {
  fetchConversationFromDb,
  fetchConversationsFromDb,
  findOrCreateConversationForListing,
  sendMessageInDb,
} from '../lib/supabase-db'
import { supabase } from '../lib/supabase'
import { conversations, getConversation } from '../data/messages'

async function getAuthUserId() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function fetchConversations() {
  try {
    const payload = await callEdgeFunction('messaging', {
      allowAnonymous: false,
      query: { action: 'list' },
    })
    const rows = payload?.conversations ?? []
    if (rows.length) return { conversations: rows, source: 'supabase' }
  } catch {
    /* direct DB */
  }

  const userId = await getAuthUserId()
  if (userId) {
    const rows = await fetchConversationsFromDb(userId)
    if (rows?.length) return { conversations: rows, source: 'supabase' }
  }

  return { conversations, source: 'local' }
}

export async function fetchConversation(id) {
  try {
    const payload = await callEdgeFunction('messaging', {
      allowAnonymous: false,
      query: { action: 'thread', id },
    })
    if (payload?.conversation) return { conversation: payload.conversation, source: 'supabase' }
  } catch {
    /* direct DB */
  }

  const userId = await getAuthUserId()
  if (userId) {
    const conversation = await fetchConversationFromDb(userId, id)
    if (conversation) return { conversation, source: 'supabase' }
  }

  const conversation = getConversation(id)
  return { conversation, source: conversation ? 'local' : 'none' }
}

export async function sendMessage(conversationId, body) {
  try {
    const result = await callEdgeFunction('messaging', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'send', conversation_id: conversationId, body },
    })
    if (result?.ok !== false) return { ...result, source: 'supabase' }
  } catch {
    /* direct DB */
  }

  const userId = await getAuthUserId()
  if (userId) {
    const msg = await sendMessageInDb(userId, conversationId, body)
    if (msg) return { ok: true, source: 'supabase', message: msg }
  }

  return { ok: true, source: 'local', message: { body, at: new Date().toISOString() } }
}

export async function openListingConversation({ listingId, listingTitle, participantName, initialMessage }) {
  const userId = await getAuthUserId()
  if (!userId) return { ok: false, error: 'Not signed in' }

  try {
    const result = await callEdgeFunction('messaging', {
      method: 'POST',
      allowAnonymous: false,
      body: {
        action: 'open_listing_thread',
        listing_id: listingId,
        listing_title: listingTitle,
        participant_name: participantName,
        initial_message: initialMessage,
      },
    })
    if (result?.conversation_id) return { ok: true, conversationId: result.conversation_id, source: 'supabase' }
  } catch {
    /* direct DB */
  }

  const conv = await findOrCreateConversationForListing(userId, { listingId, listingTitle, participantName })
  if (!conv) return { ok: false, error: 'Could not create conversation' }

  if (initialMessage) {
    await sendMessageInDb(userId, conv.id, initialMessage)
  }

  return { ok: true, conversationId: conv.id, source: 'supabase' }
}

export default { fetchConversations, fetchConversation, sendMessage, openListingConversation }

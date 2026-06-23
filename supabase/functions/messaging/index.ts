import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'

const DEMO = [
  {
    id: 'conv-1',
    participant: 'Gold Coast Realty',
    participant_name: 'Gold Coast Realty',
    listing_title: 'Cantonments Sky Villa',
    last_message: 'We can schedule a viewing this Saturday at 10am.',
    unread: 2,
  },
]

function mapConversation(row: Record<string, unknown>) {
  return {
    id: row.id,
    participant: row.participant_name,
    participant_name: row.participant_name,
    listingTitle: row.listing_title,
    listing_title: row.listing_title,
    listing_id: row.listing_id,
    lastMessage: row.last_message,
    last_message: row.last_message,
    unread: row.unread ?? 0,
  }
}

async function senderLabel(admin: ReturnType<typeof createAdminClient>, userId: string, user: { user_metadata?: Record<string, unknown> }) {
  const { data: profile } = await admin
    .from('user_profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle()
  const metaName = user.user_metadata?.display_name
  return profile?.display_name || (typeof metaName === 'string' ? metaName : null) || 'You'
}

async function seedDemoConversations(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: existing } = await admin
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (existing?.length) return

  for (const item of DEMO) {
    const { data: conv } = await admin
      .from('conversations')
      .insert({
        user_id: userId,
        participant_name: item.participant_name ?? item.participant,
        listing_title: item.listing_title,
        last_message: item.last_message,
        unread: item.unread,
      })
      .select('id')
      .single()

    if (conv?.id) {
      await admin.from('messages').insert([
        { conversation_id: conv.id, sender: 'You', body: 'Is this still available?' },
        { conversation_id: conv.id, sender: item.participant_name ?? item.participant, body: 'Yes — when would you like to visit?' },
      ])
    }
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  const user = await getUserFromRequest(req)

  if (action === 'list') {
    if (!user) return jsonResponse({ conversations: DEMO.map(mapConversation), source: 'demo' })

    const admin = createAdminClient()
    await seedDemoConversations(admin, user.id)

    const { data, error } = await admin
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('conversations list failed', error.message)
      return jsonResponse({ conversations: DEMO.map(mapConversation), source: 'demo' })
    }

    return jsonResponse({
      conversations: (data ?? []).map((row) => mapConversation(row as Record<string, unknown>)),
      source: 'supabase',
    })
  }

  if (action === 'thread') {
    const id = url.searchParams.get('id')
    if (!id) return errorResponse('Missing conversation id')

    if (!user) {
      return jsonResponse({
        conversation: {
          id,
          participant: 'Gold Coast Realty',
          listingTitle: 'Cantonments Sky Villa',
          messages: [
            { id: '1', sender: 'You', body: 'Is this still available?' },
            { id: '2', sender: 'Gold Coast Realty', body: 'Yes — when would you like to visit?' },
          ],
        },
      })
    }

    const admin = createAdminClient()
    const { data: conv } = await admin
      .from('conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!conv) {
      return jsonResponse({
        conversation: {
          id,
          participant: 'Gold Coast Realty',
          listingTitle: 'Cantonments Sky Villa',
          messages: [],
        },
      })
    }

    await admin
      .from('conversations')
      .update({ unread: 0, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    const { data: messages } = await admin
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    return jsonResponse({
      conversation: {
        ...mapConversation(conv as Record<string, unknown>),
        messages: (messages ?? []).map((m) => ({
          id: m.id,
          sender: m.sender,
          body: m.body,
          at: m.created_at,
        })),
      },
    })
  }

  if (req.method === 'POST') {
    if (!user) return errorResponse('Authentication required', 401)

    const body = await req.json()
    const admin = createAdminClient()

    if (body.action === 'open_listing_thread') {
      const listingId = String(body.listing_id ?? '').trim()
      const listingTitle = String(body.listing_title ?? '').trim()
      const participantName = String(body.participant_name ?? 'Property host').trim()
      const initialMessage = String(body.initial_message ?? '').trim()

      if (!listingId) return errorResponse('listing_id required', 400)

      const { data: existing } = await admin
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .maybeSingle()

      let conversationId = existing?.id as string | undefined

      if (!conversationId) {
        const { data: created, error } = await admin
          .from('conversations')
          .insert({
            user_id: user.id,
            listing_id: listingId,
            listing_title: listingTitle,
            participant_name: participantName,
            last_message: initialMessage || '',
            unread: 0,
          })
          .select('id')
          .single()
        if (error) return errorResponse(error.message, 400)
        conversationId = created?.id
      }

      if (!conversationId) return errorResponse('Could not open conversation', 500)

      const isNew = !existing

      if (initialMessage && isNew) {
        const sender = await senderLabel(admin, user.id, user)
        await admin.from('messages').insert({
          conversation_id: conversationId,
          sender,
          body: initialMessage,
        })
        await admin
          .from('conversations')
          .update({ last_message: initialMessage, updated_at: new Date().toISOString() })
          .eq('id', conversationId)
      }

      return jsonResponse({ ok: true, conversation_id: conversationId, source: 'supabase' })
    }

    if (body.action === 'send' && body.conversation_id) {
      const text = String(body.body ?? '').trim()
      if (!text) return errorResponse('Message body required', 400)

      const sender = await senderLabel(admin, user.id, user)
      const { data: message, error } = await admin
        .from('messages')
        .insert({
          conversation_id: body.conversation_id,
          sender,
          body: text,
        })
        .select('*')
        .single()

      if (error) return errorResponse(error.message, 400)

      await admin
        .from('conversations')
        .update({ last_message: text, updated_at: new Date().toISOString(), unread: 0 })
        .eq('id', body.conversation_id)
        .eq('user_id', user.id)

      return jsonResponse({ ok: true, message })
    }

    if (body.action === 'mark_read' && body.conversation_id) {
      await admin
        .from('conversations')
        .update({ unread: 0 })
        .eq('id', body.conversation_id)
        .eq('user_id', user.id)
      return jsonResponse({ ok: true })
    }

    return errorResponse('Unsupported action', 404)
  }

  return errorResponse('Unsupported action', 404)
})

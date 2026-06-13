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



async function seedDemoConversations(admin, userId) {

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

    if (!user) return jsonResponse({ conversations: DEMO, source: 'demo' })



    const admin = createAdminClient()

    await seedDemoConversations(admin, user.id)



    const { data, error } = await admin

      .from('conversations')

      .select('*')

      .eq('user_id', user.id)

      .order('updated_at', { ascending: false })



    if (error) {

      console.error('conversations list failed', error.message)

      return jsonResponse({ conversations: DEMO, source: 'demo' })

    }



    const conversations = (data ?? []).map((row) => ({

      id: row.id,

      participant: row.participant_name,

      listing_title: row.listing_title,

      last_message: row.last_message,

      unread: row.unread,

    }))



    return jsonResponse({ conversations, source: 'supabase' })

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



    const { data: messages } = await admin

      .from('messages')

      .select('*')

      .eq('conversation_id', id)

      .order('created_at', { ascending: true })



    return jsonResponse({

      conversation: {

        id: conv.id,

        participant: conv.participant_name,

        listingTitle: conv.listing_title,

        messages: (messages ?? []).map((m) => ({

          id: m.id,

          sender: m.sender,

          body: m.body,

        })),

      },

    })

  }



  if (req.method === 'POST') {

    if (!user) return errorResponse('Authentication required', 401)



    const body = await req.json()

    const admin = createAdminClient()



    if (body.action === 'send' && body.conversation_id) {

      const { data: message, error } = await admin

        .from('messages')

        .insert({

          conversation_id: body.conversation_id,

          sender: 'You',

          body: body.body,

        })

        .select('*')

        .single()



      if (error) return errorResponse(error.message, 400)



      await admin

        .from('conversations')

        .update({ last_message: body.body, updated_at: new Date().toISOString() })

        .eq('id', body.conversation_id)

        .eq('user_id', user.id)



      return jsonResponse({ ok: true, message })

    }



    return jsonResponse({ ok: true, message: { body: body.body, at: new Date().toISOString() } })

  }



  return errorResponse('Unsupported action', 404)

})



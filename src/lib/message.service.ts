import { supabase } from './supabase'
import type { Database } from './database.types'
import { communicationService } from './communication.service'
import { WORKSPACE_ENTRY_PATH } from './workspace'

type Message = Database['public']['Tables']['messages']['Row']
type MessageInsert = Database['public']['Tables']['messages']['Insert']
type OrganizationConversationInsert =
  Database['public']['Tables']['organization_conversations']['Insert']

function sortMessages<T extends { messages?: Message[] | null }>(conversation: T) {
  return {
    ...conversation,
    messages: [...(conversation.messages || [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    ),
  }
}

export const messageService = {
  async getConversation(conversationId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  },

  async getUserConversations(userId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select(
        `
        *,
        messages(*)
      `
      )
      .or(
        `participant_1_id.eq.${userId},participant_2_id.eq.${userId}`
      )
      .order('last_message_at', { ascending: false })

    if (error) throw error
    return (data || []).map(sortMessages)
  },

  async getOrganizationInbox(organizationId: string) {
    const { data, error } = await supabase
      .from('organization_conversations')
      .select(
        `
        *,
        conversation:conversations(
          *,
          messages(*)
        ),
        deal_case:deal_cases(
          *,
          listing:listings(
            *,
            property:properties(*)
          ),
          user:users(full_name, email, phone)
        )
      `
      )
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return (data || []).map((row) => ({
      ...row,
      conversation: row.conversation ? sortMessages(row.conversation) : row.conversation,
    }))
  },

  async getOrganizationConversationByLead(organizationId: string, leadUserId: string) {
    const { data, error } = await supabase
      .from('organization_conversations')
      .select(
        `
        *,
        conversation:conversations(
          *,
          messages(*)
        ),
        deal_case:deal_cases(
          *,
          listing:listings(
            *,
            property:properties(*)
          ),
          user:users(full_name, email, phone)
        )
      `
      )
      .eq('organization_id', organizationId)
      .eq('lead_user_id', leadUserId)
      .maybeSingle()

    if (error) throw error
    if (!data) return null
    return {
      ...data,
      conversation: data.conversation ? sortMessages(data.conversation) : data.conversation,
    }
  },

  async createOrGetOrganizationConversation(params: {
    organizationId: string
    leadUserId: string
    internalParticipantId: string
    createdBy: string
    dealCaseId?: string | null
  }) {
    const existing = await this.getOrganizationConversationByLead(
      params.organizationId,
      params.leadUserId
    )

    if (existing) {
      if (params.dealCaseId && !existing.deal_case_id) {
        const { data, error } = await supabase
          .from('organization_conversations')
          .update({ deal_case_id: params.dealCaseId, assigned_to: existing.assigned_to || params.internalParticipantId })
          .eq('id', existing.id)
          .select(
            `
            *,
            conversation:conversations(
              *,
              messages(*)
            ),
            deal_case:deal_cases(
              *,
              listing:listings(
                *,
                property:properties(*)
              ),
              user:users(full_name, email, phone)
            )
          `
          )
          .single()

        if (error) throw error
        return {
          ...data,
          conversation: data.conversation ? sortMessages(data.conversation) : data.conversation,
        }
      }

      return existing
    }

    const conversation = await this.createOrGetConversation(
      params.leadUserId,
      params.internalParticipantId
    )

    const insertPayload: OrganizationConversationInsert = {
      organization_id: params.organizationId,
      conversation_id: conversation.id,
      lead_user_id: params.leadUserId,
      deal_case_id: params.dealCaseId || null,
      assigned_to: params.internalParticipantId,
      created_by: params.createdBy,
    }

    const { data, error } = await supabase
      .from('organization_conversations')
      .insert(insertPayload)
      .select(
        `
        *,
        conversation:conversations(
          *,
          messages(*)
        ),
        deal_case:deal_cases(
          *,
          listing:listings(
            *,
            property:properties(*)
          ),
          user:users(full_name, email, phone)
        )
      `
      )
      .single()

    if (error) {
      if (error.code === '23505') {
        const linkedConversation = await this.getOrganizationConversationByLead(
          params.organizationId,
          params.leadUserId
        )
        if (linkedConversation) return linkedConversation
      }

      throw error
    }

    return {
      ...data,
      conversation: data.conversation ? sortMessages(data.conversation) : data.conversation,
    }
  },

  async assignOrganizationConversation(sharedConversationId: string, assignedTo: string | null) {
    const { data, error } = await supabase
      .from('organization_conversations')
      .update({ assigned_to: assignedTo })
      .eq('id', sharedConversationId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async sendMessage(conversationId: string, senderId: string, content: string) {
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
      })
      .select()

    if (messageError) throw messageError

    // Update conversation's last_message_at
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)

    if (updateError) throw updateError

    await supabase
      .from('organization_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)

    try {
      const [{ data: conversation }, { data: sharedConversation }] = await Promise.all([
        supabase
          .from('conversations')
          .select('participant_1_id, participant_2_id')
          .eq('id', conversationId)
          .maybeSingle(),
        supabase
          .from('organization_conversations')
          .select('lead_user_id')
          .eq('conversation_id', conversationId)
          .maybeSingle(),
      ])

      const recipientId =
        conversation?.participant_1_id === senderId
          ? conversation.participant_2_id
          : conversation?.participant_1_id

      if (recipientId && recipientId !== senderId) {
        const actionUrl =
          sharedConversation && recipientId !== sharedConversation.lead_user_id
            ? `${WORKSPACE_ENTRY_PATH}?next=leads`
            : '/app/messages'

        const preview =
          content.trim().replace(/\s+/g, ' ').slice(0, 140) ||
          'Open Property Hub to read the latest message.'

        await communicationService.createInAppNotification({
          userId: recipientId,
          actorUserId: senderId,
          conversationId,
          notificationType: 'message_received',
          subject: 'New message on Property Hub',
          content: preview,
          actionUrl,
          respectPreferences: false,
        })
      }
    } catch (notificationError) {
      console.error('Failed to create message notification:', notificationError)
    }

    return messageData[0]
  },

  async createOrGetConversation(participant1: string, participant2: string) {
    const [participantA, participantB] = [participant1, participant2].sort()

    // Try to find existing conversation
    const { data: existing, error: existingError } = await supabase
      .from('conversations')
      .select('*')
      .or(
        `and(participant_1_id.eq.${participantA},participant_2_id.eq.${participantB}),and(participant_1_id.eq.${participantB},participant_2_id.eq.${participantA})`
      )
      .single()

    if (existingError && existingError.code !== 'PGRST116') throw existingError
    if (existing) return existing

    // Create new conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        participant_1_id: participantA,
        participant_2_id: participantB,
      })
      .select()

    if (error) throw error
    return data[0]
  },

  async markMessagesAsRead(conversationId: string, userId: string) {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('read', false)

    if (error) throw error
  },

  subscribeToConversation(conversationId: string, callback: (payload: any) => void) {
    const subscription = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        callback
      )
      .subscribe()

    return subscription
  },
}

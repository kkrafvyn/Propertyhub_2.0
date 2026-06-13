import { supabase } from './supabase'

export function subscribeToMessages(conversationId, onMessage) {
  if (!supabase || !conversationId) return () => {}

  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToSmartAlerts(userId, onAlert) {
  if (!supabase || !userId) return () => {}

  const channel = supabase
    .channel(`alerts:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'smart_alerts',
        filter: `owner_id=eq.${userId}`,
      },
      (payload) => {
        onAlert(payload.new)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

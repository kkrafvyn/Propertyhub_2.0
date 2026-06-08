import { supabase } from '../lib/supabase'

export function subscribeToNotifications(userId, onNotification, onStatus) {
  if (!userId) return { unsubscribe() {} }

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onNotification?.(payload.new)
    )
    .subscribe((status) => onStatus?.(status))

  return {
    unsubscribe() {
      supabase.removeChannel(channel)
    },
  }
}

export default subscribeToNotifications

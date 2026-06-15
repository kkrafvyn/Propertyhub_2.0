import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function notifyUser(
  admin: SupabaseClient,
  { userId, type, title, body, link }: { userId: string; type: string; title: string; body: string; link?: string },
) {
  if (!userId) return
  await admin.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    link: link ?? null,
    read: false,
  }).catch((e) => console.error('notification insert failed', e.message))
}

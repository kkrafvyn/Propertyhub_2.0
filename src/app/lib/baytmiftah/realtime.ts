import { supabase } from "../../../lib/supabase";

type StatusCallback = (status: string) => void;

export function subscribeToMessages(
  conversationId: string,
  onMessage: (row: Record<string, unknown>) => void,
  onStatus?: StatusCallback
) {
  const channel = supabase
    .channel(`messages-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        onMessage({
          id: row.id,
          sender: row.sender_name ?? row.sender,
          body: row.content ?? row.body,
          created_at: row.created_at,
          sender_user_id: row.sender_id ?? row.sender_user_id,
        });
      }
    )
    .subscribe((status) => {
      onStatus?.(status);
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToUserConversations(
  userId: string,
  onUpdate: (row: Record<string, unknown>) => void,
  onStatus?: StatusCallback
) {
  const channel = supabase
    .channel(`conversations-user-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (
          row.participant_1_id === userId ||
          row.participant_2_id === userId
        ) {
          onUpdate(row);
        }
      }
    )
    .subscribe((status) => {
      onStatus?.(status);
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToAgentConversations(
  _agentId: string,
  onUpdate: (row: Record<string, unknown>) => void,
  onStatus?: StatusCallback
) {
  return subscribeToUserConversations(_agentId, onUpdate, onStatus);
}

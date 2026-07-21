import { supabase } from "../../../lib/supabase";
import { messageService } from "../../../lib/message.service";
import { organizationService } from "../../../lib/organization.service";
import { buildListingChatIntro } from "./listing-links";

type ConversationRow = {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_at?: string | null;
  messages?: Array<{
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    read?: boolean;
  }>;
};

type ProfileMap = Record<string, string>;

function normalizeConversation(
  conv: ConversationRow,
  selfUserId: string,
  profiles: ProfileMap = {}
) {
  const otherId =
    conv.participant_1_id === selfUserId
      ? conv.participant_2_id
      : conv.participant_1_id;
  const messages = (conv.messages ?? []).map((m) => ({
    id: m.id,
    sender: m.sender_id === selfUserId ? "You" : profiles[m.sender_id] || "User",
    body: m.content,
    at: m.created_at,
    sender_user_id: m.sender_id,
  }));
  const last = messages[messages.length - 1];
  return {
    ...conv,
    participant: profiles[otherId] || "User",
    listingTitle: (conv as { listing_title?: string }).listing_title,
    listingId: (conv as { listing_id?: string }).listing_id,
    listing_id: (conv as { listing_id?: string }).listing_id,
    lastMessage: last?.body,
    updated_at: conv.last_message_at,
    messages,
    unread: messages.filter(
      (m) => m.sender_user_id !== selfUserId && !(m as { read?: boolean }).read
    ).length,
  };
}

async function getAuthUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function loadProfiles(userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return {} as ProfileMap;

  const { data } = await supabase
    .from("users")
    .select("id, full_name, email")
    .in("id", unique);

  const map: ProfileMap = {};
  for (const row of data ?? []) {
    map[row.id] = row.full_name || row.email || "User";
  }
  return map;
}

export async function fetchConversations() {
  const userId = await getAuthUserId();
  if (!userId) return { conversations: [], source: "local" };

  const rows = await messageService.getUserConversations(userId);
  const otherIds = rows.map((c) =>
    c.participant_1_id === userId ? c.participant_2_id : c.participant_1_id
  );
  const profiles = await loadProfiles(otherIds);
  return {
    conversations: rows.map((c) => normalizeConversation(c, userId, profiles)),
    source: "supabase",
  };
}

export async function fetchAgentConversations() {
  return fetchConversations();
}

export async function fetchConversation(id: string) {
  const userId = await getAuthUserId();
  if (!userId) return { conversation: null, source: "none" };

  const rows = await messageService.getUserConversations(userId);
  const match = rows.find((c) => c.id === id);
  if (!match) return { conversation: null, source: "none" };

  const otherId =
    match.participant_1_id === userId
      ? match.participant_2_id
      : match.participant_1_id;
  const profiles = await loadProfiles([otherId, userId]);
  return {
    conversation: normalizeConversation(match, userId, profiles),
    source: "supabase",
  };
}

export async function sendMessage(conversationId: string, body: string) {
  const userId = await getAuthUserId();
  if (!userId) throw new Error("Sign in to send messages");

  const message = await messageService.sendMessage(conversationId, userId, body);
  return {
    ok: true,
    source: "supabase",
    message: {
      id: message.id,
      sender: "You",
      body: message.content,
      created_at: message.created_at,
      sender_user_id: message.sender_id,
    },
  };
}

export async function sendAgentMessage(conversationId: string, body: string) {
  return sendMessage(conversationId, body);
}

export async function markConversationRead(conversationId: string) {
  const userId = await getAuthUserId();
  if (!userId) return;
  await messageService.markMessagesAsRead(conversationId, userId);
}

export async function openListingConversation({
  listingId,
  listingTitle,
  participantName,
  hostUserId,
  initialMessage,
}: {
  listingId: string;
  listingTitle?: string;
  participantName?: string;
  hostUserId?: string;
  initialMessage?: string;
}) {
  const userId = await getAuthUserId();
  if (!userId) throw new Error("Sign in to message");

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, title, organization_id")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError) throw listingError;
  if (!listing?.organization_id) {
    throw new Error("Could not find organization for this listing");
  }

  const organization = await organizationService.getOrganizationById(
    listing.organization_id
  );
  const internalParticipantId = hostUserId || organization.owner_id;

  if (!internalParticipantId || internalParticipantId === userId) {
    throw new Error("Could not find host for this listing");
  }

  const sharedConversation =
    await messageService.createOrGetOrganizationConversation({
      organizationId: listing.organization_id,
      leadUserId: userId,
      internalParticipantId,
      createdBy: userId,
    });

  const intro =
    initialMessage ??
    buildListingChatIntro({
      listingId,
      listingTitle: listingTitle || listing.title || undefined,
    });

  if (intro.trim()) {
    await messageService.sendMessage(
      sharedConversation.conversation_id,
      userId,
      intro
    );
  }

  return {
    conversationId: sharedConversation.conversation_id,
    participant: participantName || organization.name || "Host",
    listingTitle: listingTitle || listing.title,
    listingId,
  };
}

export async function claimAgentConversation(_conversationId: string) {
  return { ok: true };
}

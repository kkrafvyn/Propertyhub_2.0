import { supabase } from "./supabase";

export type LeaseNoteType = "general" | "internal" | "renewal" | "move_out" | "compliance";

export type LeaseNote = {
  id: string;
  organization_id: string;
  lease_id: string;
  author_user_id: string;
  note_body: string;
  note_type: LeaseNoteType;
  offline_client_id?: string | null;
  created_at: string;
  updated_at: string;
  author?: { full_name?: string | null; email?: string | null } | null;
};

function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export const leaseNotesService = {
  async listForLease(leaseId: string) {
    const { data, error } = await supabase
      .from("lease_notes")
      .select("*, author:users!lease_notes_author_user_id_fkey(full_name, email)")
      .eq("lease_id", leaseId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as LeaseNote[];
  },

  async createNote(input: {
    organizationId: string;
    leaseId: string;
    authorUserId: string;
    noteBody: string;
    noteType?: LeaseNoteType;
    offlineClientId?: string;
  }) {
    const payload = {
      organization_id: input.organizationId,
      lease_id: input.leaseId,
      author_user_id: input.authorUserId,
      note_body: input.noteBody.trim(),
      note_type: input.noteType || "general",
      offline_client_id: input.offlineClientId || null,
    };

    if (isOffline()) {
      const { workspaceSyncService } = await import("./workspace-sync.service");
      const offlineClientId = input.offlineClientId || crypto.randomUUID();
      const entry = await workspaceSyncService.queueLeaseNote({
        organizationId: input.organizationId,
        payload: { ...payload, offline_client_id: offlineClientId },
      });
      return {
        id: entry.id,
        ...payload,
        offline_client_id: offlineClientId,
        created_at: entry.createdAt,
        updated_at: entry.updatedAt,
        offlineQueued: true,
      } as LeaseNote & { offlineQueued?: boolean };
    }

    const { data, error } = await supabase
      .from("lease_notes")
      .insert(payload)
      .select("*, author:users!lease_notes_author_user_id_fkey(full_name, email)")
      .single();

    if (error) throw error;
    return data as LeaseNote;
  },
};

import { useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import { leaseNotesService, type LeaseNoteType } from "../../../lib/lease-notes.service";

interface LeaseNotesPanelProps {
  organizationId: string;
  leaseId: string;
  authorUserId: string;
}

export function LeaseNotesPanel({ organizationId, leaseId, authorUserId }: LeaseNotesPanelProps) {
  const [notes, setNotes] = useState<
    Array<{
      id: string;
      note_body: string;
      note_type: string;
      created_at: string;
      author?: { full_name?: string | null; email?: string | null } | null;
      offlineQueued?: boolean;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [body, setBody] = useState("");
  const [noteType, setNoteType] = useState<LeaseNoteType>("internal");

  const load = async () => {
    try {
      setLoading(true);
      const rows = await leaseNotesService.listForLease(leaseId);
      setNotes(rows);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [leaseId]);

  const saveNote = async () => {
    if (!body.trim()) {
      toast.error("Enter a note before saving.");
      return;
    }

    try {
      setSaving(true);
      const created = await leaseNotesService.createNote({
        organizationId,
        leaseId,
        authorUserId,
        noteBody: body,
        noteType,
      });
      setNotes((current) => [created, ...current]);
      setBody("");
      toast.success(
        (created as { offlineQueued?: boolean }).offlineQueued
          ? "Note saved offline — it will sync when you reconnect."
          : "Lease note saved.",
      );
    } catch (error) {
      console.error(error);
      toast.error("Unable to save lease note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-surface-border bg-surface/60 p-3">
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold text-ink">Lease notes</p>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <select
          className="rounded-lg border border-surface-border bg-surface px-2 py-1.5 text-xs"
          value={noteType}
          onChange={(event) => setNoteType(event.target.value as LeaseNoteType)}
        >
          <option value="internal">Internal</option>
          <option value="general">General</option>
          <option value="renewal">Renewal</option>
          <option value="move_out">Move-out</option>
          <option value="compliance">Compliance</option>
        </select>
        <input
          className="min-w-[12rem] flex-1 rounded-lg border border-surface-border bg-surface px-2 py-1.5 text-xs"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add an internal note for this lease..."
        />
        <Button size="sm" variant="outline" disabled={saving} onClick={() => void saveNote()}>
          {saving ? "Saving..." : "Add note"}
        </Button>
      </div>

      <div className="mt-3 max-h-36 space-y-2 overflow-y-auto">
        {loading ? (
          <p className="text-[11px] text-ink-muted">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="text-[11px] text-ink-muted">No notes yet.</p>
        ) : (
          notes.slice(0, 6).map((note) => (
            <div key={note.id} className="rounded-lg border border-surface-border/80 px-2.5 py-2">
              <p className="text-[11px] text-ink-secondary">{note.note_body}</p>
              <p className="mt-1 text-[10px] text-ink-muted capitalize">
                {note.note_type.replace(/_/g, " ")} ·{" "}
                {note.author?.full_name || note.author?.email || "Staff"} ·{" "}
                {new Date(note.created_at).toLocaleString()}
                {(note as { offlineQueued?: boolean }).offlineQueued ? " · pending sync" : ""}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

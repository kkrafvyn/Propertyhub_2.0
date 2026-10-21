import { useEffect, useState } from "react";
import { adminService, type AdminUserRow } from "../../../lib/admin.service";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

export function AdminDeleteAccountDialog({ user, onClose, onChanged }: {
  user: AdminUserRow | null; onClose: () => void; onChanged: () => Promise<void>;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setConfirmation(""); setError(""); }, [user?.id]);
  const expected = user?.email || user?.id || "";
  const isProtectedAccount =
    Boolean(user?.is_platform_admin) ||
    Boolean(user?.is_platform_manager) ||
    (user?.platform_console_grants?.length ?? 0) > 0;
  async function remove(event: React.FormEvent) {
    event.preventDefault();
    if (!user || saving || confirmation !== expected) return;
    setSaving(true); setError("");
    try {
      await adminService.deleteAccount(user.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete account.");
    } finally {
      // Refresh even after failure: the account may be locked with deletion pending.
      try { await onChanged(); } finally { setSaving(false); }
    }
  }
  return <Dialog open={Boolean(user)} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete sign-in account</DialogTitle>
        <DialogDescription>
          Remove sign-in access for {user?.full_name || expected}. Property, payment, membership and audit records are
          retained. This cannot be undone.
          {isProtectedAccount ? (
            <>
              {" "}
              <strong className="text-destructive">
                This account has platform console access — transfer organization ownership and revoke platform roles
                before deletion, or deletion may be rejected.
              </strong>
            </>
          ) : (
            <> Organization ownership must be transferred before deleting an organization owner.</>
          )}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={(event) => void remove(event)} className="space-y-4">
        <Input label={`Type ${expected} to confirm`} value={confirmation} disabled={saving} autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="destructive" disabled={saving || !expected || confirmation !== expected}>
            {saving ? "Deleting…" : user?.account_deletion_requested_at ? "Retry deletion" : "Delete sign-in account"}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}

import { useEffect, useState } from "react";
import { adminService, type AdminUserRow } from "../../../lib/admin.service";
import { COMPANY_TYPE_DEFINITIONS, ROLE_CATALOG } from "../../../lib/company-model";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

export function AdminOrganizationAccessDialog({ user, onClose, onSaved }: {
  user: AdminUserRow | null; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [mode, setMode] = useState("create");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [businessType, setBusinessType] = useState("property_management");
  const [search, setSearch] = useState("");
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; slug: string; suspended: boolean | null }>>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [role, setRole] = useState("agent");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    setMode("create"); setName(""); setSlug(""); setBusinessType("property_management");
    setSearch(""); setOrganizations([]); setOrganizationId(""); setRole("agent"); setError("");
  }, [user?.id]);

  useEffect(() => {
    if (!user || mode !== "assign") return;
    let cancelled = false;
    setSearching(true); setSearchError(""); setOrganizationId("");
    const timer = window.setTimeout(() => {
      void adminService.findOrganizations(search).then((rows) => {
        if (!cancelled) setOrganizations(rows);
      }).catch((err) => {
        if (!cancelled) { setOrganizations([]); setSearchError(err.message || "Unable to load organizations."); }
      }).finally(() => { if (!cancelled) setSearching(false); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [search, mode, user?.id]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user || saving) return;
    setSaving(true); setError("");
    try {
      if (mode === "create") {
        await adminService.createUserOrganization({ userId: user.id, name, slug, businessType });
      } else {
        await adminService.assignOrganizationMember({ userId: user.id, organizationId, role });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String((err as { message?: string })?.message || "Unable to save organization access."));
      setSaving(false);
      return;
    }
    // Close after a successful mutation, even if refreshing the directory fails.
    onClose();
    try { await onSaved(); } finally { setSaving(false); }
  }

  const selectClass = "w-full rounded-lg border border-border bg-background p-3 text-sm";
  return <Dialog open={Boolean(user)} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Organization access</DialogTitle>
        <DialogDescription>Manage workspace access for {user?.full_name || user?.email}. Their consumer account stays available.</DialogDescription>
      </DialogHeader>
      <form onSubmit={(event) => void save(event)} className="space-y-4">
        <fieldset disabled={saving} className="space-y-4">
          <label className="block text-sm">Action
            <select aria-label="Organization action" className={selectClass} value={mode} onChange={(e) => { setMode(e.target.value); setError(""); }}>
              <option value="create">Create organization for this user</option>
              <option value="assign">Assign membership / change role</option>
            </select>
          </label>
          {mode === "create" ? <>
            <p className="text-sm text-muted-foreground">The user becomes the organization owner. Identity verification is required. Existing pending enrollments must be reviewed from Enrollment Requests.</p>
            <Input label="Organization name" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Workspace slug" required minLength={3} maxLength={63} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="example-properties" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} />
            <label className="block text-sm">Business type
              <select aria-label="Business type" className={selectClass} value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                {COMPANY_TYPE_DEFINITIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
          </> : <>
            <Input label="Search organizations by name" value={search} onChange={(e) => setSearch(e.target.value)} />
            {searchError && <p role="alert" className="text-sm text-destructive">{searchError}</p>}
            <label className="block text-sm">Organization
              <select aria-label="Organization" required className={selectClass} disabled={searching} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
                <option value="">{searching ? "Searching…" : "Select an organization"}</option>
                {organizations.map((org) => <option key={org.id} value={org.id} disabled={Boolean(org.suspended)}>{org.name} /{org.slug}{org.suspended ? " (suspended)" : ""}</option>)}
              </select>
            </label>
            <p className="text-xs text-muted-foreground">Up to 30 matches. Refine the search to find another organization.</p>
            <label className="block text-sm">Member role
              <select aria-label="Member role" className={selectClass} value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLE_CATALOG.filter((item) => item.invitable).map((item) => <option key={item.role} value={item.role}>{item.label}</option>)}
              </select>
            </label>
            <p className="text-sm text-muted-foreground">This adds membership or changes the existing role. Existing property scopes and custom permissions are retained. Ownership transfers are separate.</p>
          </>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mode === "assign" && (!organizationId || searching)}>{saving ? "Saving…" : mode === "create" ? "Create organization" : "Save membership"}</Button>
          </div>
        </fieldset>
      </form>
    </DialogContent>
  </Dialog>;
}

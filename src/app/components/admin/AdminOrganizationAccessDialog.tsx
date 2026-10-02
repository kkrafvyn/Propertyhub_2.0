import { useEffect, useState } from "react";
import { adminService, type AdminUserRow } from "../../../lib/admin.service";
import { COMPANY_TYPE_DEFINITIONS, ROLE_CATALOG } from "../../../lib/company-model";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { NativeSelect } from "../ui/NativeSelect";

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
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    setMode("create"); setName(""); setSlug(""); setBusinessType("property_management");
    setSearch(""); setOrganizations([]); setOrganizationId(""); setRole("agent"); setError(""); setLinkCopied(false);
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

  async function copySetupLink() {
    const setupUrl = `${window.location.origin}/workspace?kind=company`;
    try {
      await navigator.clipboard.writeText(setupUrl);
      setLinkCopied(true);
      setError("");
    } catch {
      setError("Unable to copy the link. Select and copy it from the field above.");
    }
  }

  const setupUrl = `${window.location.origin}/workspace?kind=company`;
  return <Dialog open={Boolean(user)} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Organization access</DialogTitle>
        <DialogDescription>Manage workspace access for {user?.full_name || user?.email}. Their consumer account stays available.</DialogDescription>
      </DialogHeader>
      <form onSubmit={(event) => void save(event)} className="space-y-4">
        <fieldset disabled={saving} className="space-y-4">
          <NativeSelect label="Action" value={mode} onChange={(e) => { setMode(e.target.value); setError(""); }}>
              <option value="create">Create organization for this user</option>
              <option value="self_setup">Let the user set up their organization</option>
              <option value="assign">Assign membership / change role</option>
          </NativeSelect>
          {mode === "self_setup" ? <>
            <p className="text-sm text-muted-foreground">
              Send this link to the user so they can submit their own organization workspace application. They must complete identity verification, accept the terms, and receive admin approval before workspace access is granted. This does not create an organization or membership.
            </p>
            <Input label="Organization setup link" readOnly value={setupUrl} onFocus={(event) => event.currentTarget.select()} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Close</Button>
              <Button type="button" onClick={() => void copySetupLink()}>{linkCopied ? "Link copied" : "Copy setup link"}</Button>
            </div>
          </> : mode === "create" ? <>
            <p className="text-sm text-muted-foreground">The user becomes the organization owner. Identity verification is required. Existing pending enrollments must be reviewed from Enrollment Requests.</p>
            <Input label="Organization name" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Workspace slug" required minLength={3} maxLength={63} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="example-properties" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} />
            <NativeSelect label="Business type" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                {COMPANY_TYPE_DEFINITIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </NativeSelect>
          </> : <>
            <Input label="Search organizations by name" value={search} onChange={(e) => setSearch(e.target.value)} />
            <NativeSelect
              label="Organization"
              required
              disabled={searching}
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              description="Up to 30 matches. Refine the search to find another organization."
              error={searchError || undefined}
            >
                <option value="">{searching ? "Searching…" : "Select an organization"}</option>
                {organizations.map((org) => <option key={org.id} value={org.id} disabled={Boolean(org.suspended)}>{org.name} /{org.slug}{org.suspended ? " (suspended)" : ""}</option>)}
            </NativeSelect>
            <NativeSelect
              label="Member role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              description="This adds membership or changes the existing role. Existing property scopes and custom permissions are retained. Ownership transfers are separate."
            >
                {ROLE_CATALOG.filter((item) => item.invitable).map((item) => <option key={item.role} value={item.role}>{item.label}</option>)}
            </NativeSelect>
          </>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {mode !== "self_setup" && <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mode === "assign" && (!organizationId || searching)}>{saving ? "Saving…" : mode === "create" ? "Create organization" : "Save membership"}</Button>
          </div>}
        </fieldset>
      </form>
    </DialogContent>
  </Dialog>;
}

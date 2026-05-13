import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import type { Database } from "../../../lib/database.types";
import { organizationService } from "../../../lib/organization.service";
import { getWorkspaceRoute, toOrganizationSlug, type MemberRole } from "../../../lib/workspace";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface WorkspaceSettingsProps {
  organization: Organization;
  currentRole: MemberRole | null;
}

export function WorkspaceSettings({
  organization,
  currentRole,
}: WorkspaceSettingsProps) {
  const navigate = useNavigate();
  const canManageSettings = currentRole === "owner" || currentRole === "manager";
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: organization.name,
    slug: organization.slug,
    description: organization.description || "",
    website: organization.website || "",
    email: organization.email || "",
    phone: organization.phone || "",
    logoUrl: organization.logo_url || "",
    bannerUrl: organization.banner_url || "",
  });

  useEffect(() => {
    setForm({
      name: organization.name,
      slug: organization.slug,
      description: organization.description || "",
      website: organization.website || "",
      email: organization.email || "",
      phone: organization.phone || "",
      logoUrl: organization.logo_url || "",
      bannerUrl: organization.banner_url || "",
    });
  }, [organization]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canManageSettings) {
      toast.error("Only owners and managers can update organization settings.");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Organization name is required.");
      return;
    }

    const nextSlug = toOrganizationSlug(form.slug || form.name);
    if (!nextSlug) {
      toast.error("Enter a valid slug using letters and numbers.");
      return;
    }

    try {
      setSubmitting(true);
      const updatedOrganization = await organizationService.updateOrganization(organization.id, {
        name: form.name.trim(),
        slug: nextSlug,
        description: form.description.trim() || null,
        website: form.website.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        logo_url: form.logoUrl.trim() || null,
        banner_url: form.bannerUrl.trim() || null,
      });

      toast.success("Organization settings updated.");

      if (updatedOrganization.slug !== organization.slug) {
        navigate(getWorkspaceRoute(updatedOrganization.slug, "settings"), { replace: true });
      }
    } catch (error) {
      console.error("Failed to update organization settings:", error);
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "";
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";

      if (code === "23505" || message.includes("duplicate") || message.includes("slug")) {
        toast.error("That workspace slug is already taken. Try another one.");
      } else {
        toast.error("We couldn't save those settings right now.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Update the public profile and contact details for {organization.name}.
          </p>
        </div>
        <Badge variant="outline" className="capitalize w-fit">
          {currentRole || "member"}
        </Badge>
      </div>

      {!canManageSettings && (
        <Card className="p-4 bg-secondary/40">
          <p className="text-sm text-muted-foreground">
            You can view this organization profile, but only owners and managers can edit it.
          </p>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Organization Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Organization Name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              disabled={!canManageSettings}
              required
            />
            <Input
              label="Slug"
              value={form.slug}
              onChange={(event) => updateField("slug", event.target.value)}
              disabled={!canManageSettings}
              placeholder="prime-properties"
              required
            />
            <Input
              label="Website"
              value={form.website}
              onChange={(event) => updateField("website", event.target.value)}
              disabled={!canManageSettings}
              placeholder="https://example.com"
            />
            <Input
              label="Public Email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              disabled={!canManageSettings}
              placeholder="hello@example.com"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              disabled={!canManageSettings}
              placeholder="+233 24 000 0000"
            />
            <Input
              label="Logo URL"
              value={form.logoUrl}
              onChange={(event) => updateField("logoUrl", event.target.value)}
              disabled={!canManageSettings}
              placeholder="https://..."
            />
            <div className="md:col-span-2">
              <Input
                label="Banner URL"
                value={form.bannerUrl}
                onChange={(event) => updateField("bannerUrl", event.target.value)}
                disabled={!canManageSettings}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block mb-2 text-sm text-foreground">Description</label>
            <textarea
              className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground min-h-32"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              disabled={!canManageSettings}
              placeholder="Tell clients what makes this organization different."
            />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Workspace Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Verification</p>
              <p className="font-semibold mt-1">
                {organization.verified ? "Verified" : "Pending verification"}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Workspace Access</p>
              <p className="font-semibold mt-1">
                {organization.suspended ? "Suspended" : "Active"}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-semibold mt-1">
                {new Date(organization.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Updated</p>
              <p className="font-semibold mt-1">
                {new Date(organization.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={!canManageSettings || submitting}>
            {submitting ? "Saving..." : "Save Settings"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => navigate(getWorkspaceRoute(organization.slug))}
          >
            Back to Dashboard
          </Button>
        </div>
      </form>
    </div>
  );
}

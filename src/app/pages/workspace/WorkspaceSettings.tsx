import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Building2, ShieldCheck, Activity, Calendar, RefreshCw, Sliders } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { MetricCard } from "../../components/ui/MetricCard";
import { OrganizationUnitsPanel } from "../../components/workspace/OrganizationUnitsPanel";
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
  const canManageSettings =
    currentRole === "owner" ||
    currentRole === "manager" ||
    currentRole === "organization_admin" ||
    currentRole === "managing_director";
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-ink">
            Organization Settings
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Configure public identity, brand presence, and regional settings for {organization.name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize text-xs font-semibold px-2.5 py-1">
            Role: {currentRole || "member"}
          </Badge>
        </div>
      </div>

      {/* KPI / Health status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Verification Tier"
          value={organization.verified ? "Verified" : "Pending"}
          icon={ShieldCheck}
          iconColor={organization.verified ? "emerald" : "amber"}
          subtitle="Regulatory identity compliance"
        />
        <MetricCard
          title="Workspace Status"
          value={organization.suspended ? "Suspended" : "Active"}
          icon={Activity}
          iconColor={organization.suspended ? "terracotta" : "emerald"}
          subtitle="Real-time account standing"
        />
        <MetricCard
          title="Provisioned"
          value={new Date(organization.created_at).toLocaleDateString()}
          icon={Calendar}
          iconColor="primary"
          subtitle="Initial organization onboarding"
        />
        <MetricCard
          title="Last Synchronized"
          value={new Date(organization.updated_at).toLocaleDateString()}
          icon={RefreshCw}
          iconColor="indigo"
          subtitle="Recent profile update"
        />
      </div>

      {!canManageSettings && (
        <Card className="p-4 border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-200">
          <p className="text-xs leading-relaxed">
            You can view this organization profile in read-only mode. Only owners and managers can update operational settings.
          </p>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 border-surface-border bg-surface shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-ink">Organization Profile</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Organization Legal Name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              disabled={!canManageSettings}
              placeholder="e.g. BaytMiftah Real Estate"
              required
            />
            <Input
              label="Workspace URL Slug"
              value={form.slug}
              onChange={(event) => updateField("slug", event.target.value)}
              disabled={!canManageSettings}
              placeholder="prime-properties"
              required
            />
            <Input
              label="Corporate Website"
              value={form.website}
              onChange={(event) => updateField("website", event.target.value)}
              disabled={!canManageSettings}
              placeholder="https://example.com"
            />
            <Input
              label="Public Inquiries Email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              disabled={!canManageSettings}
              placeholder="hello@example.com"
            />
            <Input
              label="Contact Phone"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              disabled={!canManageSettings}
              placeholder="+233 24 000 0000"
            />
            <Input
              label="Brand Logo URL"
              value={form.logoUrl}
              onChange={(event) => updateField("logoUrl", event.target.value)}
              disabled={!canManageSettings}
              placeholder="https://..."
            />
            <div className="md:col-span-2">
              <Input
                label="Header Banner URL"
                value={form.bannerUrl}
                onChange={(event) => updateField("bannerUrl", event.target.value)}
                disabled={!canManageSettings}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block mb-2 text-xs font-medium text-ink-secondary">Brand Description</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-subtle text-ink placeholder:text-ink-muted text-xs leading-relaxed min-h-28 focus:outline-none focus:ring-1 focus:ring-primary"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              disabled={!canManageSettings}
              placeholder="Tell clients what makes this organization and its property portfolio distinct."
            />
          </div>
        </Card>

        <OrganizationUnitsPanel organizationId={organization.id} canManage={canManageSettings} />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!canManageSettings || submitting} className="shadow-xs">
            {submitting ? "Saving..." : "Save Settings"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(getWorkspaceRoute(organization.slug))}
          >
            Back to Dashboard
          </Button>
        </div>
      </form>
    </div>
  );
}

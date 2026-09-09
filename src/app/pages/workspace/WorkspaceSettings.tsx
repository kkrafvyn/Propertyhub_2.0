import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Building2,
  ShieldCheck,
  Activity,
  Calendar,
  RefreshCw,
  Sliders,
  Globe,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Shield,
  Eye,
  ArrowRight,
} from "lucide-react";
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
    <div className="space-y-8">
      {/* ── Editorial Header ── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-surface/80 border border-emerald-500/20 shadow-lg backdrop-blur-md">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 shadow-xs">
                <Building2 className="w-3.5 h-3.5" />
                Workspace Architecture
              </span>
              <Badge variant="outline" className="capitalize text-xs font-semibold px-2.5 py-0.5 border-primary/20 bg-primary/5 text-primary">
                Role: {currentRole || "member"}
              </Badge>
              {organization.verified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Entity
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-ink font-display">
              Organization Settings
            </h1>
            <p className="mt-1.5 text-sm text-ink-secondary max-w-2xl leading-relaxed">
              Configure public identity, brand presence, operational units, and regional compliance parameters for {organization.name}.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/companies/${organization.slug}`)}
              className="flex items-center gap-1.5 border-surface-border/80 bg-surface/60 backdrop-blur-xs hover:bg-surface rounded-xl text-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Public Profile</span>
              <ExternalLink className="w-3 h-3 text-ink-muted" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI Grid with Halo Glows ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Verification Tier"
          value={organization.verified ? "Verified" : "Pending"}
          icon={ShieldCheck}
          iconColor={organization.verified ? "emerald" : "amber"}
          glow={organization.verified ? "emerald" : "amber"}
          subtitle="Identity compliance status"
        />
        <MetricCard
          title="Workspace Status"
          value={organization.suspended ? "Suspended" : "Active"}
          icon={Activity}
          iconColor={organization.suspended ? "terracotta" : "emerald"}
          glow={organization.suspended ? "terracotta" : "emerald"}
          subtitle="Real-time account standing"
        />
        <MetricCard
          title="Provisioned"
          value={new Date(organization.created_at).toLocaleDateString()}
          icon={Calendar}
          iconColor="primary"
          glow="primary"
          subtitle="Initial onboarding date"
        />
        <MetricCard
          title="Last Synchronized"
          value={new Date(organization.updated_at).toLocaleDateString()}
          icon={RefreshCw}
          iconColor="indigo"
          glow="purple"
          subtitle="Recent profile update"
        />
      </div>

      {!canManageSettings && (
        <Card variant="glass" className="p-4 border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200 rounded-2xl">
          <p className="text-xs leading-relaxed flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500 shrink-0" />
            <span>You are viewing this organization profile in read-only mode. Only owners and authorized managers can modify operational settings.</span>
          </p>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Organization Profile & Live Brand Preview ── */}
        <Card variant="glass" className="p-6 sm:p-8 border border-surface-border/80 bg-surface/80 backdrop-blur-md rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-surface-border/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink font-display">Brand & Public Identity</h2>
                <p className="text-xs text-ink-muted">Public storefront metadata shown on consumer listings and company directory</p>
              </div>
            </div>
            <span className="text-xs text-ink-muted hidden sm:inline">
              Slug: <code className="bg-surface-subtle px-2 py-0.5 rounded text-primary font-mono text-[11px]">/{form.slug || "slug"}</code>
            </span>
          </div>

          {/* Live Branding Preview Header */}
          <div className="relative rounded-2xl overflow-hidden border border-surface-border/80 bg-surface-subtle shadow-xs">
            <div className="h-28 sm:h-36 w-full relative bg-gradient-to-r from-slate-800 via-primary/40 to-slate-900 overflow-hidden">
              {form.bannerUrl ? (
                <img
                  src={form.bannerUrl}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-mono">
                  <ImageIcon className="w-4 h-4 mr-1.5" /> Header Banner Preview
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>

            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 -mt-8 sm:-mt-10 relative z-10">
              <div className="flex items-end gap-3.5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-4 border-surface bg-surface overflow-hidden shadow-md shrink-0 flex items-center justify-center text-ink font-bold text-xl">
                  {form.logoUrl ? (
                    <img
                      src={form.logoUrl}
                      alt="Logo preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span>{form.name.slice(0, 2).toUpperCase() || "BM"}</span>
                  )}
                </div>
                <div className="space-y-0.5 pb-1">
                  <h3 className="text-base sm:text-lg font-bold text-ink leading-tight font-display">
                    {form.name || "Organization Name"}
                  </h3>
                  <p className="text-xs text-ink-muted">
                    {form.website || form.email || "Public presence on BaytMiftah"}
                  </p>
                </div>
              </div>
              <div className="pb-1 text-right">
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <Sparkles className="w-3 h-3" /> Live Client Preview
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <Input
              label="Organization Legal Name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              disabled={!canManageSettings}
              placeholder="e.g. BaytMiftah Real Estate"
              className="rounded-xl"
              required
            />
            <Input
              label="Workspace URL Slug"
              value={form.slug}
              onChange={(event) => updateField("slug", event.target.value)}
              disabled={!canManageSettings}
              placeholder="prime-properties"
              className="rounded-xl"
              required
            />
            <Input
              label="Corporate Website"
              value={form.website}
              onChange={(event) => updateField("website", event.target.value)}
              disabled={!canManageSettings}
              placeholder="https://example.com"
              className="rounded-xl"
            />
            <Input
              label="Public Inquiries Email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              disabled={!canManageSettings}
              placeholder="hello@example.com"
              className="rounded-xl"
            />
            <Input
              label="Contact Phone"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              disabled={!canManageSettings}
              placeholder="+233 24 000 0000"
              className="rounded-xl"
            />
            <Input
              label="Brand Logo URL"
              value={form.logoUrl}
              onChange={(event) => updateField("logoUrl", event.target.value)}
              disabled={!canManageSettings}
              placeholder="https://..."
              className="rounded-xl"
            />
            <div className="md:col-span-2">
              <Input
                label="Header Banner URL"
                value={form.bannerUrl}
                onChange={(event) => updateField("bannerUrl", event.target.value)}
                disabled={!canManageSettings}
                placeholder="https://..."
                className="rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block mb-2 text-xs font-medium text-ink-secondary">Brand Mission & Portfolio Bio</label>
            <textarea
              className="w-full px-4 py-3 rounded-2xl border border-surface-border bg-surface-subtle text-ink placeholder:text-ink-muted text-xs leading-relaxed min-h-28 focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs transition-all"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              disabled={!canManageSettings}
              placeholder="Tell clients what makes this organization and its property portfolio distinct."
            />
          </div>
        </Card>

        {/* ── Organizational Units ── */}
        <OrganizationUnitsPanel organizationId={organization.id} canManage={canManageSettings} />

        {/* ── Action Buttons ── */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={!canManageSettings || submitting}
            className="bg-gradient-to-r from-emerald-600 to-primary hover:from-emerald-500 hover:to-primary/90 text-white rounded-xl shadow-sm hover:shadow-md px-6 py-2.5 text-sm transition-all duration-200"
          >
            {submitting ? "Saving changes..." : "Save Settings"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(getWorkspaceRoute(organization.slug))}
            className="rounded-xl text-sm border-surface-border/80 hover:bg-surface-subtle"
          >
            Back to Dashboard
          </Button>
        </div>
      </form>
    </div>
  );
}

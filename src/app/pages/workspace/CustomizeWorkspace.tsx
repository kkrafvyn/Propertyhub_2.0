import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, Loader2, Palette, Puzzle, Save, Type } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import type { MemberRole } from "../../../lib/workspace";
import {
  CAPABILITY_DEFINITIONS,
  type CompanyCapability,
} from "../../../lib/company-model";
import {
  DEFAULT_HOME_OPTIONS,
  TERMINOLOGY_PRESETS,
  WORKSPACE_NAV_CATALOG,
  type WorkspaceNavGroup,
} from "../../../lib/workspace-nav-catalog";
import { workspaceCustomizationService } from "../../../lib/workspace-customization.service";

type TabId = "navigation" | "modules" | "branding" | "terminology" | "home";

const GROUP_LABELS: Record<WorkspaceNavGroup, string> = {
  core: "Core workspace",
  tools: "Tools",
  more: "More",
  ai: "AI",
  enterprise: "Enterprise",
};

interface CustomizeWorkspaceProps {
  organizationId: string;
  currentRole: MemberRole | null;
}

export function CustomizeWorkspace({ organizationId, currentRole }: CustomizeWorkspaceProps) {
  const canManage = currentRole === "owner" || currentRole === "manager" || currentRole === "organization_admin";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabId>("navigation");
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>([]);
  const [terminology, setTerminology] = useState<Record<string, string>>({});
  const [defaultHomeSlug, setDefaultHomeSlug] = useState<string>("");
  const [capabilities, setCapabilities] = useState<CompanyCapability[]>([]);
  const [branding, setBranding] = useState({
    primary_color: "#3B82F6",
    secondary_color: "#1F2937",
    accent_color: "#10B981",
    custom_domain: "",
    email_from_address: "",
    email_reply_to: "",
  });
  const [setupMetadata, setSetupMetadata] = useState<unknown>({});

  const load = async () => {
    try {
      setLoading(true);
      const bundle = await workspaceCustomizationService.loadBundle(organizationId);
      setSetupMetadata((bundle.organization as { setup_metadata?: unknown }).setup_metadata ?? {});
      setHiddenSlugs(bundle.customization.hiddenSlugs);
      setTerminology(bundle.customization.terminology);
      setDefaultHomeSlug(bundle.customization.defaultHomeSlug ?? "");
      setCapabilities(bundle.enabledCapabilities);
      setBranding({
        primary_color: bundle.branding?.primary_color || "#3B82F6",
        secondary_color: bundle.branding?.secondary_color || "#1F2937",
        accent_color: bundle.branding?.accent_color || "#10B981",
        custom_domain: bundle.branding?.custom_domain || "",
        email_from_address: bundle.branding?.email_from_address || "",
        email_reply_to: bundle.branding?.email_reply_to || "",
      });
    } catch (error) {
      console.error(error);
      toast.error("Unable to load workspace customization.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const groupedNav = useMemo(() => {
    const groups = new Map<WorkspaceNavGroup, typeof WORKSPACE_NAV_CATALOG>();
    for (const item of WORKSPACE_NAV_CATALOG) {
      const list = groups.get(item.group) ?? [];
      list.push(item);
      groups.set(item.group, list);
    }
    return groups;
  }, []);

  const toggleNav = (slug: string) => {
    setHiddenSlugs((current) =>
      current.includes(slug) ? current.filter((entry) => entry !== slug) : [...current, slug],
    );
  };

  const toggleCapability = (capability: CompanyCapability) => {
    setCapabilities((current) =>
      current.includes(capability)
        ? current.filter((entry) => entry !== capability)
        : [...current, capability],
    );
  };

  const handleSave = async () => {
    if (!canManage) {
      toast.error("Only owners and managers can customize the workspace.");
      return;
    }

    try {
      setSaving(true);
      await workspaceCustomizationService.save({
        organizationId,
        hiddenSlugs,
        terminology,
        defaultHomeSlug: defaultHomeSlug || null,
        enabledCapabilities: capabilities,
        branding,
        existingSetupMetadata: setupMetadata,
      });
      toast.success("Workspace customization saved.");
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save workspace customization.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="flex min-h-[320px] items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const tabs: Array<{ id: TabId; label: string; icon: typeof LayoutGrid }> = [
    { id: "navigation", label: "Navigation", icon: LayoutGrid },
    { id: "modules", label: "Modules", icon: Puzzle },
    { id: "branding", label: "Branding", icon: Palette },
    { id: "terminology", label: "Terminology", icon: Type },
    { id: "home", label: "Default home", icon: LayoutGrid },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customize workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure what your team sees, how modules behave, and how BaytMiftah represents your company.
            Platform security and tenant isolation cannot be changed here.
          </p>
        </div>
        <Button onClick={() => void handleSave()} disabled={!canManage || saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((entry) => {
          const Icon = entry.icon;
          return (
            <Button
              key={entry.id}
              size="sm"
              variant={tab === entry.id ? "default" : "outline"}
              onClick={() => setTab(entry.id)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {entry.label}
            </Button>
          );
        })}
      </div>

      {tab === "navigation" ? (
        <Card className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            Choose which pages appear in the sidebar. Hidden pages remain secure — they are not removed from
            permissions, only from navigation.
          </p>
          {[...groupedNav.entries()].map(([group, items]) => (
            <div key={group}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {GROUP_LABELS[group]}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => {
                  const enabled = !hiddenSlugs.includes(item.slug);
                  return (
                    <label
                      key={item.slug || "dashboard"}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleNav(item.slug)}
                        disabled={!canManage}
                      />
                      <span className="text-sm">{item.label}</span>
                      {!enabled ? <Badge variant="outline">Hidden</Badge> : null}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      {tab === "modules" ? (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Enable operational modules for your business type. This controls capability-gated pages across the
            workspace.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(CAPABILITY_DEFINITIONS).map(([id, capability]) => (
              <label
                key={id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={capabilities.includes(id as CompanyCapability)}
                  onChange={() => toggleCapability(id as CompanyCapability)}
                  disabled={!canManage}
                />
                <div>
                  <p className="font-medium">{capability.label}</p>
                  <p className="text-sm text-muted-foreground">{capability.description}</p>
                </div>
              </label>
            ))}
          </div>
        </Card>
      ) : null}

      {tab === "branding" ? (
        <Card className="p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Primary color"
              type="color"
              value={branding.primary_color}
              onChange={(event) => setBranding((current) => ({ ...current, primary_color: event.target.value }))}
              disabled={!canManage}
            />
            <Input
              label="Secondary color"
              type="color"
              value={branding.secondary_color}
              onChange={(event) => setBranding((current) => ({ ...current, secondary_color: event.target.value }))}
              disabled={!canManage}
            />
            <Input
              label="Accent color"
              type="color"
              value={branding.accent_color}
              onChange={(event) => setBranding((current) => ({ ...current, accent_color: event.target.value }))}
              disabled={!canManage}
            />
          </div>
          <Input
            label="Custom domain (future portal)"
            value={branding.custom_domain}
            onChange={(event) => setBranding((current) => ({ ...current, custom_domain: event.target.value }))}
            placeholder="portal.yourcompany.com"
            disabled={!canManage}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Email from address"
              value={branding.email_from_address}
              onChange={(event) =>
                setBranding((current) => ({ ...current, email_from_address: event.target.value }))
              }
              disabled={!canManage}
            />
            <Input
              label="Email reply-to"
              value={branding.email_reply_to}
              onChange={(event) => setBranding((current) => ({ ...current, email_reply_to: event.target.value }))}
              disabled={!canManage}
            />
          </div>
        </Card>
      ) : null}

      {tab === "terminology" ? (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Override labels your team sees in navigation. Underlying data models stay the same.
          </p>
          {TERMINOLOGY_PRESETS.map((preset) => (
            <Input
              key={preset.slug}
              label={`${preset.label} label`}
              value={terminology[preset.slug] ?? ""}
              onChange={(event) =>
                setTerminology((current) => ({
                  ...current,
                  [preset.slug]: event.target.value,
                }))
              }
              placeholder={preset.placeholder}
              disabled={!canManage}
            />
          ))}
        </Card>
      ) : null}

      {tab === "home" ? (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose the default landing experience when members open the workspace. Individual role-based routing
            still applies when no override is set.
          </p>
          <label className="block text-sm font-medium" htmlFor="default-home">
            Default home page
          </label>
          <select
            id="default-home"
            className="app-input w-full max-w-md"
            value={defaultHomeSlug}
            onChange={(event) => setDefaultHomeSlug(event.target.value)}
            disabled={!canManage}
          >
            <option value="">Use role-based home (recommended)</option>
            {DEFAULT_HOME_OPTIONS.map((option) => (
              <option key={option.slug || "dashboard"} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>
        </Card>
      ) : null}
    </div>
  );
}

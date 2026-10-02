import { useEffect, useMemo, useState } from "react";
import { Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import { workspaceModuleService } from "../../../lib/workspace-module.service";
import {
  WORKSPACE_MODULE_CATEGORY_LABELS,
  type WorkspaceModuleCatalogItem,
  type WorkspaceModuleCategory,
} from "../../../lib/workspace-module-catalog";
import type { MemberRole } from "../../../lib/workspace";

interface ModuleMarketplaceProps {
  organizationId: string;
  currentRole: MemberRole | null;
}

export function ModuleMarketplace({ organizationId, currentRole }: ModuleMarketplaceProps) {
  const canManage = currentRole === "owner" || currentRole === "manager" || currentRole === "organization_admin";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState<WorkspaceModuleCatalogItem[]>([]);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [category, setCategory] = useState<WorkspaceModuleCategory | "all">("all");

  const load = async () => {
    try {
      setLoading(true);
      const [items, enabled] = await Promise.all([
        workspaceModuleService.getCatalog(),
        workspaceModuleService.getEnabledModules(organizationId),
      ]);
      setCatalog(items);
      setEnabledModules(
        enabled.enabledModules.length
          ? enabled.enabledModules
          : items.map((item) => item.slug),
      );
    } catch (error) {
      console.error(error);
      toast.error("Unable to load module marketplace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const filtered = useMemo(
    () => (category === "all" ? catalog : catalog.filter((item) => item.category === category)),
    [catalog, category],
  );

  const toggleModule = (slug: string) => {
    setEnabledModules((current) =>
      current.includes(slug) ? current.filter((entry) => entry !== slug) : [...current, slug],
    );
  };

  const save = async () => {
    if (!canManage) return;
    try {
      setSaving(true);
      await workspaceModuleService.saveEnabledModules(organizationId, enabledModules);
      toast.success("Workspace modules updated.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to save module selection.");
    } finally {
      setSaving(false);
    }
  };

  const categories: Array<WorkspaceModuleCategory | "all"> = [
    "all",
    "core",
    "operations",
    "commercial",
    "finance",
    "advanced",
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-subtle p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Module Marketplace</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enable the BaytMiftah modules your business needs. Security and platform roles remain fixed.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-primary">{enabledModules.length}</p>
              <p className="text-xs text-muted-foreground">of {catalog.length} enabled</p>
            </div>
            <Button size="sm" onClick={() => void save()} disabled={!canManage || saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Selection
            </Button>
          </div>
        </div>

        {/* Enabled progress bar */}
        {catalog.length > 0 && (
          <div className="mt-4">
            <div className="h-1.5 w-full rounded-full bg-surface-subtle overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${(enabledModules.length / catalog.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((entry) => (
          <button
            key={entry}
            onClick={() => setCategory(entry)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
              category === entry
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-surface border-border text-muted-foreground hover:border-muted-foreground'
            }`}
          >
            {entry === 'all' ? `All (${catalog.length})` : WORKSPACE_MODULE_CATEGORY_LABELS[entry]}
          </button>
        ))}
      </div>

      {/* Module Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-border bg-surface animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const enabled = enabledModules.includes(item.slug);
            return (
              <label
                key={item.slug}
                className={`group flex cursor-pointer flex-col gap-3 rounded-xl border-2 p-4 transition-all duration-200 ${
                  enabled
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-muted-foreground hover:shadow-sm'
                } ${!canManage ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    <Badge
                      variant="outline"
                      className={`mt-1 capitalize text-[10px] ${
                        enabled ? 'border-primary/30 text-primary' : ''
                      }`}
                    >
                      {WORKSPACE_MODULE_CATEGORY_LABELS[item.category]}
                    </Badge>
                  </div>
                  <div className={`relative w-10 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${
                    enabled ? 'bg-primary' : 'bg-muted'
                  }`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                      enabled ? 'left-5' : 'left-1'
                    }`} />
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleModule(item.slug)}
                      disabled={!canManage}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

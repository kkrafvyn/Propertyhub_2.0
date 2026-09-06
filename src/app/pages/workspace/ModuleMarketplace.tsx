import { useEffect, useMemo, useState } from "react";
import { Loader2, Package, Plug } from "lucide-react";
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
import { IntegrationMarketplace } from "./IntegrationMarketplace";
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
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Module marketplace
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enable the BaytMiftah modules your business needs. Security, tenant isolation, and platform roles
          remain fixed.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Platform modules</h2>
          <Button size="sm" onClick={() => void save()} disabled={!canManage || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save module selection
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((entry) => (
            <Button
              key={entry}
              size="sm"
              variant={category === entry ? "default" : "outline"}
              onClick={() => setCategory(entry)}
            >
              {entry === "all" ? "All" : WORKSPACE_MODULE_CATEGORY_LABELS[entry]}
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading modules...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => {
              const enabled = enabledModules.includes(item.slug);
              return (
                <label
                  key={item.slug}
                  className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-4 ${
                    enabled ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <Badge variant="outline" className="mt-1 capitalize">
                        {WORKSPACE_MODULE_CATEGORY_LABELS[item.category]}
                      </Badge>
                    </div>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleModule(item.slug)}
                      disabled={!canManage}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground flex-1">{item.description}</p>
                </label>
              );
            })}
          </div>
        )}
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <Plug className="h-5 w-5" />
          Integration partners
        </h2>
        <IntegrationMarketplace organizationId={organizationId} />
      </div>
    </div>
  );
}

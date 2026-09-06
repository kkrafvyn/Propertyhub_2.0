import { supabase } from "./supabase";
import {
  WORKSPACE_MODULE_CATALOG_FALLBACK,
  type WorkspaceModuleCatalogItem,
} from "./workspace-module-catalog";

export const workspaceModuleService = {
  async getCatalog(): Promise<WorkspaceModuleCatalogItem[]> {
    const { data, error } = await supabase
      .from("workspace_module_catalog")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (error) {
      return WORKSPACE_MODULE_CATALOG_FALLBACK;
    }
    return (data || WORKSPACE_MODULE_CATALOG_FALLBACK) as WorkspaceModuleCatalogItem[];
  },

  async getEnabledModules(organizationId: string) {
    const { data, error } = await supabase
      .from("organizations")
      .select("enabled_workspace_modules, enabled_capabilities")
      .eq("id", organizationId)
      .single();

    if (error) throw error;
    return {
      enabledModules: (data?.enabled_workspace_modules || []) as string[],
      enabledCapabilities: (data?.enabled_capabilities || []) as string[],
    };
  },

  async saveEnabledModules(organizationId: string, modules: string[]) {
    const { data, error } = await supabase
      .from("organizations")
      .update({
        enabled_workspace_modules: modules,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId)
      .select("enabled_workspace_modules")
      .single();

    if (error) throw error;
    return (data?.enabled_workspace_modules || []) as string[];
  },
};

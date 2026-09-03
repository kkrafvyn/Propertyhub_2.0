import { supabase } from './supabase';

const db = supabase as any;

export type IntegrationCatalogItem = {
  slug: string;
  name: string;
  category: string;
  description: string;
  provider_website: string | null;
  requires_credentials: boolean;
  supported_regions: string[];
  is_active: boolean;
  sort_order: number;
};

export type OrganizationIntegration = {
  id: string;
  organization_id: string;
  catalog_slug: string;
  status: 'available' | 'connected' | 'paused' | 'error' | 'disconnected';
  config: Record<string, unknown>;
  connected_at: string | null;
  last_sync_at: string | null;
};

export const integrationMarketplaceService = {
  async getCatalog(): Promise<IntegrationCatalogItem[]> {
    const { data, error } = await db.from('integration_catalog').select('*').eq('is_active', true).order('sort_order');
    if (error) throw error;
    return data || [];
  },

  async getOrganizationIntegrations(organizationId: string): Promise<OrganizationIntegration[]> {
    const { data, error } = await db.from('organization_integrations').select('*').eq('organization_id', organizationId);
    if (error) throw error;
    return data || [];
  },

  async getCatalogWithStatus(organizationId: string) {
    const [catalog, orgIntegrations] = await Promise.all([
      this.getCatalog(),
      this.getOrganizationIntegrations(organizationId),
    ]);
    const statusMap = new Map(orgIntegrations.map((i) => [i.catalog_slug, i]));
    return catalog.map((item) => ({
      ...item,
      orgStatus: statusMap.get(item.slug)?.status || 'available',
      orgIntegration: statusMap.get(item.slug) || null,
    }));
  },

  async connectIntegration(organizationId: string, catalogSlug: string, config: Record<string, unknown> = {}) {
    const { data, error } = await db.from('organization_integrations').upsert({
      organization_id: organizationId,
      catalog_slug: catalogSlug,
      status: 'connected',
      config,
      connected_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,catalog_slug' }).select('*').single();
    if (error) throw error;
    return data as OrganizationIntegration;
  },

  async disconnectIntegration(organizationId: string, catalogSlug: string) {
    const { data, error } = await db.from('organization_integrations').upsert({
      organization_id: organizationId,
      catalog_slug: catalogSlug,
      status: 'disconnected',
      connected_at: null,
    }, { onConflict: 'organization_id,catalog_slug' }).select('*').single();
    if (error) throw error;
    return data as OrganizationIntegration;
  },

  async recordSync(organizationId: string, catalogSlug: string) {
    const { error } = await db.from('organization_integrations').update({
      last_sync_at: new Date().toISOString(),
    }).eq('organization_id', organizationId).eq('catalog_slug', catalogSlug);
    if (error) throw error;
  },
};

/**
 * BaytMiftah REOS — White-Label Company App Platform & Live Studio Service
 *
 * Persists branding configuration per organization in `whitelabel_apps`.
 * Falls back to local defaults when no org record exists yet.
 */

import { supabase } from './supabase';

export interface WhitelabelConfig {
  companyName: string;
  brandTagline: string;
  customDomain: string;
  domainStatus: 'live_ssl_active' | 'dns_pending' | 'unconfigured';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: 'Inter' | 'Outfit' | 'Plus Jakarta Sans' | 'Playfair Display';
  borderRadius: 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl';
  logoLightUrl: string;
  logoDarkUrl: string;
  appIconUrl: string;
  enabledModules: {
    residentMobileApp: boolean;
    qrGateClearance: boolean;
    utilitySubmetering: boolean;
    artisanMoMoDispatch: boolean;
    ownerInvestorPortal: boolean;
    aiLeaseAnalyzer: boolean;
  };
}

export const BRAND_PRESETS: Record<string, Partial<WhitelabelConfig>> = {
  devtraco_emerald: {
    companyName: 'Devtraco Living',
    brandTagline: 'Luxury Residential & Estate Management',
    primaryColor: '#059669',
    secondaryColor: '#064e3b',
    accentColor: '#10b981',
    fontFamily: 'Plus Jakarta Sans',
  },
  clifton_gold: {
    companyName: 'Clifton Signature Homes',
    brandTagline: 'Prime Accra Residential Living',
    primaryColor: '#d97706',
    secondaryColor: '#78350f',
    accentColor: '#fbbf24',
    fontFamily: 'Outfit',
  },
  goldkey_sapphire: {
    companyName: 'Goldkey Luxury Enclaves',
    brandTagline: 'Airport Residential & Cantonments Portals',
    primaryColor: '#2563eb',
    secondaryColor: '#1e3a8a',
    accentColor: '#60a5fa',
    fontFamily: 'Inter',
  },
  imperial_obsidian: {
    companyName: 'Imperial Vista Estates',
    brandTagline: 'Ultra-Modern Smart Estate Management',
    primaryColor: '#6366f1',
    secondaryColor: '#312e81',
    accentColor: '#818cf8',
    fontFamily: 'Inter',
  },
};

const DEFAULT_CONFIG: WhitelabelConfig = {
  companyName: 'BaytMiftah Living',
  brandTagline: 'Luxury Real Estate & Resident OS',
  customDomain: '',
  domainStatus: 'unconfigured',
  primaryColor: '#059669',
  secondaryColor: '#064e3b',
  accentColor: '#10b981',
  fontFamily: 'Plus Jakarta Sans',
  borderRadius: 'rounded-2xl',
  logoLightUrl: '',
  logoDarkUrl: '',
  appIconUrl: '',
  enabledModules: {
    residentMobileApp: true,
    qrGateClearance: true,
    utilitySubmetering: true,
    artisanMoMoDispatch: true,
    ownerInvestorPortal: true,
    aiLeaseAnalyzer: true,
  },
};

const db = supabase as any;

function mapSslStatus(status: string | null | undefined): WhitelabelConfig['domainStatus'] {
  if (status === 'active') return 'live_ssl_active';
  if (status === 'pending_dns' || status === 'verifying') return 'dns_pending';
  return 'unconfigured';
}

function mapDomainStatus(status: WhitelabelConfig['domainStatus']): string {
  if (status === 'live_ssl_active') return 'active';
  if (status === 'dns_pending') return 'pending_dns';
  return 'not_configured';
}

function rowToConfig(row: any): WhitelabelConfig {
  const modules = row.active_modules || {};
  return {
    companyName: row.app_name || DEFAULT_CONFIG.companyName,
    brandTagline: row.tagline || DEFAULT_CONFIG.brandTagline,
    customDomain: row.custom_domain || '',
    domainStatus: mapSslStatus(row.ssl_status),
    primaryColor: row.color_primary || DEFAULT_CONFIG.primaryColor,
    secondaryColor: row.color_secondary || DEFAULT_CONFIG.secondaryColor,
    accentColor: row.color_accent || DEFAULT_CONFIG.accentColor,
    fontFamily: (row.font_family as WhitelabelConfig['fontFamily']) || DEFAULT_CONFIG.fontFamily,
    borderRadius: DEFAULT_CONFIG.borderRadius,
    logoLightUrl: row.logo_url || '',
    logoDarkUrl: row.logo_url || '',
    appIconUrl: row.favicon_url || '',
    enabledModules: {
      residentMobileApp: modules.resident_app !== false,
      qrGateClearance: modules.gate_clearance !== false,
      utilitySubmetering: modules.utility_metering !== false,
      artisanMoMoDispatch: modules.contractor_momo !== false,
      ownerInvestorPortal: modules.owner_portal !== false,
      aiLeaseAnalyzer: modules.ai_lease !== false,
    },
  };
}

function configToRow(organizationId: string, config: WhitelabelConfig) {
  return {
    organization_id: organizationId,
    app_name: config.companyName,
    tagline: config.brandTagline,
    logo_url: config.logoLightUrl || config.logoDarkUrl || null,
    favicon_url: config.appIconUrl || null,
    color_primary: config.primaryColor,
    color_secondary: config.secondaryColor,
    color_accent: config.accentColor,
    font_family: config.fontFamily,
    custom_domain: config.customDomain || null,
    ssl_status: mapDomainStatus(config.domainStatus),
    active_modules: {
      resident_app: config.enabledModules.residentMobileApp,
      gate_clearance: config.enabledModules.qrGateClearance,
      utility_metering: config.enabledModules.utilitySubmetering,
      contractor_momo: config.enabledModules.artisanMoMoDispatch,
      owner_portal: config.enabledModules.ownerInvestorPortal,
      ai_lease: config.enabledModules.aiLeaseAnalyzer,
    },
  };
}

export const whitelabelPlatformService = {
  getDefaultConfig(): WhitelabelConfig {
    return { ...DEFAULT_CONFIG };
  },

  async getConfig(organizationId?: string): Promise<WhitelabelConfig> {
    if (!organizationId) return { ...DEFAULT_CONFIG };

    const { data, error } = await db
      .from('whitelabel_apps')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { ...DEFAULT_CONFIG };
    return rowToConfig(data);
  },

  async saveConfig(organizationId: string, config: WhitelabelConfig): Promise<WhitelabelConfig> {
    const payload = configToRow(organizationId, config);
    const { data: existing } = await db
      .from('whitelabel_apps')
      .select('id')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await db
        .from('whitelabel_apps')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      return rowToConfig(data);
    }

    const { data, error } = await db
      .from('whitelabel_apps')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return rowToConfig(data);
  },

  async publishConfig(organizationId: string, config: WhitelabelConfig): Promise<WhitelabelConfig> {
    const saved = await this.saveConfig(organizationId, config);
    const { data: app } = await db
      .from('whitelabel_apps')
      .select('id')
      .eq('organization_id', organizationId)
      .single();

    if (app?.id) {
      await db
        .from('whitelabel_apps')
        .update({ is_published: true, published_at: new Date().toISOString() })
        .eq('id', app.id);

      await db.from('whitelabel_build_events').insert({
        app_id: app.id,
        event_type: 'publish',
        snapshot_json: saved,
      });
    }

    return saved;
  },
};

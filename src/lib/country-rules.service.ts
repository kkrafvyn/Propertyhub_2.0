import { supabase } from "./supabase";
import {
  getCountryPack,
  resolveCountryContext,
  type CountryCode,
  type CountryContext,
} from "./country-rules";
import { resolvePropertyCountryContext } from "./property-country-context.service";
import type { PropertyLocationInput } from "./property-country-context.service";

const db = supabase as any;

export type OrganizationCountrySettings = {
  organization_id: string;
  default_jurisdiction: CountryCode;
  default_subdivision: string | null;
  default_currency: string | null;
  enabled_jurisdictions: CountryCode[];
  collect_platform_fees?: boolean;
  collect_checkout_taxes?: boolean;
  updated_at: string;
};

export const countryRulesService = {
  resolveContext(input: {
    country?: string | null;
    region?: string | null;
    city?: string | null;
    subdivisionCode?: string | null;
    currency?: string | null;
    organizationId?: string;
    organizationJurisdiction?: CountryCode | null;
  }): CountryContext {
    return resolveCountryContext({
      country: input.country,
      region: input.region,
      city: input.city,
      subdivisionCode: input.subdivisionCode,
      currency: input.currency,
      organizationJurisdiction: input.organizationJurisdiction,
    });
  },

  async getOrganizationSettings(organizationId: string): Promise<OrganizationCountrySettings | null> {
    const { data, error } = await db
      .from("organization_country_settings")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsertOrganizationSettings(input: {
    organizationId: string;
    defaultJurisdiction: CountryCode;
    defaultSubdivision?: string;
    defaultCurrency?: string;
    enabledJurisdictions?: CountryCode[];
    collectPlatformFees?: boolean;
    collectCheckoutTaxes?: boolean;
  }) {
    const pack = getCountryPack(input.defaultJurisdiction);
    const payload: Record<string, unknown> = {
      organization_id: input.organizationId,
      default_jurisdiction: input.defaultJurisdiction,
      default_subdivision: input.defaultSubdivision?.trim().toUpperCase() || null,
      default_currency: input.defaultCurrency?.trim().toUpperCase() || pack.currency,
      enabled_jurisdictions: input.enabledJurisdictions || [input.defaultJurisdiction],
      updated_at: new Date().toISOString(),
    };
    if (input.collectPlatformFees !== undefined) {
      payload.collect_platform_fees = input.collectPlatformFees;
    }
    if (input.collectCheckoutTaxes !== undefined) {
      payload.collect_checkout_taxes = input.collectCheckoutTaxes;
    }
    const { data, error } = await db
      .from("organization_country_settings")
      .upsert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data as OrganizationCountrySettings;
  },

  async resolveForOrganization(organizationId: string, property?: PropertyLocationInput) {
    const settings = await this.getOrganizationSettings(organizationId).catch(() => null);
    return resolvePropertyCountryContext(property ?? {}, settings ?? undefined);
  },

  async listTaxProfiles() {
    const { data, error } = await db.from("jurisdiction_tax_profiles").select("*").order("jurisdiction_id");
    if (error) throw error;
    return data || [];
  },
};

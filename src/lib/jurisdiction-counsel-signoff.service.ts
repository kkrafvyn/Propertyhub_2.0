import { supabase } from "./supabase";
import type { CountryCode } from "./country-rules";

const db = supabase as any;

export type CounselSignoff = {
  id: string;
  organization_id: string;
  jurisdiction_id: string;
  subdivision_code: string | null;
  counsel_name: string;
  counsel_firm: string | null;
  template_version: string;
  notes: string | null;
  signed_off_by: string | null;
  signed_off_at: string;
};

export class CounselSignoffRequiredError extends Error {
  constructor(
    public jurisdictionId: string,
    public subdivisionCode?: string | null
  ) {
    super(
      `Counsel sign-off required for ${jurisdictionId}${subdivisionCode ? ` · ${subdivisionCode}` : ""} before sending lease envelopes.`
    );
    this.name = "CounselSignoffRequiredError";
  }
}

function signoffKey(jurisdictionId: string, subdivisionCode?: string | null) {
  return `${jurisdictionId}:${(subdivisionCode || "").toUpperCase()}`;
}

export const jurisdictionCounselSignoffService = {
  async list(organizationId: string): Promise<CounselSignoff[]> {
    const { data, error } = await db
      .from("jurisdiction_lease_counsel_signoffs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("signed_off_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getSignoff(
    organizationId: string,
    jurisdictionId: CountryCode,
    subdivisionCode?: string | null
  ): Promise<CounselSignoff | null> {
    let query = db
      .from("jurisdiction_lease_counsel_signoffs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("jurisdiction_id", jurisdictionId);

    if (subdivisionCode) {
      query = query.eq("subdivision_code", subdivisionCode.toUpperCase());
    } else {
      query = query.is("subdivision_code", null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  },

  async hasSignoff(
    organizationId: string,
    jurisdictionId: CountryCode,
    subdivisionCode?: string | null
  ): Promise<boolean> {
    const exact = await this.getSignoff(organizationId, jurisdictionId, subdivisionCode);
    if (exact) return true;
    if (subdivisionCode) {
      const national = await this.getSignoff(organizationId, jurisdictionId, null);
      return Boolean(national);
    }
    return false;
  },

  assertSignoff(
    organizationId: string,
    jurisdictionId: CountryCode,
    subdivisionCode: string | null | undefined,
    signedOff: boolean,
    options?: { forceOverride?: boolean }
  ) {
    if (options?.forceOverride || signedOff) return;
    throw new CounselSignoffRequiredError(jurisdictionId, subdivisionCode);
  },

  async recordSignoff(input: {
    organizationId: string;
    jurisdictionId: CountryCode;
    subdivisionCode?: string | null;
    counselName: string;
    counselFirm?: string;
    templateVersion?: string;
    notes?: string;
    signedOffBy: string;
  }) {
    const { data, error } = await db
      .from("jurisdiction_lease_counsel_signoffs")
      .upsert(
        {
          organization_id: input.organizationId,
          jurisdiction_id: input.jurisdictionId,
          subdivision_code: input.subdivisionCode?.toUpperCase() || null,
          counsel_name: input.counselName.trim(),
          counsel_firm: input.counselFirm?.trim() || null,
          template_version: input.templateVersion || "2026.09",
          notes: input.notes?.trim() || null,
          signed_off_by: input.signedOffBy,
          signed_off_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,jurisdiction_id,subdivision_code" }
      )
      .select("*")
      .single();
    if (error) throw error;
    return data as CounselSignoff;
  },

  signoffKey,
};

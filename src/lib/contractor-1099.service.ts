import { supabase } from './supabase';

const db = supabase as any;

export type Contractor1099Profile = {
  id: string;
  organization_id: string;
  vendor_id: string | null;
  legal_name: string;
  business_name: string | null;
  tax_id: string;
  tax_id_type: 'ein' | 'ssn' | 'tin' | 'other';
  address_line1: string | null;
  city: string | null;
  state_region: string | null;
  postal_code: string | null;
  country: string;
  receives_1099: boolean;
};

export type Contractor1099Filing = {
  id: string;
  organization_id: string;
  profile_id: string;
  tax_year: number;
  total_paid_minor: number;
  currency: string;
  status: 'draft' | 'ready' | 'filed' | 'accepted' | 'rejected' | 'corrected';
  filed_at: string | null;
  irs_reference: string | null;
  export_format: 'irs_fire' | 'csv' | 'pdf' | null;
};

export const contractor1099Service = {
  async listProfiles(organizationId: string): Promise<Contractor1099Profile[]> {
    const { data, error } = await db.from('contractor_1099_profiles').select('*').eq('organization_id', organizationId).order('legal_name');
    if (error) throw error;
    return data || [];
  },

  async upsertProfile(input: {
    organizationId: string;
    vendorId?: string;
    legalName: string;
    businessName?: string;
    taxId: string;
    taxIdType?: Contractor1099Profile['tax_id_type'];
    addressLine1?: string;
    city?: string;
    stateRegion?: string;
    postalCode?: string;
    country?: string;
  }) {
    const { data, error } = await db.from('contractor_1099_profiles').upsert({
      organization_id: input.organizationId,
      vendor_id: input.vendorId || null,
      legal_name: input.legalName.trim(),
      business_name: input.businessName?.trim() || null,
      tax_id: input.taxId.trim(),
      tax_id_type: input.taxIdType || 'ein',
      address_line1: input.addressLine1?.trim() || null,
      city: input.city?.trim() || null,
      state_region: input.stateRegion?.trim() || null,
      postal_code: input.postalCode?.trim() || null,
      country: input.country || 'US',
      receives_1099: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,tax_id' }).select('*').single();
    if (error) throw error;
    return data as Contractor1099Profile;
  },

  async listFilings(organizationId: string, taxYear?: number): Promise<Contractor1099Filing[]> {
    let query = db.from('contractor_1099_filings').select('*').eq('organization_id', organizationId);
    if (taxYear) query = query.eq('tax_year', taxYear);
    const { data, error } = await query.order('tax_year', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createOrUpdateFiling(input: {
    organizationId: string;
    profileId: string;
    taxYear: number;
    totalPaidMinor: number;
    currency?: string;
    createdBy?: string;
  }) {
    const { data, error } = await db.from('contractor_1099_filings').upsert({
      organization_id: input.organizationId,
      profile_id: input.profileId,
      tax_year: input.taxYear,
      total_paid_minor: input.totalPaidMinor,
      currency: input.currency || 'USD',
      status: 'ready',
      created_by: input.createdBy || null,
    }, { onConflict: 'profile_id,tax_year' }).select('*').single();
    if (error) throw error;
    return data as Contractor1099Filing;
  },

  async markFiled(filingId: string, irsReference?: string, exportFormat: Contractor1099Filing['export_format'] = 'irs_fire') {
    const { data, error } = await db.from('contractor_1099_filings').update({
      status: 'filed',
      filed_at: new Date().toISOString(),
      irs_reference: irsReference?.trim() || null,
      export_format: exportFormat,
    }).eq('id', filingId).select('*').single();
    if (error) throw error;
    return data as Contractor1099Filing;
  },

  exportFilingsCsv(filings: Contractor1099Filing[], profiles: Contractor1099Profile[]): string {
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const header = 'TaxYear,LegalName,TaxId,TaxIdType,TotalPaid,Currency,Status,IRSReference';
    const rows = filings.map((f) => {
      const p = profileMap.get(f.profile_id);
      return [
        f.tax_year,
        p?.legal_name || '',
        p?.tax_id || '',
        p?.tax_id_type || '',
        (f.total_paid_minor / 100).toFixed(2),
        f.currency,
        f.status,
        f.irs_reference || '',
      ].join(',');
    });
    return [header, ...rows].join('\n');
  },
};

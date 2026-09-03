import { supabase } from './supabase';

const db = supabase as any;

export type PortalAccess = {
  id: string;
  organization_id: string;
  estate_id: string | null;
  portal_type: 'owner' | 'board' | 'vendor' | 'resident';
  contact_name: string;
  contact_email: string;
  access_token: string;
  expires_at: string | null;
  last_accessed_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type OwnerPortalSnapshot = {
  portal_type: string;
  contact_name: string;
  contact_email: string;
  estate: Record<string, unknown> | null;
  units: Record<string, unknown>[];
};

export const stakeholderPortalService = {
  async listAccess(organizationId: string): Promise<PortalAccess[]> {
    const { data, error } = await db.from('stakeholder_portal_access').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createAccess(input: {
    organizationId: string;
    portalType: PortalAccess['portal_type'];
    contactName: string;
    contactEmail: string;
    estateId?: string;
    expiresInDays?: number;
    createdBy?: string;
  }) {
    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 86400000).toISOString()
      : null;

    const { data, error } = await db.from('stakeholder_portal_access').insert({
      organization_id: input.organizationId,
      portal_type: input.portalType,
      contact_name: input.contactName.trim(),
      contact_email: input.contactEmail.trim().toLowerCase(),
      estate_id: input.estateId || null,
      expires_at: expiresAt,
      created_by: input.createdBy || null,
    }).select('*').single();
    if (error) throw error;
    return data as PortalAccess;
  },

  async revokeAccess(accessId: string) {
    const { error } = await db.from('stakeholder_portal_access').update({ is_active: false }).eq('id', accessId);
    if (error) throw error;
  },

  getPortalUrl(accessToken: string, portalType: PortalAccess['portal_type'] = 'owner') {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://app.baytmiftah.com';
    return `${base}/portal/${portalType}/${accessToken}`;
  },

  async getOwnerPortalSnapshot(token: string): Promise<OwnerPortalSnapshot> {
    const { data, error } = await db.rpc('get_owner_portal_snapshot', { p_token: token });
    if (error) throw error;
    return data as OwnerPortalSnapshot;
  },
};

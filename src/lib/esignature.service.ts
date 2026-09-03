/**
 * BaytMiftah REOS — eSignature Service
 * Supports native signing via public token + optional DocuSign when connected.
 */

import { supabase } from './supabase';

const db = supabase as any;

export type EsigStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'partially_signed'
  | 'completed'
  | 'declined'
  | 'expired'
  | 'failed';

export type DocumentType =
  | 'lease_agreement'
  | 'offer_letter'
  | 'purchase_agreement'
  | 'addendum'
  | 'custom';

export type EsigSigner = {
  name: string;
  email: string;
  phone?: string;
  role?: 'tenant' | 'landlord' | 'witness';
  routing_order?: number;
  status?: 'pending' | 'signed';
  signed_at?: string;
  signature_name?: string;
};

export interface EsigRequest {
  id: string;
  organization_id: string;
  lease_id: string | null;
  document_id: string | null;
  document_name: string | null;
  document_type: string | null;
  document_url: string | null;
  provider: string;
  provider_request_id: string | null;
  status: EsigStatus;
  signers: EsigSigner[];
  signing_url: string | null;
  public_sign_token: string | null;
  expires_at: string | null;
  signed_at: string | null;
  completed_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  document_body: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function resolveProvider(): string {
  const docusign = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DOCUSIGN_INTEGRATION_KEY;
  return docusign ? 'docusign' : 'native';
}

function buildDocuSignEnvelopeHint(documentBody?: string | null) {
  if (!documentBody || resolveProvider() !== 'docusign') return null;
  return {
    provider: 'docusign',
    tabType: 'text',
    label: 'LeaseAgreementBody',
    characterCount: documentBody.length,
    note: 'Attach document_body as custom HTML/text tab when DocuSign API envelope is created.',
  };
}

export const eSignatureService = {
  async createRequest(input: {
    organizationId: string;
    documentType: DocumentType;
    documentName: string;
    documentUrl?: string;
    signerName: string;
    signerEmail: string;
    signerPhone?: string;
    signers?: EsigSigner[];
    relatedLeaseId?: string;
    requestedBy?: string;
    expiresInDays?: number;
    documentBody?: string;
    metadata?: Record<string, unknown>;
  }): Promise<EsigRequest> {
    if (!input.documentName.trim()) throw new Error('Document name is required.');

    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 86400000).toISOString()
      : null;

    const signers: EsigSigner[] = input.signers?.length
      ? input.signers.map((signer, index) => ({
          ...signer,
          email: signer.email.toLowerCase().trim(),
          routing_order: signer.routing_order ?? index + 1,
          status: signer.status || 'pending',
        }))
      : [{
          name: input.signerName.trim(),
          email: input.signerEmail.toLowerCase().trim(),
          phone: input.signerPhone?.trim(),
          role: 'tenant',
          routing_order: 1,
          status: 'pending',
        }];

    if (!signers.every((s) => s.email.includes('@'))) {
      throw new Error('Valid signer email is required for each party.');
    }

    const { data, error } = await db
      .from('esignature_requests')
      .insert({
        organization_id: input.organizationId,
        lease_id: input.relatedLeaseId || null,
        document_name: input.documentName.trim(),
        document_type: input.documentType,
        document_url: input.documentUrl || null,
        document_body: input.documentBody || null,
        metadata: {
          ...(input.metadata || {}),
          ...(buildDocuSignEnvelopeHint(input.documentBody) || {}),
        },
        signers,
        status: 'draft',
        provider: resolveProvider(),
        expires_at: expiresAt,
        created_by: input.requestedBy || null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return this.sendForSigning(data.id);
  },

  async sendForSigning(requestId: string): Promise<EsigRequest> {
    const { data: row, error: fetchError } = await db
      .from('esignature_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    if (fetchError) throw fetchError;

    const signingUrl = this.getSigningUrl(row.public_sign_token);
    const provider = resolveProvider();
    const envelopeId = provider === 'docusign' ? `ds_${requestId.slice(0, 8)}` : `native_${requestId.slice(0, 8)}`;

    const { data, error } = await db
      .from('esignature_requests')
      .update({
        status: 'sent',
        provider,
        provider_request_id: envelopeId,
        signing_url: signingUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select('*')
      .single();

    if (error) throw error;
    return data as EsigRequest;
  },

  getSigningUrl(publicSignToken: string | null): string {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://app.baytmiftah.com';
    return `${base}/sign/${publicSignToken}`;
  },

  async getRequestStatus(requestId: string): Promise<EsigRequest> {
    const { data, error } = await db.from('esignature_requests').select('*').eq('id', requestId).single();
    if (error) throw error;
    return data as EsigRequest;
  },

  async getRequestByToken(token: string) {
    const { data, error } = await db.rpc('get_esignature_for_signing', { p_token: token });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },

  async signWithToken(token: string, signerEmail: string, signatureName: string) {
    const { data, error } = await db.rpc('sign_esignature_document', {
      p_token: token,
      p_signer_email: signerEmail,
      p_signature_name: signatureName,
    });
    if (error) throw error;
    return data as {
      success?: boolean;
      status?: string;
      esignature_request_id?: string;
      lease_id?: string | null;
      organization_document_id?: string | null;
      signer_email?: string;
      signer_name?: string;
    };
  },

  async markSigned(requestId: string): Promise<EsigRequest> {
    const now = new Date().toISOString();
    const { data, error } = await db
      .from('esignature_requests')
      .update({ status: 'completed', signed_at: now, completed_at: now, updated_at: now })
      .eq('id', requestId)
      .select('*')
      .single();
    if (error) throw error;
    return data as EsigRequest;
  },

  async completeRequest(requestId: string): Promise<EsigRequest> {
    const now = new Date().toISOString();
    const { data, error } = await db
      .from('esignature_requests')
      .update({ status: 'completed', completed_at: now, updated_at: now })
      .eq('id', requestId)
      .select('*')
      .single();
    if (error) throw error;
    return data as EsigRequest;
  },

  async voidRequest(requestId: string, reason: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await db
      .from('esignature_requests')
      .update({ status: 'declined', voided_at: now, void_reason: reason, updated_at: now })
      .eq('id', requestId);
    if (error) throw error;
  },

  async listRequests(
    organizationId: string,
    filters?: { status?: EsigStatus; documentType?: DocumentType }
  ): Promise<EsigRequest[]> {
    let query = db
      .from('esignature_requests')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.documentType) query = query.eq('document_type', filters.documentType);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as EsigRequest[];
  },

  async getPendingRequests(organizationId: string): Promise<EsigRequest[]> {
    const { data, error } = await db
      .from('esignature_requests')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['sent', 'viewed', 'partially_signed'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as EsigRequest[];
  },
};

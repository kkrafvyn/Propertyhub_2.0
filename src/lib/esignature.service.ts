/**
 * BaytMiftah REOS — eSignature Service
 *
 * Wraps the `esignature_requests` table from:
 *   supabase/migrations/2026082611_esignature_requests.sql
 *
 * Current implementation: simulation stub — stores requests and status in DB,
 * generates a mock signing URL. A real provider integration (DocuSign, PandaDoc,
 * HelloSign / Dropbox Sign) should replace `_generateSigningUrl()` when credentials
 * are available.
 *
 * TODO: Replace stub with real provider SDK call.
 */

import { supabase } from './supabase';

const db = supabase as any;

export type EsigStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'completed' | 'voided' | 'expired';
export type DocumentType = 'lease_agreement' | 'offer_letter' | 'purchase_agreement' | 'addendum' | 'custom';

export interface EsigRequest {
  id: string;
  organization_id: string;
  document_type: DocumentType;
  document_name: string;
  document_url: string | null;
  signer_name: string;
  signer_email: string;
  signer_phone: string | null;
  status: EsigStatus;
  provider: string;
  provider_envelope_id: string | null;
  signing_url: string | null;
  signed_at: string | null;
  completed_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  expires_at: string | null;
  related_lease_id: string | null;
  related_offer_id: string | null;
  requested_by: string | null;
  created_at: string;
  updated_at: string;
}

export const eSignatureService = {
  /**
   * Create a new eSignature request and send it to the signer.
   * Currently uses simulation stub — updates to 'sent' and generates a stub URL.
   */
  async createRequest(input: {
    organizationId: string;
    documentType: DocumentType;
    documentName: string;
    documentUrl?: string;
    signerName: string;
    signerEmail: string;
    signerPhone?: string;
    relatedLeaseId?: string;
    relatedOfferId?: string;
    requestedBy?: string;
    expiresInDays?: number;
  }): Promise<EsigRequest> {
    if (!input.signerEmail.includes('@')) throw new Error('Valid signer email is required.');
    if (!input.documentName.trim()) throw new Error('Document name is required.');

    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 86400000).toISOString()
      : null;

    const { data, error } = await db
      .from('esignature_requests')
      .insert({
        organization_id: input.organizationId,
        document_type: input.documentType,
        document_name: input.documentName.trim(),
        document_url: input.documentUrl || null,
        signer_name: input.signerName.trim(),
        signer_email: input.signerEmail.toLowerCase().trim(),
        signer_phone: input.signerPhone?.trim() || null,
        status: 'draft',
        provider: 'simulation', // TODO: replace with real provider name
        related_lease_id: input.relatedLeaseId || null,
        related_offer_id: input.relatedOfferId || null,
        requested_by: input.requestedBy || null,
        expires_at: expiresAt,
      })
      .select('*')
      .single();

    if (error) throw error;
    return this.sendForSigning(data.id);
  },

  /**
   * Send (or re-send) the signing request.
   * TODO: Call real provider API here (DocuSign envelope create, PandaDoc send, etc.)
   */
  async sendForSigning(requestId: string): Promise<EsigRequest> {
    const signingUrl = this._generateSigningUrl(requestId);
    const envelopeId = `sim_env_${requestId.slice(0, 8)}`;

    const { data, error } = await db
      .from('esignature_requests')
      .update({
        status: 'sent',
        provider_envelope_id: envelopeId,
        signing_url: signingUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select('*')
      .single();

    if (error) throw error;
    // TODO: Send email to signer with the signing URL via Resend/SendGrid
    return data as EsigRequest;
  },

  /** Get the status of a signing request. */
  async getRequestStatus(requestId: string): Promise<EsigRequest> {
    const { data, error } = await db
      .from('esignature_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    if (error) throw error;
    return data as EsigRequest;
  },

  /** Mark a request as signed by the signer. */
  async markSigned(requestId: string): Promise<EsigRequest> {
    const now = new Date().toISOString();
    const { data, error } = await db
      .from('esignature_requests')
      .update({ status: 'signed', signed_at: now, updated_at: now })
      .eq('id', requestId)
      .select('*')
      .single();
    if (error) throw error;
    return data as EsigRequest;
  },

  /** Complete a request (all parties have signed). */
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

  /** Void a request (invalidate before signing). */
  async voidRequest(requestId: string, reason: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await db
      .from('esignature_requests')
      .update({ status: 'voided', voided_at: now, void_reason: reason, updated_at: now })
      .eq('id', requestId);
    if (error) throw error;
    // TODO: Call provider API to void the envelope
  },

  /** List all requests for an organisation. */
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

  /** List pending requests (sent or viewed, not yet signed). */
  async getPendingRequests(organizationId: string): Promise<EsigRequest[]> {
    const { data, error } = await db
      .from('esignature_requests')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['sent', 'viewed'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as EsigRequest[];
  },

  /**
   * Generate a simulation signing URL.
   * TODO: Replace with real provider-issued URL.
   */
  _generateSigningUrl(requestId: string): string {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://app.baytmiftah.com';
    return `${base}/sign/${requestId}?mode=simulation`;
  },
};

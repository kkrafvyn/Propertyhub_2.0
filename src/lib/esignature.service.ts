/**
 * BaytMiftah REOS — eSignature Service
 * Supports native signing via public token + optional DocuSign when connected.
 */

import { supabase } from './supabase';
import {
  buildPublicSigningUrl,
  buildSigningActionPath,
  findNextPendingSigner,
  withSignerTokens,
} from './esignature-signer-token';

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
  signer_token?: string;
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

    const signers: EsigSigner[] = withSignerTokens(
      input.signers?.length
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
          }],
    );

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

    const signers: EsigSigner[] = withSignerTokens(
      Array.isArray(row.signers) ? row.signers : [],
    );
    const signingUrl = this.getSigningUrl(row.public_sign_token, signers[0]?.signer_token);
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

  getSigningUrl(publicSignToken: string | null, signerToken?: string | null): string {
    if (!publicSignToken) return '';
    return buildPublicSigningUrl(publicSignToken, signerToken);
  },

  signingUrlForSigner(request: Pick<EsigRequest, 'public_sign_token' | 'signers'>, email?: string | null) {
    const normalized = email?.trim().toLowerCase();
    const signer =
      request.signers.find((entry) => entry.email?.toLowerCase() === normalized) ||
      findNextPendingSigner(request.signers) ||
      request.signers[0];
    return this.getSigningUrl(request.public_sign_token, signer?.signer_token);
  },

  signingActionPathForSigner(
    request: Pick<EsigRequest, 'public_sign_token' | 'signers'>,
    email?: string | null,
    fallback = '/app/leases',
  ) {
    return buildSigningActionPath(this.signingUrlForSigner(request, email), fallback);
  },

  pendingSignerLinks(request: EsigRequest) {
    const signers = Array.isArray(request.signers) ? request.signers : [];
    return signers
      .filter((signer) => signer.status !== 'signed')
      .sort(
        (a, b) =>
          (a.routing_order ?? Number.MAX_SAFE_INTEGER) - (b.routing_order ?? Number.MAX_SAFE_INTEGER),
      )
      .map((signer) => ({
        name: signer.name || signer.email || 'Signer',
        role: signer.role,
        url: this.signingUrlForSigner(request, signer.email),
        path: this.signingActionPathForSigner(request, signer.email),
      }))
      .filter((entry) => Boolean(entry.url));
  },

  async pendingEsignByLeaseId(organizationId: string) {
    const rows = await this.getPendingRequests(organizationId);
    return rows.reduce((acc: Record<string, EsigRequest>, row) => {
      if (row.lease_id) acc[row.lease_id] = row;
      return acc;
    }, {} as Record<string, EsigRequest>);
  },

  async listPendingCosignForLandlord(organizationId: string, userId: string) {
    const rows = await this.getPendingRequests(organizationId);
    return rows
      .filter(
        (row) =>
          row.status === 'partially_signed' &&
          String((row.metadata as Record<string, unknown>)?.landlordSignerUserId || '') === userId,
      )
      .map((row) => {
        const landlordSigner = row.signers.find((signer) => signer.role === 'landlord');
        return {
          id: row.id,
          leaseId: row.lease_id,
          documentName: row.document_name || 'Lease agreement',
          signingUrl: this.signingUrlForSigner(row, landlordSigner?.email),
          signPath: this.signingActionPathForSigner(row, landlordSigner?.email, '/sign'),
        };
      })
      .filter((row) => Boolean(row.signPath));
  },

  async getRequestStatus(requestId: string): Promise<EsigRequest> {
    const { data, error } = await db.from('esignature_requests').select('*').eq('id', requestId).single();
    if (error) throw error;
    return data as EsigRequest;
  },

  async getRequestByToken(token: string, signerToken: string) {
    const { data, error } = await db.rpc('get_esignature_for_signing', {
      p_token: token,
      p_signer_token: signerToken,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Signing request not found or expired');
    return row as {
      id: string;
      document_name: string | null;
      document_type: string | null;
      document_url: string | null;
      document_body: string | null;
      status: string;
      expires_at: string | null;
      current_signer_name: string | null;
      current_signer_email: string | null;
      current_signer_role: string | null;
      routing_position: number;
      total_signers: number;
      signers_summary: Array<{ name?: string; role?: string; status?: string }>;
      cosign_required: boolean;
    };
  },

  async signWithToken(token: string, signerToken: string, signatureName: string) {
    const { data, error } = await db.rpc('sign_esignature_document', {
      p_token: token,
      p_signer_token: signerToken,
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
      signer_role?: string;
      notify_cosign?: boolean;
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

import { supabase } from "./supabase";
import { validateClientUpload, validateFileSignature } from './security/upload-validation';

const db = supabase as any;
const CLAIM_EVIDENCE_BUCKET = 'claim-evidence';
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const EVIDENCE_PATH = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(?:pdf|jpg|png|webp)$/;
const FILE_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
};

function validateId(id: string) {
  if (!UUID.test(id)) throw new Error('Invalid claim or listing identifier');
}

function validateEvidencePaths(paths: string[]) {
  if (paths.length > 5) throw new Error('Attach at most five evidence files');
  if (new Set(paths).size !== paths.length || paths.some(path => !EVIDENCE_PATH.test(path))) {
    throw new Error('Evidence must contain distinct uploaded file paths');
  }
}

function validateNote(note: string | undefined, required = false) {
  if ((note?.length || 0) > 10_000) throw new Error('Notes must be at most 10,000 characters');
  if (required && !note?.trim()) throw new Error('Add a response explaining the information needed or provided');
}

export type PropertyListingClaimStatus =
  | "pending"
  | "needs_info"
  | "approved"
  | "rejected"
  | "withdrawn";

export type PropertyListingClaim = {
  id: string;
  listing_id: string;
  property_id: string | null;
  organization_id: string;
  claimant_user_id: string;
  status: PropertyListingClaimStatus;
  evidence_storage_paths: string[];
  claimant_note: string | null;
  reviewer_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export const propertyListingClaimService = {
  async uploadEvidence(listingId: string, files: File[]) {
    validateId(listingId);
    if (files.length > 5) throw new Error('Attach at most five files');
    for (const file of files) {
      validateClientUpload({ file, maxBytes: 10 * 1024 * 1024, allowPdf: true });
      await validateFileSignature(file);
    }
    if (!files.length) return [];
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Sign in to attach evidence');
    const paths: string[] = [];
    try {
      for (const file of files) {
        const mediaType = file.type.toLowerCase();
        const path = `${user.id}/${listingId.toLowerCase()}/${crypto.randomUUID()}.${FILE_EXTENSIONS[mediaType]}`;
        const { error } = await supabase.storage.from(CLAIM_EVIDENCE_BUCKET).upload(path, file, { contentType: mediaType, upsert: false });
        if (error) throw error;
        paths.push(path);
      }
      return paths;
    } catch (error) {
      try {
        await this.removeUnsubmittedEvidence(paths);
      } catch {
        throw new Error('Evidence upload failed and some unsubmitted files could not be cleaned up. Please contact support.');
      }
      throw error;
    }
  },
  async removeUnsubmittedEvidence(paths: string[]) {
    validateEvidencePaths(paths);
    if (!paths.length) return;
    const { error } = await supabase.storage.from(CLAIM_EVIDENCE_BUCKET).remove(paths);
    if (error) throw error;
  },
  async evidenceUrl(path: string) {
    validateEvidencePaths([path]);
    const { data, error } = await supabase.storage.from(CLAIM_EVIDENCE_BUCKET).createSignedUrl(path, 60);
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('Evidence is unavailable');
    return data.signedUrl;
  },
  async resubmitClaim(claimId: string, note: string, paths: string[]) {
    validateId(claimId);
    validateNote(note, true);
    validateEvidencePaths(paths);
    const { data, error } = await db.rpc('resubmit_property_listing_claim', { p_claim_id: claimId, p_note: note.trim(), p_paths: paths });
    if (error) throw error;
    return data as PropertyListingClaim;
  },
  async getMyClaims(userId: string) {
    const { data, error } = await db
      .from("property_listing_claims")
      .select("*")
      .eq("claimant_user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as PropertyListingClaim[];
  },

  async getApprovedClaims(userId: string) {
    const claims = await this.getMyClaims(userId);
    return claims.filter((claim) => claim.status === "approved");
  },

  async getOrganizationClaims(organizationId: string) {
    const { data, error } = await db
      .from("property_listing_claims")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as PropertyListingClaim[];
  },

  async submitClaim(input: {
    listingId: string;
    claimantNote?: string;
    evidenceStoragePaths?: string[];
  }) {
    validateId(input.listingId);
    validateNote(input.claimantNote);
    validateEvidencePaths(input.evidenceStoragePaths || []);
    const { data, error } = await db.rpc("submit_property_listing_claim", {
      p_listing_id: input.listingId,
      p_claimant_note: input.claimantNote || null,
      p_evidence_storage_paths: input.evidenceStoragePaths || [],
    });
    if (error) throw error;
    return data as PropertyListingClaim;
  },

  async reviewClaim(input: {
    claimId: string;
    status: "approved" | "rejected" | "needs_info";
    reviewerNote?: string;
  }) {
    validateId(input.claimId);
    validateNote(input.reviewerNote, input.status === 'needs_info');
    const { data, error } = await db.rpc("review_property_listing_claim", {
      p_claim_id: input.claimId,
      p_status: input.status,
      p_reviewer_note: input.reviewerNote || null,
    });
    if (error) throw error;
    return data as PropertyListingClaim;
  },

  async withdrawClaim(claimId: string) {
    validateId(claimId);
    const { data, error } = await db.rpc('withdraw_property_listing_claim',{p_claim_id:claimId});
    if (error) throw error;
    return data as PropertyListingClaim;
  },
};

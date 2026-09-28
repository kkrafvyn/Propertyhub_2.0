import { supabase } from "./supabase";
import { getSafeUploadExtension, validateClientUpload, validateFileSignature, validateStoragePath } from "./security/upload-validation";

const KYC_MEDIA_BUCKET = "kyc-documents";

export type KycDocumentType = "national_id" | "passport" | "drivers_license" | "ghana_card";
export type KycStatus = "submitted" | "in_review" | "verified" | "rejected";
export type KycAiRecommendation = "approve" | "review" | "reject";
export type KycAiScreeningStatus = "pending" | "processing" | "completed" | "failed" | "skipped";

export type KycSubmission = {
  id: string;
  user_id: string;
  document_type: KycDocumentType;
  document_number?: string | null;
  full_name?: string | null;
  date_of_birth?: string | null;
  status: KycStatus;
  storage_path?: string | null;
  reviewer_notes?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  ai_screening_status?: KycAiScreeningStatus | null;
  ai_confidence_score?: number | null;
  ai_recommendation?: KycAiRecommendation | null;
  ai_extracted_data?: Record<string, unknown> | null;
  ai_flags?: string[] | null;
  ai_summary?: string | null;
  ai_screened_at?: string | null;
  ai_source?: string | null;
  context?: "consumer" | "workspace" | null;
  jurisdiction_id?: string | null;
  provider_engine?: string | null;
};

export const kycService = {
  async getLatestSubmission(userId: string, context?: "consumer" | "workspace") {
    let query = supabase
      .from("kyc_submissions")
      .select("*")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(1);

    if (context) {
      query = query.eq("context", context);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data;
  },

  async submit(input: {
    userId: string;
    documentType: KycDocumentType;
    documentNumber?: string;
    fullName?: string;
    dateOfBirth?: string;
    storagePath?: string;
    context?: "consumer" | "workspace";
    jurisdictionId?: string;
    providerEngine?: string;
  }) {
    const { data, error } = await supabase
      .from("kyc_submissions")
      .insert({
        user_id: input.userId,
        document_type: input.documentType,
        document_number: input.documentNumber || null,
        full_name: input.fullName || null,
        date_of_birth: input.dateOfBirth || null,
        storage_path: input.storagePath || null,
        context: input.context || "consumer",
        jurisdiction_id: input.jurisdictionId || null,
        provider_engine: input.providerEngine || null,
        status: "submitted",
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async uploadDocument(input: { userId: string; file: File }) {
    validateClientUpload({ file: input.file, maxBytes: 5 * 1024 * 1024, allowPdf: true });
    await validateFileSignature(input.file);

    const extension = getSafeUploadExtension(input.file, true);
    const path = `${input.userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(KYC_MEDIA_BUCKET)
      .upload(path, input.file, {
        cacheControl: "3600",
        contentType: input.file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;
    return path;
  },

  async listPendingSubmissions(limit = 50) {
    const { data, error } = await supabase
      .from("kyc_submissions")
      .select(`
        *,
        user:users(id, email, full_name, phone, verified)
      `)
      .in("status", ["submitted", "in_review"])
      .order("submitted_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getDocumentSignedUrl(storagePath: string, expiresIn = 300) {
    const safeStoragePath = validateStoragePath(storagePath);
    const { data, error } = await supabase.storage
      .from(KYC_MEDIA_BUCKET)
      .createSignedUrl(safeStoragePath, expiresIn);

    if (error) throw error;
    return data?.signedUrl || null;
  },

  async reviewSubmission(
    submissionId: string,
    status: "verified" | "rejected",
    reviewerNotes?: string,
  ) {
    const { data, error } = await supabase.rpc("review_kyc_submission", {
      p_submission_id: submissionId,
      p_status: status,
      p_reviewer_notes: reviewerNotes || null,
    });

    if (error) throw error;

    return data as KycSubmission | null;
  },

  async requestAiScreening(submissionId: string) {
    const { data, error } = await supabase.functions.invoke("kyc-ai-screen", {
      body: { submissionId },
    });

    if (error) throw error;
    if (data && typeof data === "object" && "error" in data && data.error) {
      throw new Error(String(data.error));
    }

    return data as { ok: boolean; submission?: KycSubmission };
  },

  async requestSmileVerification(submissionId: string) {
    const { data, error } = await supabase.functions.invoke("kyc-smile-verify", {
      body: { submissionId },
    });

    if (error) throw error;
    if (data && typeof data === "object" && "error" in data && data.error) {
      throw new Error(String(data.error));
    }

    return data as { ok: boolean; configured?: boolean; submission?: KycSubmission };
  },

  async runProviderVerification(submissionId: string, providerEngine: string) {
    if (providerEngine === "smile-identity") {
      return this.requestSmileVerification(submissionId);
    }
    return null;
  },
};

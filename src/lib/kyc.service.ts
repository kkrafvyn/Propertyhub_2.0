import { supabase } from "./supabase";
import { validateClientUpload } from "./security/upload-validation";

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
};

export const kycService = {
  async getLatestSubmission(userId: string) {
    const { data, error } = await supabase
      .from("kyc_submissions")
      .select("*")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

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
        status: "submitted",
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async uploadDocument(input: { userId: string; file: File }) {
    validateClientUpload({ file: input.file, maxBytes: 5 * 1024 * 1024, allowPdf: true });

    const extension = input.file.name.split(".").pop()?.toLowerCase() || "jpg";
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
    const { data, error } = await supabase.storage
      .from(KYC_MEDIA_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error) throw error;
    return data?.signedUrl || null;
  },

  async reviewSubmission(
    submissionId: string,
    status: "verified" | "rejected",
    reviewerNotes?: string,
  ) {
    const { data, error } = await supabase
      .from("kyc_submissions")
      .update({
        status,
        reviewer_notes: reviewerNotes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId)
      .select("*")
      .single();

    if (error) throw error;

    if (status === "verified" && data?.user_id) {
      await supabase
        .from("users")
        .update({ verified: true, updated_at: new Date().toISOString() })
        .eq("id", data.user_id);
    }

    if (status === "rejected" && data?.user_id) {
      await supabase
        .from("users")
        .update({ verified: false, updated_at: new Date().toISOString() })
        .eq("id", data.user_id);
    }

    return data;
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
};

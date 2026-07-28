import { supabase } from "./supabase";

const KYC_MEDIA_BUCKET =
  import.meta.env.VITE_PROPERTY_MEDIA_BUCKET || "property-media";

export type KycDocumentType = "national_id" | "passport" | "drivers_license" | "ghana_card";
export type KycStatus = "submitted" | "in_review" | "verified" | "rejected";

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
    const extension = input.file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `kyc/${input.userId}/${crypto.randomUUID()}.${extension}`;
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

  async getDocumentPublicUrl(storagePath: string) {
    const { data } = supabase.storage.from(KYC_MEDIA_BUCKET).getPublicUrl(storagePath);
    return data?.publicUrl || null;
  },

  async reviewSubmission(
    submissionId: string,
    status: "verified" | "rejected",
    reviewerNotes?: string
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
};

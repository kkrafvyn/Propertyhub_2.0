import { supabase } from "../../../lib/supabase";
import { kycService } from "../../../lib/kyc.service";

export async function fetchMyKyc() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { kyc: null, source: "local" };

  const [{ data: profile, error: profileError }, submission] = await Promise.all([
    supabase
      .from("users")
      .select("id, verified, full_name, phone, email")
      .eq("id", userId)
      .maybeSingle(),
    kycService.getLatestSubmission(userId).catch(() => null),
  ]);

  if (profileError || !profile) {
    return { kyc: { status: "none" }, source: "local" };
  }

  const status = submission?.status || (profile.verified ? "verified" : "none");

  return {
    kyc: {
      ...profile,
      status,
      submission,
    },
    source: "supabase",
  };
}

export async function submitKyc(payload: Record<string, unknown>) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in to submit KYC");

  const documentType =
    (payload.document_type as string) ||
    (payload.documentType as string) ||
    "national_id";

  const submission = await kycService.submit({
    userId,
    documentType: documentType as any,
    documentNumber: (payload.document_number || payload.documentNumber) as string | undefined,
    fullName: (payload.full_name || payload.fullName || payload.name) as string | undefined,
    dateOfBirth: (payload.date_of_birth || payload.dateOfBirth) as string | undefined,
    storagePath: (payload.storage_path || payload.storagePath) as string | undefined,
  });

  if (payload.phone || payload.full_name || payload.fullName) {
    await supabase
      .from("users")
      .update({
        full_name: (payload.full_name ?? payload.fullName) as string | undefined,
        phone: payload.phone as string | undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  }

  return {
    ok: true,
    kyc: { status: submission.status, submission },
    source: "supabase",
  };
}

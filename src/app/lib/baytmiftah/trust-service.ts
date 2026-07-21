import { supabase } from "../../../lib/supabase";

export async function fetchMyKyc() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { kyc: null, source: "local" };

  const { data, error } = await supabase
    .from("users")
    .select("id, verified, full_name, phone, email")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return { kyc: { status: "none" }, source: "local" };
  }

  return {
    kyc: {
      ...data,
      status: data.verified ? "verified" : "none",
    },
    source: "supabase",
  };
}

export async function submitKyc(payload: Record<string, unknown>) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in to submit KYC");

  const { data, error } = await supabase
    .from("users")
    .update({
      full_name: payload.full_name ?? payload.fullName,
      phone: payload.phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id, verified, full_name, phone, email")
    .single();

  if (error) throw error;

  return {
    ok: true,
    kyc: { ...data, status: "submitted" },
    source: "supabase",
  };
}

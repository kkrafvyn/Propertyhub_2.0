import { supabase } from "./supabase";

export type LandlordCosigner = {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "owner" | "manager";
};

/** Resolve landlord / manager co-signer for lease envelopes. */
export const leaseCosignService = {
  async resolveLandlordSigner(organizationId: string): Promise<LandlordCosigner | null> {
    const { data, error } = await supabase
      .from("organization_members")
      .select("role, user:users(id, full_name, email, phone)")
      .eq("organization_id", organizationId)
      .in("role", ["owner", "manager"])
      .order("role", { ascending: true })
      .limit(5);

    if (error) throw error;

    const member = (data || []).find((row) => {
      const user = row.user as { email?: string | null } | null;
      return user?.email?.includes("@");
    });

    if (!member?.user) return null;

    const user = member.user as {
      id: string;
      full_name?: string | null;
      email?: string | null;
      phone?: string | null;
    };

    return {
      userId: user.id,
      name: user.full_name?.trim() || "Authorized landlord",
      email: user.email!.trim().toLowerCase(),
      phone: user.phone,
      role: member.role === "owner" ? "owner" : "manager",
    };
  },
};

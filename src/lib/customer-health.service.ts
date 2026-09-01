import { supabase } from "./supabase";

const db = supabase as any;

export interface OrgHealthRecord {
  id: string;
  name: string;
  unitsManaged: number;
  openIssues: number;
  overdueCharges: number;
  totalCharges: number;
  aiActions30d: number;
  memberCount: number;
  healthScore: number;
  collectionRate: number;
  aiUtilization: number;
  supportVolume: "Low" | "Moderate" | "High";
  renewalRisk: "LOW" | "MEDIUM" | "HIGH";
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export const customerHealthService = {
  /**
   * Computes live health telemetry for every organization the caller can see
   * (RLS restricts to memberships; platform admins see all). Health is derived
   * from real operational signals: collection rate, open issue load, AI
   * adoption, and team size.
   */
  async getOrganizationHealth(): Promise<OrgHealthRecord[]> {
    const { data: orgs, error } = await db
      .from("organizations")
      .select("id, name")
      .order("name");
    if (error) throw error;

    const records: OrgHealthRecord[] = [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    for (const org of (orgs || []) as Array<{ id: string; name: string }>) {
      const { data: estates } = await db
        .from("managed_estates")
        .select("id")
        .eq("organization_id", org.id);
      const estateIds = ((estates || []) as any[]).map((e) => e.id);

      let unitIds: string[] = [];
      if (estateIds.length > 0) {
        const { data: units } = await db.from("estate_units").select("id").in("estate_id", estateIds);
        unitIds = ((units || []) as any[]).map((u) => u.id);
      }

      let overdueCharges = 0;
      let totalCharges = 0;
      if (unitIds.length > 0) {
        const { data: charges } = await db
          .from("estate_charges")
          .select("status")
          .in("unit_id", unitIds);
        const rows = (charges || []) as any[];
        totalCharges = rows.length;
        overdueCharges = rows.filter((c) => c.status === "overdue").length;
      }

      let openIssues = 0;
      if (estateIds.length > 0) {
        const { data: issues } = await db
          .from("estate_issues")
          .select("status")
          .in("estate_id", estateIds);
        openIssues = ((issues || []) as any[]).filter(
          (i) => !["resolved", "closed"].includes(i.status)
        ).length;
      }

      const { count: aiActions30d } = await db
        .from("estate_ai_action_logs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org.id)
        .gte("created_at", thirtyDaysAgo);

      const { count: memberCount } = await db
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("organization_id", org.id);

      const collectionRate =
        totalCharges > 0 ? clamp(((totalCharges - overdueCharges) / totalCharges) * 100) : 100;
      const issueLoad = unitIds.length > 0 ? openIssues / unitIds.length : 0;
      const issueScore = clamp(100 - issueLoad * 120);
      const aiUtilization = clamp(Math.min(100, ((aiActions30d || 0) / 30) * 25));

      const healthScore = clamp(collectionRate * 0.45 + issueScore * 0.35 + aiUtilization * 0.2);

      const supportVolume: OrgHealthRecord["supportVolume"] =
        openIssues > 20 ? "High" : openIssues > 5 ? "Moderate" : "Low";
      const renewalRisk: OrgHealthRecord["renewalRisk"] =
        healthScore >= 75 ? "LOW" : healthScore >= 55 ? "MEDIUM" : "HIGH";

      records.push({
        id: org.id,
        name: org.name,
        unitsManaged: unitIds.length,
        openIssues,
        overdueCharges,
        totalCharges,
        aiActions30d: aiActions30d || 0,
        memberCount: memberCount || 0,
        healthScore,
        collectionRate,
        aiUtilization,
        supportVolume,
        renewalRisk,
      });
    }

    return records;
  },
};

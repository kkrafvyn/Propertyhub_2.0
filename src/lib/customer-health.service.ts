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
  collectionRate: number | null;
  resolutionRate: number | null;
  satisfactionScore: number | null;
  aiUtilization: number;
  scoreConfidence: "LOW" | "MEDIUM" | "HIGH";
  supportVolume: "Low" | "Moderate" | "High";
  renewalRisk: "LOW" | "MEDIUM" | "HIGH" | "INSUFFICIENT_DATA";
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

function requireResult<T>(result: { data?: T; error?: unknown }, label: string): T {
  if (result.error) throw new Error(`Unable to load ${label}`, { cause: result.error });
  return (result.data ?? []) as T;
}

export const customerHealthService = {
  async getOrganizationHealth(organizationId?: string): Promise<OrgHealthRecord[]> {
    let orgQuery = db.from("organizations").select("id, name").order("name");
    if (organizationId) orgQuery = orgQuery.eq("id", organizationId);
    const orgResult = await orgQuery;
    const orgs = requireResult<Array<{ id: string; name: string }>>(orgResult, "organizations");
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    return Promise.all(orgs.map(async (org) => {
      const [estatesResult, maintenanceResult, aiResult, membersResult] = await Promise.all([
        db.from("managed_estates").select("id").eq("organization_id", org.id),
        db.from("maintenance_requests").select("status, tenant_rating").eq("organization_id", org.id),
        db.from("estate_ai_action_logs").select("id", { count: "exact", head: true }).eq("organization_id", org.id).gte("created_at", thirtyDaysAgo),
        db.from("organization_members").select("user_id", { count: "exact", head: true }).eq("organization_id", org.id),
      ]);
      const estates = requireResult<Array<{ id: string }>>(estatesResult, "managed estates");
      const maintenance = requireResult<Array<{ status: string; tenant_rating: number | null }>>(maintenanceResult, "customer service ratings");
      if (aiResult.error) throw new Error("Unable to load AI activity", { cause: aiResult.error });
      if (membersResult.error) throw new Error("Unable to load organization members", { cause: membersResult.error });
      const estateIds = estates.map((estate) => estate.id);

      let units: Array<{ id: string }> = [];
      let issues: Array<{ status: string }> = [];
      if (estateIds.length) {
        const [unitsResult, issuesResult] = await Promise.all([
          db.from("estate_units").select("id").in("estate_id", estateIds),
          db.from("estate_issues").select("status").in("estate_id", estateIds),
        ]);
        units = requireResult(unitsResult, "estate units");
        issues = requireResult(issuesResult, "estate issues");
      }

      let charges: Array<{ status: string }> = [];
      if (units.length) {
        charges = requireResult(await db.from("estate_charges").select("status").in("unit_id", units.map((unit) => unit.id)), "estate charges");
      }

      const overdueCharges = charges.filter((charge) => charge.status === "overdue").length;
      const collectionRate = charges.length ? clamp(((charges.length - overdueCharges) / charges.length) * 100) : null;
      const openIssues = issues.filter((issue) => !["resolved", "closed"].includes(issue.status)).length;
      const finishedMaintenance = maintenance.filter((request) => ["resolved", "closed"].includes(request.status)).length;
      const resolutionRate = maintenance.length ? clamp((finishedMaintenance / maintenance.length) * 100) : null;
      const ratings = maintenance.map((request) => Number(request.tenant_rating)).filter((rating) => rating >= 1 && rating <= 5);
      const satisfactionScore = ratings.length ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 100) / 100 : null;
      const aiActions30d = aiResult.count || 0;
      const aiUtilization = clamp((aiActions30d / 30) * 25);

      const measuredSignals = [collectionRate, resolutionRate, satisfactionScore].filter((value) => value !== null).length;
      const scoreConfidence = measuredSignals === 3 && ratings.length >= 5 ? "HIGH" : measuredSignals >= 2 ? "MEDIUM" : "LOW";
      const weightedSignals = [
        collectionRate === null ? null : { value: collectionRate, weight: 0.4 },
        resolutionRate === null ? null : { value: resolutionRate, weight: 0.3 },
        satisfactionScore === null ? null : { value: satisfactionScore * 20, weight: 0.2 },
        { value: aiUtilization, weight: 0.1 },
      ].filter(Boolean) as Array<{ value: number; weight: number }>;
      const totalWeight = weightedSignals.reduce((sum, signal) => sum + signal.weight, 0);
      const healthScore = totalWeight ? clamp(weightedSignals.reduce((sum, signal) => sum + signal.value * signal.weight, 0) / totalWeight) : 0;
      const renewalRisk = scoreConfidence === "LOW" ? "INSUFFICIENT_DATA" : healthScore >= 75 ? "LOW" : healthScore >= 55 ? "MEDIUM" : "HIGH";

      return {
        id: org.id, name: org.name, unitsManaged: units.length, openIssues, overdueCharges, totalCharges: charges.length,
        aiActions30d, memberCount: membersResult.count || 0, healthScore, collectionRate, resolutionRate, satisfactionScore,
        aiUtilization, scoreConfidence, supportVolume: openIssues > 20 ? "High" : openIssues > 5 ? "Moderate" : "Low", renewalRisk,
      };
    }));
  },
};

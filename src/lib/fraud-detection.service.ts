import { supabase } from "./supabase";
import { Database } from "./database.types";

type FraudAlert = Database["public"]["Tables"]["fraud_alerts"]["Row"];
type ReviewCaseStatus =
  | "open"
  | "investigating"
  | "escalated"
  | "resolved"
  | "dismissed";
type ReviewCasePriority = "low" | "medium" | "high" | "critical";

const ACTIVE_CASE_STATUSES: ReviewCaseStatus[] = ["open", "investigating", "escalated"];

async function writeAuditLog(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {}
) {
  const { error } = await supabase.from("audit_logs").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  });

  if (error) {
    console.error("Failed to write audit log:", error);
  }
}

function mapSeverityToPriority(severity: FraudAlert["severity"]): ReviewCasePriority {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "low":
      return "low";
    default:
      return "medium";
  }
}

async function enrichReviewCases(rows: any[]) {
  if (!rows.length) return [];

  const assignedUserIds = Array.from(
    new Set(rows.map((row) => row.assigned_to).filter(Boolean))
  ) as string[];
  const caseIds = rows.map((row) => row.id);

  const [usersResult, eventsResult] = await Promise.all([
    assignedUserIds.length
      ? supabase
          .from("users")
          .select("id, full_name, email")
          .in("id", assignedUserIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("fraud_case_events")
      .select("id, case_id, actor_user_id, event_type, note, metadata, created_at")
      .in("case_id", caseIds)
      .order("created_at", { ascending: false }),
  ]);

  if (usersResult.error) throw usersResult.error;
  if (eventsResult.error) throw eventsResult.error;

  const userMap = new Map((usersResult.data || []).map((user) => [user.id, user]));
  const eventsByCaseId = new Map<string, any[]>();

  for (const event of eventsResult.data || []) {
    const existing = eventsByCaseId.get(event.case_id) || [];
    existing.push(event);
    eventsByCaseId.set(event.case_id, existing);
  }

  return rows.map((row) => ({
    ...row,
    assigned_user: row.assigned_to ? userMap.get(row.assigned_to) || null : null,
    case_events: eventsByCaseId.get(row.id) || [],
  }));
}

export const fraudDetectionService = {
  async createAlert(
    targetType: "listing" | "user" | "organization" | "transaction",
    targetId: string,
    alertType: string,
    severity: "low" | "medium" | "high" | "critical",
    description: string,
    evidence: Record<string, any> = {}
  ) {
    const { data, error } = await supabase
      .from("fraud_alerts")
      .insert({
        target_type: targetType,
        target_id: targetId,
        alert_type: alertType,
        severity,
        description,
        evidence,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async detectDuplicateImages(listingId: string, imageUrl: string) {
    const { data: existingImages } = await supabase
      .from("image_hashes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!existingImages) return [];

    const suspiciousListings = new Set<string>();
    for (const img of existingImages) {
      if (img.image_url === imageUrl) {
        suspiciousListings.add(img.listing_id);
      }
    }

    return Array.from(suspiciousListings);
  },

  async flagSuspiciousListing(listingId: string) {
    const { data: listing } = await supabase
      .from("listings")
      .select("*, properties(*)")
      .eq("id", listingId)
      .single();

    if (!listing) throw new Error("Listing not found");

    const flags: string[] = [];

    if (listing.price < 100) {
      flags.push("Unrealistic low price");
    }

    const { data: property } = await supabase
      .from("properties")
      .select("*")
      .eq("id", listing.property_id)
      .single();

    if (!property?.description || property.description.length < 20) {
      flags.push("Insufficient description");
    }

    if (flags.length > 0) {
      await this.createAlert(
        "listing",
        listingId,
        "suspicious_listing",
        "medium",
        flags.join("; "),
        { flags }
      );
    }

    return flags;
  },

  async detectSuspiciousAccount(userId: string) {
    const { data: userListings } = await supabase
      .from("listings")
      .select("*")
      .eq(
        "organization_id",
        (await supabase.from("users").select("id").eq("id", userId).single()).data?.id
      );

    const flags: string[] = [];

    if (userListings && userListings.length > 50) {
      flags.push("High volume of listings created");
    }

    const { data: recentChanges } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("admin_id", userId)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (recentChanges && recentChanges.length > 100) {
      flags.push("Suspicious activity volume");
    }

    if (flags.length > 0) {
      await this.createAlert(
        "user",
        userId,
        "suspicious_account",
        "high",
        flags.join("; "),
        { flags }
      );
    }

    return flags;
  },

  async detectFraudTransaction(transactionId: string) {
    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (!transaction) throw new Error("Transaction not found");

    const flags: string[] = [];

    const { data: avgTransactions } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", transaction.user_id);

    if (avgTransactions) {
      const avgAmount =
        avgTransactions.reduce((acc, item) => acc + item.amount, 0) / avgTransactions.length;
      if (transaction.amount > avgAmount * 3) {
        flags.push("Amount significantly higher than average");
      }
    }

    const { data: recentTx } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", transaction.user_id)
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if (recentTx && recentTx.length > 5) {
      flags.push("Multiple rapid transactions");
    }

    if (flags.length > 0) {
      await this.createAlert(
        "transaction",
        transactionId,
        "fraud_transaction",
        "critical",
        flags.join("; "),
        { flags }
      );
    }

    return flags;
  },

  async getFraudAlerts(status = "pending", limit = 50) {
    const { data, error } = await supabase
      .from("fraud_alerts")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getPendingAlertsWithoutCase(limit = 20) {
    const [alertsResult, casesResult] = await Promise.all([
      supabase
        .from("fraud_alerts")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(limit * 3),
      supabase.from("fraud_review_cases").select("alert_id").not("alert_id", "is", null),
    ]);

    if (alertsResult.error) throw alertsResult.error;
    if (casesResult.error) throw casesResult.error;

    const linkedAlertIds = new Set(
      (casesResult.data || []).map((row) => row.alert_id).filter(Boolean)
    );

    return (alertsResult.data || [])
      .filter((alert) => !linkedAlertIds.has(alert.id))
      .slice(0, limit);
  },

  async reviewAlert(
    alertId: string,
    approved: boolean,
    reviewedBy: string,
    note?: string
  ) {
    const status = approved ? "approved" : "rejected";
    const reviewedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("fraud_alerts")
      .update({
        status,
        reviewed_by: reviewedBy,
        reviewed_at: reviewedAt,
      })
      .eq("id", alertId)
      .select()
      .single();

    if (error) throw error;

    await writeAuditLog(reviewedBy, `fraud_alert_${status}`, "fraud_alert", alertId, {
      note: note || null,
    });

    return data;
  },

  async createReviewCaseFromAlert({
    alertId,
    actorUserId,
    assignedTo,
    summary,
  }: {
    alertId: string;
    actorUserId: string;
    assignedTo?: string | null;
    summary?: string;
  }) {
    const existingResult = await supabase
      .from("fraud_review_cases")
      .select("*")
      .eq("alert_id", alertId)
      .maybeSingle();

    if (existingResult.error) throw existingResult.error;
    if (existingResult.data) return existingResult.data;

    const alertResult = await supabase
      .from("fraud_alerts")
      .select("*")
      .eq("id", alertId)
      .single();

    if (alertResult.error) throw alertResult.error;

    const alert = alertResult.data;
    const createdAt = new Date().toISOString();
    const caseSummary =
      summary ||
      `${alert.alert_type.replaceAll("_", " ")} flagged for ${
        alert.target_type
      } review. ${alert.description || ""}`.trim();

    const createResult = await supabase
      .from("fraud_review_cases")
      .insert({
        alert_id: alert.id,
        target_type: alert.target_type,
        target_id: alert.target_id,
        priority: mapSeverityToPriority(alert.severity),
        summary: caseSummary,
        assigned_to: assignedTo || null,
        status: assignedTo ? "investigating" : "open",
      })
      .select("*")
      .single();

    if (createResult.error) throw createResult.error;

    await Promise.allSettled([
      supabase
        .from("fraud_alerts")
        .update({
          status: "reviewed",
          reviewed_by: actorUserId,
          reviewed_at: createdAt,
        })
        .eq("id", alert.id),
      supabase.from("fraud_case_events").insert({
        case_id: createResult.data.id,
        actor_user_id: actorUserId,
        event_type: "case_created",
        note: assignedTo
          ? "Alert triaged and assigned for investigation."
          : "Alert triaged into the moderation queue.",
        metadata: {
          alert_id: alert.id,
          assigned_to: assignedTo || null,
        },
      }),
      writeAuditLog(actorUserId, "fraud_case_created", alert.target_type, alert.target_id, {
        alert_id: alert.id,
        case_id: createResult.data.id,
      }),
    ]);

    return createResult.data;
  },

  async getReviewCases(
    status: ReviewCaseStatus | "active" | "all" = "active",
    limit = 25
  ) {
    let query = supabase
      .from("fraud_review_cases")
      .select("*, alert:fraud_alerts(*), report:fraud_reports(*)")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (status === "active") {
      query = query.in("status", ACTIVE_CASE_STATUSES);
    } else if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return enrichReviewCases(data || []);
  },

  async updateReviewCaseStatus({
    caseId,
    status,
    actorUserId,
    note,
  }: {
    caseId: string;
    status: ReviewCaseStatus;
    actorUserId: string;
    note?: string;
  }) {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "resolved" || status === "dismissed") {
      updates.resolved_at = new Date().toISOString();
      updates.resolution_notes = note || null;
    } else {
      updates.resolved_at = null;
      updates.resolution_notes = null;
    }

    const { data, error } = await supabase
      .from("fraud_review_cases")
      .update(updates)
      .eq("id", caseId)
      .select("*")
      .single();

    if (error) throw error;

    await Promise.allSettled([
      supabase.from("fraud_case_events").insert({
        case_id: caseId,
        actor_user_id: actorUserId,
        event_type: "status_changed",
        note: note || `Status moved to ${status}.`,
        metadata: { status },
      }),
      writeAuditLog(actorUserId, "fraud_case_status_changed", "fraud_review_case", caseId, {
        status,
        note: note || null,
      }),
    ]);

    return data;
  },

  async assignReviewCase({
    caseId,
    assignedTo,
    actorUserId,
    note,
  }: {
    caseId: string;
    assignedTo: string;
    actorUserId: string;
    note?: string;
  }) {
    const { data, error } = await supabase
      .from("fraud_review_cases")
      .update({
        assigned_to: assignedTo,
        status: "investigating",
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId)
      .select("*")
      .single();

    if (error) throw error;

    await Promise.allSettled([
      supabase.from("fraud_case_events").insert({
        case_id: caseId,
        actor_user_id: actorUserId,
        event_type: "case_assigned",
        note: note || "Case assigned for investigation.",
        metadata: { assigned_to: assignedTo },
      }),
      writeAuditLog(actorUserId, "fraud_case_assigned", "fraud_review_case", caseId, {
        assigned_to: assignedTo,
        note: note || null,
      }),
    ]);

    return data;
  },

  async getModerationOverview() {
    const [
      usersResult,
      organizationsResult,
      listingsResult,
      pendingAlertsResult,
      openCasesResult,
      escalatedCasesResult,
      resolvedTodayResult,
      recentAuditResult,
    ] = await Promise.allSettled([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("organizations").select("id", { count: "exact", head: true }),
      supabase.from("listings").select("id", { count: "exact", head: true }),
      supabase.from("fraud_alerts").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("fraud_review_cases")
        .select("id", { count: "exact", head: true })
        .in("status", ACTIVE_CASE_STATUSES),
      supabase
        .from("fraud_review_cases")
        .select("id", { count: "exact", head: true })
        .eq("status", "escalated"),
      supabase
        .from("fraud_review_cases")
        .select("id", { count: "exact", head: true })
        .eq("status", "resolved")
        .gte("resolved_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    return {
      totalUsers: usersResult.status === "fulfilled" ? usersResult.value.count || 0 : 0,
      totalOrganizations:
        organizationsResult.status === "fulfilled" ? organizationsResult.value.count || 0 : 0,
      totalListings: listingsResult.status === "fulfilled" ? listingsResult.value.count || 0 : 0,
      pendingAlerts:
        pendingAlertsResult.status === "fulfilled" ? pendingAlertsResult.value.count || 0 : 0,
      openCases: openCasesResult.status === "fulfilled" ? openCasesResult.value.count || 0 : 0,
      escalatedCases:
        escalatedCasesResult.status === "fulfilled"
          ? escalatedCasesResult.value.count || 0
          : 0,
      resolvedToday:
        resolvedTodayResult.status === "fulfilled" ? resolvedTodayResult.value.count || 0 : 0,
      recentAudit:
        recentAuditResult.status === "fulfilled" ? recentAuditResult.value.data || [] : [],
    };
  },

  async reportFraud(
    reporterId: string,
    targetType: "listing" | "user" | "organization",
    targetId: string,
    reason: string,
    description: string
  ) {
    const { data, error } = await supabase
      .from("fraud_reports")
      .insert({
        reporter_id: reporterId,
        target_type: targetType,
        target_id: targetId,
        reason,
        description,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    await this.createAlert(targetType, targetId, "user_report", "medium", `User reported: ${reason}`, {
      report_id: data.id,
    });

    return data;
  },
};

import { getCorsHeaders, HttpError, jsonResponse, safeErrorMessage } from "../_shared/http.ts";
import { writeServerAuditLog } from "../_shared/audit-log.ts";
import { requireFinanceMembership } from "../_shared/org-auth.ts";
import { enforceRateLimit, rateLimitKey } from "../_shared/rate-limit.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

function getDisbursementUrl() {
  const url = Deno.env.get("PAYANGELS_DISBURSEMENT_URL")?.trim();
  if (!url) throw new HttpError(503, "PayAngels disbursement is not configured");
  return url;
}

const WORK_ORDER_PAYOUT_STATUSES = new Set(["inspection_review", "completed"]);

async function revertDisbursementClaim(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    workOrderId?: string;
    approvalId?: string;
    externalId: string;
    reason: string;
  },
) {
  const failureReason = input.reason.slice(0, 500);

  if (input.workOrderId) {
    await admin
      .from("estate_contractor_work_orders")
      .update({ provider_disbursement_id: null, failure_reason: failureReason })
      .eq("id", input.workOrderId)
      .eq("provider_disbursement_id", input.externalId);
    return;
  }

  if (input.approvalId) {
    await admin
      .from("estate_distribution_approvals")
      .update({
        status: "approved",
        payout_reference: null,
        failure_reason: failureReason,
      })
      .eq("id", input.approvalId)
      .eq("payout_reference", input.externalId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" }, req);

  try {
    const { user } = await requireAuthenticatedUser(req.headers.get("Authorization"));
    await enforceRateLimit({ bucket: rateLimitKey("payangels-disbursement", user.id), maxHits: 10, windowSeconds: 60 });

    const body = await req.json().catch(() => null);
    const amount = Number(body?.amount);
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const organizationId = typeof body?.organizationId === "string" ? body.organizationId.trim() : "";
    const approvalId = typeof body?.approvalId === "string" ? body.approvalId.trim() : "";
    const workOrderId = typeof body?.workOrderId === "string" ? body.workOrderId.trim() : "";

    if (!organizationId) throw new HttpError(400, "organizationId is required");
    if (!approvalId && !workOrderId) throw new HttpError(400, "approvalId or workOrderId is required");
    if (approvalId && workOrderId) throw new HttpError(400, "Provide either approvalId or workOrderId, not both");
    if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, "Valid amount is required");
    if (!phone) throw new HttpError(400, "Recipient phone is required");

    const admin = createAdminClient();
    await requireFinanceMembership(admin, user.id, organizationId);

    const externalId = workOrderId
      ? `payangels_disb_wo_${workOrderId}`
      : `payangels_disb_${approvalId}`;

    let auditEntityType = "estate_distribution_approval";
    let auditEntityId = approvalId;
    let metadata: Record<string, unknown> = {
      organizationId,
      requestedBy: user.id,
      externalId,
      ...(body?.metadata && typeof body.metadata === "object" ? body.metadata : {}),
    };

    if (workOrderId) {
      auditEntityType = "estate_contractor_work_order";
      auditEntityId = workOrderId;
      metadata = { ...metadata, workOrderId };

      const { data: order, error: orderError } = await admin
        .from("estate_contractor_work_orders")
        .select(`
          id,
          status,
          final_cost_pesewas,
          estimate_pesewas,
          provider_disbursement_id,
          estate:managed_estates(organization_id)
        `)
        .eq("id", workOrderId)
        .maybeSingle();

      if (orderError) throw new HttpError(500, orderError.message);
      if (!order) throw new HttpError(404, "Work order not found");

      if (order.provider_disbursement_id) {
        throw new HttpError(409, "Disbursement already initiated for this work order");
      }

      const orderOrgId = (
        order.estate as { organization_id?: string } | null
      )?.organization_id;

      if (orderOrgId !== organizationId) {
        throw new HttpError(403, "Work order does not belong to this organization");
      }

      if (!WORK_ORDER_PAYOUT_STATUSES.has(String(order.status))) {
        throw new HttpError(409, "Work order is not ready for payout");
      }

      const expectedMinor = Number(order.final_cost_pesewas || order.estimate_pesewas || 0);
      const requestedMinor = Math.round(amount * 100);
      if (expectedMinor > 0 && requestedMinor !== expectedMinor) {
        throw new HttpError(400, "Disbursement amount does not match the work order total");
      }

      const { data: claimed, error: claimError } = await admin
        .from("estate_contractor_work_orders")
        .update({ provider_disbursement_id: externalId })
        .eq("id", workOrderId)
        .is("provider_disbursement_id", null)
        .in("status", Array.from(WORK_ORDER_PAYOUT_STATUSES))
        .select("id")
        .maybeSingle();

      if (claimError) throw new HttpError(500, claimError.message);
      if (!claimed) {
        throw new HttpError(409, "Disbursement already initiated for this work order");
      }
    } else {
      metadata = { ...metadata, approvalId };

      const { data: approval, error: approvalError } = await admin
        .from("estate_distribution_approvals")
        .select(`
          id,
          status,
          requested_amount_minor,
          payout_reference,
          statement:estate_owner_statement_runs(
            id,
            estate_id,
            estate:managed_estates(organization_id)
          )
        `)
        .eq("id", approvalId)
        .maybeSingle();

      if (approvalError) throw new HttpError(500, approvalError.message);
      if (!approval) throw new HttpError(404, "Distribution approval not found");

      if (approval.payout_reference) {
        throw new HttpError(409, "Disbursement already initiated for this approval");
      }

      const statementOrgId = (
        approval.statement as { estate?: { organization_id?: string } | null } | null
      )?.estate?.organization_id;

      if (statementOrgId !== organizationId) {
        throw new HttpError(403, "Distribution approval does not belong to this organization");
      }

      if (!["approved", "processing"].includes(String(approval.status))) {
        throw new HttpError(409, "Only approved distributions can be disbursed");
      }

      const expectedMinor = Number(approval.requested_amount_minor || 0);
      const requestedMinor = Math.round(amount * 100);
      if (expectedMinor > 0 && requestedMinor !== expectedMinor) {
        throw new HttpError(400, "Disbursement amount does not match the approved distribution");
      }

      const { data: claimed, error: claimError } = await admin
        .from("estate_distribution_approvals")
        .update({ status: "processing", payout_reference: externalId })
        .eq("id", approvalId)
        .in("status", ["approved", "processing"])
        .is("payout_reference", null)
        .select("id")
        .maybeSingle();

      if (claimError) throw new HttpError(500, claimError.message);
      if (!claimed) {
        throw new HttpError(409, "Disbursement already initiated for this approval");
      }
    }

    const secret = Deno.env.get("PAYANGELS_SECRET_KEY")?.trim();
    if (!secret) throw new HttpError(503, "PayAngels is not configured");

    let revertOnFailure: ((reason: string) => Promise<void>) | null = async (reason) => {
      await revertDisbursementClaim(admin, {
        workOrderId: workOrderId || undefined,
        approvalId: approvalId || undefined,
        externalId,
        reason,
      });
    };

    let response: Response;
    try {
      response = await fetch(getDisbursementUrl(), {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount.toFixed(2),
          currency: "GHS",
          recipient: phone,
          note: body?.note || "BaytMiftah disbursement",
          externalId,
          metadata,
        }),
      });
    } catch (providerError) {
      const reason = safeErrorMessage(providerError, "PayAngels disbursement request failed");
      await revertOnFailure(reason).catch((rollbackError) => {
        console.error("initiate-payangels-disbursement rollback error:", rollbackError);
      });
      throw new HttpError(502, reason);
    }

    const payload = await response.json().catch(() => null) as {
      referenceId?: string;
      reference?: string;
      status?: string;
      message?: string;
    } | null;

    if (!response.ok) {
      const reason = payload?.message || "PayAngels disbursement failed";
      await revertOnFailure(reason).catch((rollbackError) => {
        console.error("initiate-payangels-disbursement rollback error:", rollbackError);
      });
      throw new HttpError(response.status || 502, reason);
    }

    revertOnFailure = null;

    const referenceId = payload?.referenceId || payload?.reference || externalId;

    await writeServerAuditLog({
      actorUserId: user.id,
      action: "payangels_disbursement_initiated",
      entityType: auditEntityType,
      entityId: auditEntityId,
      details: {
        organizationId,
        amountGhs: amount.toFixed(2),
        recipient: phone,
        referenceId,
        externalId,
        providerStatus: payload?.status || "PENDING",
        ...(workOrderId ? { workOrderId } : { approvalId }),
      },
    });

    return jsonResponse(
      200,
      {
        success: true,
        type: "disbursement",
        referenceId,
        externalId,
        amount: amount.toFixed(2),
        recipient: phone,
        status: payload?.status || "PENDING",
        message: payload?.message,
      },
      req,
    );
  } catch (error) {
    if (error instanceof HttpError) return jsonResponse(error.status, { error: error.message }, req);
    console.error("initiate-payangels-disbursement error:", error);
    return jsonResponse(500, { error: safeErrorMessage(error, "Unable to initiate PayAngels disbursement") }, req);
  }
});

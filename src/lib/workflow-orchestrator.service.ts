import { dealCaseService } from "./dealcase.service";
import { documentCenterService } from "./document-center.service";
import { leaseService } from "./lease.service";
import { purchaseWorkflowService } from "./purchase-workflow.service";
import { moveChecklistService } from "./move-checklist.service";
import { notificationService } from "./notification.service";
import { inspectionService } from "./inspection.service";

function formatMoney(amount: number, currency = "GHS") {
  return `${currency} ${amount.toLocaleString()}`;
}

export const workflowOrchestratorService = {
  async approveDealCase(dealCaseId: string, approvedByUserId: string) {
    const deal = await dealCaseService.getDealCaseById(dealCaseId);
    const listing = deal.listing as any;
    const property = listing?.property;
    const user = deal.user as any;

    const updated = await dealCaseService.updateDealCase(dealCaseId, {
      status: "approved",
      pipeline_stage: "qualified",
      last_stage_updated_at: new Date().toISOString(),
    });

    if (["rental_application", "lease_application"].includes(deal.case_type)) {
      const lease = await leaseService.createLeaseFromDealCase({
        dealCaseId,
        tenantUserId: deal.user_id,
        listingId: deal.listing_id,
        organizationId: deal.organization_id,
        rentMinor: Math.round(Number(listing?.price || 0) * 100),
        currency: listing?.currency || "GHS",
      });

      await documentCenterService.createDocument({
        organizationId: deal.organization_id,
        createdBy: approvedByUserId,
        title: `Lease Agreement — ${property?.address || "Property"}`,
        documentType: "lease_contract",
        dealCaseId,
        listingId: deal.listing_id,
        contentMarkdown: documentCenterService.buildDefaultTemplate({
          title: "Lease Agreement",
          organizationName: (deal.organization as any)?.name,
          leadName: user?.full_name || user?.email,
          propertyAddress: [property?.address, property?.city].filter(Boolean).join(", "),
          amountFormatted: formatMoney(Number(listing?.price || 0), listing?.currency || "GHS"),
          documentType: "lease_contract",
        }),
        signatureRequired: true,
        publicVisibility: true,
      });

      await moveChecklistService.ensureChecklists(lease.id);

      await inspectionService.scheduleInspection({
        organizationId: deal.organization_id,
        listingId: deal.listing_id,
        leaseId: lease.id,
        dealCaseId,
        inspectionType: "move_in",
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        tenantUserId: deal.user_id,
        notes: "Auto-scheduled move-in inspection.",
      });
    }

    if (deal.case_type === "purchase_offer") {
      await purchaseWorkflowService.ensureClosingChecklist(dealCaseId);
      await purchaseWorkflowService.markChecklistByKey(dealCaseId, "offer_accepted", approvedByUserId);

      await inspectionService.scheduleInspection({
        organizationId: deal.organization_id,
        listingId: deal.listing_id,
        dealCaseId,
        inspectionType: "pre_purchase",
        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        tenantUserId: deal.user_id,
        notes: "Auto-scheduled after offer approval.",
      });

      await documentCenterService.createDocument({
        organizationId: deal.organization_id,
        createdBy: approvedByUserId,
        title: `Sale Agreement — ${property?.address || "Property"}`,
        documentType: "sale_contract",
        dealCaseId,
        listingId: deal.listing_id,
        contentMarkdown: documentCenterService.buildDefaultTemplate({
          title: "Sale Agreement",
          organizationName: (deal.organization as any)?.name,
          leadName: user?.full_name || user?.email,
          propertyAddress: [property?.address, property?.city].filter(Boolean).join(", "),
          amountFormatted: formatMoney(Number(listing?.price || 0), listing?.currency || "GHS"),
          documentType: "sale_contract",
        }),
        signatureRequired: true,
        publicVisibility: true,
      });
    }

    void notificationService.notifyUser({
      userId: deal.user_id,
      notificationType: "application_approved",
      subject: "Application approved",
      content: `Your ${deal.case_type.replace(/_/g, " ")} was approved.`,
      category: "Offers",
      actionUrl: "/app/applications",
      metadata: { dealCaseId },
    });

    return updated;
  },

  async onDepositPaid(dealCaseId: string, userId: string) {
    await purchaseWorkflowService.markChecklistByKey(dealCaseId, "deposit_paid", userId);
  },

  async onDocumentSigned(dealCaseId: string, documentType: string, userId: string) {
    if (documentType === "sale_contract") {
      await purchaseWorkflowService.markChecklistByKey(dealCaseId, "sale_agreement", userId);
    }
  },
};

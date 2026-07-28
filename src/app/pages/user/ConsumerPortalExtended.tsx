import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Bell,
  CreditCard,
  DoorOpen,
  Droplets,
  FileText,
  Loader2,
  Shield,
  Sparkles,
  Star,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { communicationService, type NotificationRecord } from "../../../lib/communication.service";
import { documentCenterService } from "../../../lib/document-center.service";
import { aiAssistantService } from "../../../lib/ai-assistant.service";
import { mortgageInsuranceService } from "../../../lib/mortgage-insurance.service";
import { maintenanceService } from "../../../lib/maintenance.service";
import { vendorService } from "../../../lib/vendor.service";
import { walletService } from "../../../lib/wallet.service";
import { escrowService } from "../../../lib/escrow.service";
import { ActivityTimeline, EmptyState } from "../../components/ux";
import { CONSUMER_PAGE_CONFIG } from "../../lib/consumer-page-config";
import { buildPurchaseTimeline, buildMaintenanceTimeline, buildEscrowTimeline } from "../../lib/workflow-timeline";
import { purchaseWorkflowService } from "../../../lib/purchase-workflow.service";
import { workflowOrchestratorService } from "../../../lib/workflow-orchestrator.service";
import { CONSUMER_ROUTES, messageThreadPath } from "../../lib/consumer-routes";
import { resolveDeepLinkPath, mobileCaptureProps } from "../../../lib/deep-link";

function formatMoney(amountMinor?: number | null, currency = "GHS") {
  return walletService.formatWalletAmount(amountMinor, currency);
}

export function ResidentHomeSection({ profile }: { profile: any | null }) {
  if (!profile) {
    return (
      <section className="space-y-6">
        <Card className="p-8 text-center text-muted-foreground">
          No active resident profile yet. Complete a lease to unlock door access, utilities, and announcements.
        </Card>
      </section>
    );
  }

  if (!profile.smart_access_enabled) {
    return (
      <section className="space-y-6">
        <Card className="p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">Smart property access pending</h3>
          <p className="text-muted-foreground">
            Your property owner has not enabled smart building access for this lease yet. You will be
            notified when door codes, meters, and connected devices become available.
          </p>
        </Card>
      </section>
    );
  }

  const announcements = Array.isArray(profile.announcements) ? profile.announcements : [];
  const devices = Array.isArray(profile.devices) ? profile.devices : [];
  const doorLock = devices.find((device: any) => device.device_type === "door_lock");
  const energyMeter = devices.find((device: any) => device.device_type === "energy_meter");
  const waterMeter = devices.find((device: any) => device.device_type === "water_meter");

  return (
    <section className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {profile.lease?.listing?.property?.address || "Your residence"} · Smart Property
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <DoorOpen className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Door access</p>
          <p className="text-xl font-semibold">
            {doorLock?.access_code || profile.door_access_code || "Assigned at move-in"}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {doorLock ? `${doorLock.label} · ${doorLock.status}` : `Visitor pass ${profile.visitor_pass_enabled ? "enabled" : "disabled"}`}
          </p>
        </Card>
        <Card className="p-6">
          <Zap className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Energy usage</p>
          <p className="text-xl font-semibold">
            {energyMeter?.last_reading?.kwh ?? profile.energy_kwh ?? "—"} kWh
          </p>
        </Card>
        <Card className="p-6">
          <Droplets className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Water usage</p>
          <p className="text-xl font-semibold">
            {waterMeter?.last_reading?.m3 ?? profile.water_m3 ?? "—"} m³
          </p>
        </Card>
      </div>

      {devices.length > 0 ? (
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Connected devices</h3>
          <div className="space-y-2">
            {devices.map((device: any) => (
              <div key={device.id} className="flex items-center justify-between text-sm">
                <span>
                  {device.label}
                  {device.room ? ` · ${device.room}` : ""}
                </span>
                <Badge variant="outline" className="capitalize">
                  {device.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="p-6">
        <h3 className="font-semibold mb-3">Building announcements</h3>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements from your building manager yet.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((item: any, index: number) => (
              <div key={index} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{item.title || "Announcement"}</p>
                <p className="text-muted-foreground mt-1">{item.body || item.message}</p>
              </div>
            ))}
          </div>
        )}
        {profile.emergency_contact ? (
          <p className="text-sm text-muted-foreground mt-4">
            Emergency contact: {profile.emergency_contact}
          </p>
        ) : null}
      </Card>
    </section>
  );
}

export function NotificationsCenterSection({
  userId,
  notifications,
  onRefresh,
}: {
  userId: string;
  notifications: NotificationRecord[];
  onRefresh: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [markingAll, setMarkingAll] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Messages", "Transactions", "Bookings", "Maintenance", "Offers", "System"];

  const grouped = useMemo(() => {
    const groups: Record<string, NotificationRecord[]> = {};
    for (const notification of notifications) {
      const bucket = communicationService.categorizeNotification(notification);
      groups[bucket] = groups[bucket] || [];
      groups[bucket].push(notification);
    }
    return groups;
  }, [notifications]);

  const visibleGroups = useMemo(() => {
    if (activeCategory === "All") return grouped;
    return { [activeCategory]: grouped[activeCategory] || [] };
  }, [activeCategory, grouped]);

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await communicationService.markAllAsRead(userId);
      toast.success("All notifications marked as read.");
      await onRefresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to mark notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleOpenNotification = async (notification: NotificationRecord) => {
    try {
      if (!notification.read) {
        await communicationService.markAsRead(notification.id);
        await onRefresh();
      }
      if (notification.conversation_id) {
        navigate(messageThreadPath(notification.conversation_id));
        return;
      }
      navigate(resolveDeepLinkPath(notification.action_url, CONSUMER_ROUTES.notifications));
    } catch (error) {
      console.error(error);
      toast.error("Unable to open that notification.");
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <Button variant="outline" onClick={() => void handleMarkAllRead()} disabled={markingAll}>
          {markingAll ? "Updating..." : "Mark all read"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            size="sm"
            variant={activeCategory === category ? "default" : "outline"}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {Object.keys(visibleGroups).length === 0 || notifications.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-60" />
          No notifications yet.
        </Card>
      ) : (
        Object.entries(visibleGroups).map(([category, items]) => (
          <Card key={category} className="p-6">
            <h3 className="font-semibold mb-4">{category}</h3>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications in this category.</p>
            ) : (
              <div className="space-y-3">
                {items.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void handleOpenNotification(notification)}
                  className="flex w-full items-start justify-between gap-4 rounded-lg border border-border p-3 text-left hover:bg-secondary/20 transition-colors"
                >
                  <div>
                    <p className="font-medium">{notification.subject}</p>
                    <p className="text-sm text-muted-foreground mt-1">{notification.content}</p>
                  </div>
                  {!notification.read ? <Badge>New</Badge> : null}
                </button>
              ))}
              </div>
            )}
          </Card>
        ))
      )}
    </section>
  );
}

export function MortgageInsuranceSection({
  userId,
  dealCases,
  inquiries,
  onSubmitted,
}: {
  userId: string;
  dealCases: any[];
  inquiries: any[];
  onSubmitted: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const purchaseCases = dealCases.filter(
    (dealCase) =>
      dealCase.case_type === "purchase_offer" &&
      !["closed", "rejected"].includes(String(dealCase.status))
  );

  const submitInquiry = async (
    inquiryType: "mortgage" | "insurance",
    dealCase?: any
  ) => {
    try {
      setSubmitting(`${inquiryType}-${dealCase?.id || "general"}`);
      await mortgageInsuranceService.submitInquiry({
        userId,
        inquiryType,
        dealCaseId: dealCase?.id || null,
        listingId: dealCase?.listing_id || null,
      });
      toast.success(`${inquiryType === "mortgage" ? "Mortgage" : "Insurance"} inquiry submitted.`);
      await onSubmitted();
    } catch (error) {
      console.error(error);
      toast.error("Unable to submit inquiry.");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <section className="space-y-6">
      {purchaseCases.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Submit a purchase offer first to unlock mortgage and insurance support.
        </Card>
      ) : (
        purchaseCases.map((dealCase) => (
          <Card key={dealCase.id} className="p-5 space-y-4">
            <div>
              <h3 className="font-semibold">
                {dealCase.listing?.property?.address || "Purchase offer"}
              </h3>
              <p className="text-sm text-muted-foreground capitalize">
                {dealCase.status} · {dealCase.pipeline_stage?.replace(/_/g, " ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => void submitInquiry("mortgage", dealCase)}
                disabled={submitting === `mortgage-${dealCase.id}`}
              >
                {submitting === `mortgage-${dealCase.id}` ? "Submitting..." : "Request mortgage quote"}
              </Button>
              <Button
                variant="outline"
                onClick={() => void submitInquiry("insurance", dealCase)}
                disabled={submitting === `insurance-${dealCase.id}`}
              >
                {submitting === `insurance-${dealCase.id}` ? "Submitting..." : "Request insurance quote"}
              </Button>
            </div>
          </Card>
        ))
      )}

      {inquiries.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Your inquiries</h3>
          <div className="space-y-3">
            {inquiries.map((inquiry) => (
              <div key={inquiry.id} className="flex items-center justify-between text-sm">
                <span className="capitalize">{inquiry.inquiry_type}</span>
                <Badge variant="outline" className="capitalize">
                  {inquiry.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}

export function DocumentFoldersSection({
  userId,
  dealCases,
}: {
  userId: string;
  dealCases: any[];
}) {
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<Record<string, any[]>>({});
  const [previewDocument, setPreviewDocument] = useState<any | null>(null);
  const [documentSummary, setDocumentSummary] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const reloadFolders = async () => {
    const nextFolders = await documentCenterService.getUserDocumentsByFolder(userId);
    setFolders(nextFolders);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void documentCenterService
      .getUserDocumentsByFolder(userId)
      .then((nextFolders) => {
        if (!cancelled) setFolders(nextFolders);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setFolders({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleSign = async (document: any) => {
    try {
      setSigningId(document.id);
      await documentCenterService.signDocument({
        documentId: document.id,
        signerUserId: userId,
        signerName: "Client",
        signerRole: "client",
      });
      toast.success("Document signed.");
      await reloadFolders();
    } catch (error) {
      console.error(error);
      toast.error("Unable to sign document.");
    } finally {
      setSigningId(null);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setDownloadingAll(true);
      await documentCenterService.downloadAllUserDocuments(userId);
      toast.success("Document vault downloaded.");
    } catch (error) {
      console.error(error);
      toast.error("No documents are ready to download yet.");
    } finally {
      setDownloadingAll(false);
    }
  };

  const folderOrder = [
    "IDs",
    "Leases",
    "Sale Agreements",
    "Receipts",
    "Inspection Reports",
    "Insurance",
    "Invoices",
    "Other",
  ];

  if (loading) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasDocuments = Object.values(folders).some((items) => items.length > 0);

  return (
    <section className="space-y-6">
      {hasDocuments ? (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => void handleDownloadAll()} disabled={downloadingAll}>
            {downloadingAll ? "Preparing..." : "Download all documents"}
          </Button>
        </div>
      ) : null}

      {!hasDocuments ? (
        <Card className="p-8 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-60" />
          Documents shared with you will appear in folders here.
          {dealCases.length > 0 ? (
            <p className="mt-2 text-sm">
              You have {dealCases.length} active deal case{dealCases.length === 1 ? "" : "s"} waiting on document handoff.
            </p>
          ) : null}
        </Card>
      ) : (
        folderOrder
          .filter((folder) => (folders[folder] || []).length > 0)
          .map((folder) => (
            <Card key={folder} className="p-6">
              <h3 className="font-semibold mb-4">{folder}</h3>
              <div className="space-y-3">
                {(folders[folder] || []).map((document) => {
                  const signedCopyUrl = documentCenterService.getSignedCopyPublicUrl(document);
                  const canSign =
                    document.signature_required &&
                    !["signed", "archived"].includes(String(document.status));

                  return (
                  <div key={document.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <FileText className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{document.title}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {document.status?.replace(/_/g, " ")}
                        {document.version_number ? ` · v${document.version_number}` : ""}
                        {document.listing?.property?.address
                          ? ` · ${document.listing.property.address}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewDocument(document)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => documentCenterService.triggerMarkdownDownload(document)}
                      >
                        Download
                      </Button>
                      {signedCopyUrl ? (
                        <a
                          href={signedCopyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                        >
                          Attachment
                        </a>
                      ) : null}
                      {canSign ? (
                        <Button
                          size="sm"
                          onClick={() => void handleSign(document)}
                          disabled={signingId === document.id}
                        >
                          {signingId === document.id ? "Signing..." : "Sign"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
                })}
              </div>
            </Card>
          ))
      )}

      {previewDocument ? (
        <Card className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{previewDocument.title}</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {previewDocument.status?.replace(/_/g, " ")}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => {
              setPreviewDocument(null);
              setDocumentSummary(null);
            }}>
              Close
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const summary = aiAssistantService.summarizeDocument(
                  previewDocument.title,
                  previewDocument.content_markdown || ""
                );
                setDocumentSummary(summary);
              }}
            >
              Summarize with AI
            </Button>
          </div>
          {documentSummary ? (
            <pre className="whitespace-pre-wrap rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              {documentSummary}
            </pre>
          ) : null}
          <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-4 text-sm">
            {previewDocument.content_markdown || "No document content available."}
          </pre>
        </Card>
      ) : null}
    </section>
  );
}

export function ApplicationsWorkflowSection({
  dealCases,
  escrowHolds,
  userId,
  userName,
  userEmail,
  onPayDeposit,
}: {
  dealCases: any[];
  escrowHolds: any[];
  userId: string;
  userName?: string;
  userEmail?: string;
  onPayDeposit: (dealCase: any, purpose: "deposit" | "lease_fee" | "rent") => Promise<void>;
}) {
  const [workflowData, setWorkflowData] = useState<
    Record<string, { counterOffers: any[]; checklist: any[]; pendingDocs: any[] }>
  >({});
  const [counterAmount, setCounterAmount] = useState<Record<string, string>>({});
  const [counterMessage, setCounterMessage] = useState<Record<string, string>>({});
  const [signingDocId, setSigningDocId] = useState<string | null>(null);
  const [loadingDealId, setLoadingDealId] = useState<string | null>(null);
  const [downloadingPackId, setDownloadingPackId] = useState<string | null>(null);

  const loadPurchaseWorkflow = async (dealCaseId: string) => {
    try {
      setLoadingDealId(dealCaseId);
      const [counterOffers, checklist, pendingDocs] = await Promise.all([
        purchaseWorkflowService.getCounterOffers(dealCaseId),
        purchaseWorkflowService.ensureClosingChecklist(dealCaseId),
        purchaseWorkflowService.getPendingSignatureDocuments(dealCaseId, userId),
      ]);
      setWorkflowData((current) => ({
        ...current,
        [dealCaseId]: { counterOffers, checklist, pendingDocs },
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDealId(null);
    }
  };

  useEffect(() => {
    for (const item of dealCases) {
      if (item.case_type === "purchase_offer") {
        void loadPurchaseWorkflow(item.id);
      }
    }
  }, [dealCases, userId]);

  const submitCounterOffer = async (dealCase: any) => {
    const amountMinor = Math.round(Number(counterAmount[dealCase.id] || 0) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      toast.error("Enter a valid counter-offer amount.");
      return;
    }

    try {
      await purchaseWorkflowService.submitCounterOffer({
        dealCaseId: dealCase.id,
        userId,
        role: "buyer",
        amountMinor,
        currency: dealCase.listing?.currency || "GHS",
        message: counterMessage[dealCase.id]?.trim() || undefined,
      });
      toast.success("Counter-offer submitted.");
      await loadPurchaseWorkflow(dealCase.id);
    } catch (error) {
      console.error(error);
      toast.error("Unable to submit counter-offer.");
    }
  };

  const respondToCounterOffer = async (
    dealCaseId: string,
    offerId: string,
    status: "accepted" | "rejected" | "withdrawn"
  ) => {
    try {
      await purchaseWorkflowService.respondToCounterOffer(offerId, status, dealCaseId);
      toast.success(`Counter-offer ${status}.`);
      await loadPurchaseWorkflow(dealCaseId);
    } catch (error) {
      console.error(error);
      toast.error("Unable to update counter-offer.");
    }
  };

  const toggleChecklist = async (dealCaseId: string, item: any) => {
    try {
      await purchaseWorkflowService.toggleChecklistItem(item.id, userId, !item.completed);
      await loadPurchaseWorkflow(dealCaseId);
    } catch (error) {
      console.error(error);
      toast.error("Unable to update checklist.");
    }
  };

  const signDocument = async (dealCaseId: string, documentId: string) => {
    try {
      setSigningDocId(documentId);
      await purchaseWorkflowService.signDocumentAsConsumer({
        documentId,
        userId,
        signerName: userName || "Buyer",
        signerEmail: userEmail,
      });
      const signedDoc = workflowData[dealCaseId]?.pendingDocs?.find(
        (doc: any) => doc.id === documentId
      );
      if (signedDoc?.document_type) {
        void workflowOrchestratorService.onDocumentSigned(
          dealCaseId,
          signedDoc.document_type,
          userId
        );
      }
      toast.success("Document signed.");
      await loadPurchaseWorkflow(dealCaseId);
    } catch (error) {
      console.error(error);
      toast.error("Unable to sign document.");
    } finally {
      setSigningDocId(null);
    }
  };

  const downloadDocumentPack = async (dealCaseId: string) => {
    try {
      setDownloadingPackId(dealCaseId);
      await documentCenterService.downloadDealCasePack(dealCaseId, userId);
      toast.success("Document pack downloaded.");
    } catch (error) {
      console.error(error);
      toast.error("No documents are ready to download yet.");
    } finally {
      setDownloadingPackId(null);
    }
  };

  if (dealCases.length === 0) {
    const config = CONSUMER_PAGE_CONFIG.applications;
    return (
      <EmptyState
        icon={FileText}
        title={config.emptyTitle || "No active applications yet"}
        description={config.emptyDescription || ""}
        actionLabel={config.emptyActionLabel}
        actionHref={config.emptyActionHref}
      />
    );
  }

  return (
    <div className="space-y-4">
      {dealCases.map((item) => {
        const escrow = escrowHolds.find((hold) => hold.deal_case_id === item.id);
        const isPurchase = item.case_type === "purchase_offer";
        const isRenting = ["rental_application", "lease_application"].includes(item.case_type);
        const canPayDeposit =
          isPurchase && ["approved", "pending"].includes(String(item.status));
        const canPayRent =
          isRenting && ["approved", "pending"].includes(String(item.status));

        const workflow = workflowData[item.id];
        const counterOffers = workflow?.counterOffers || [];
        const checklist = workflow?.checklist || [];
        const pendingDocs = workflow?.pendingDocs || [];

        return (
          <Card key={item.id} className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold text-lg capitalize">
                  {item.case_type?.replace(/_/g, " ")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.listing?.property?.address || "Property"} in{" "}
                  {item.listing?.property?.city || "Ghana"}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {item.status}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
              <span>{formatMoney((item.listing?.price || 0) * 100, item.listing?.currency || "GHS")}</span>
              <span>{item.organization?.name || "Property team"}</span>
              <span className="capitalize">{item.pipeline_stage?.replace(/_/g, " ")}</span>
            </div>

            {item.message ? <p className="text-sm mb-4">{item.message}</p> : null}

            <div className="flex flex-wrap gap-3">
              {canPayDeposit ? (
                <Button size="sm" onClick={() => void onPayDeposit(item, "deposit")}>
                  Pay deposit
                </Button>
              ) : null}
              {canPayRent ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void onPayDeposit(
                      item,
                      item.case_type === "lease_application" ? "lease_fee" : "rent"
                    )
                  }
                >
                  Pay {item.case_type === "lease_application" ? "lease fee" : "first rent"}
                </Button>
              ) : null}
              {escrow ? (
                <Badge variant="secondary" className="capitalize">
                  Escrow {escrow.status}
                </Badge>
              ) : null}
              {isPurchase ? (
                <>
                  <Link to="/app/documents">
                    <Button size="sm" variant="outline">
                      View documents
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void downloadDocumentPack(item.id)}
                    disabled={downloadingPackId === item.id}
                  >
                    {downloadingPackId === item.id ? "Preparing..." : "Download pack"}
                  </Button>
                </>
              ) : null}
            </div>

            {isPurchase ? (
              <>
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Counter-offers</h4>
                  {loadingDealId === item.id && counterOffers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Loading negotiation history...</p>
                  ) : counterOffers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No counter-offers yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {counterOffers.map((offer) => (
                        <div key={offer.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span>
                            {offer.offered_by_role}: {formatMoney(offer.amount_minor, offer.currency)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {offer.status}
                            </Badge>
                            {offer.status === "pending" && offer.offered_by_role === "seller" ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => void respondToCounterOffer(item.id, offer.id, "accepted")}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void respondToCounterOffer(item.id, offer.id, "rejected")}
                                >
                                  Reject
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={counterAmount[item.id] || ""}
                      onChange={(event) =>
                        setCounterAmount((current) => ({ ...current, [item.id]: event.target.value }))
                      }
                      placeholder="Counter-offer amount (GHS)"
                    />
                    <Input
                      value={counterMessage[item.id] || ""}
                      onChange={(event) =>
                        setCounterMessage((current) => ({ ...current, [item.id]: event.target.value }))
                      }
                      placeholder="Optional note"
                    />
                    <Button size="sm" onClick={() => void submitCounterOffer(item)}>
                      Submit counter-offer
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Closing checklist</h4>
                  {checklist.map((checkItem) => (
                    <label key={checkItem.id} className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={checkItem.completed}
                        onChange={() => void toggleChecklist(item.id, checkItem)}
                      />
                      <span>{checkItem.label}</span>
                    </label>
                  ))}
                </div>

                {pendingDocs.length > 0 ? (
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <h4 className="text-sm font-semibold">Documents awaiting your signature</h4>
                    {pendingDocs.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between gap-3 text-sm">
                        <span>{doc.title}</span>
                        <Button
                          size="sm"
                          onClick={() => void signDocument(item.id, doc.id)}
                          disabled={signingDocId === doc.id}
                        >
                          {signingDocId === doc.id ? "Signing..." : "Sign"}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <ActivityTimeline
                  steps={buildPurchaseTimeline(item, escrow, {
                    counterOffers,
                    checklist,
                    pendingDocs,
                  })}
                />
              </>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

export function MaintenanceWithVendorsSection({
  userId,
  leases,
  requests,
  onCreated,
}: {
  userId: string;
  leases: any[];
  requests: any[];
  onCreated: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [leaseId, setLeaseId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [ratingRequestId, setRatingRequestId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [ratingComments, setRatingComments] = useState<Record<string, string>>({});
  const [vendors, setVendors] = useState<any[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  const activeLeases = useMemo(
    () => leases.filter((lease) => lease.status === "active"),
    [leases]
  );

  useEffect(() => {
    void vendorService
      .getVerifiedVendors("maintenance", 12)
      .then(setVendors)
      .catch(() => setVendors([]))
      .finally(() => setLoadingVendors(false));
  }, []);

  const handleSubmit = async () => {
    const lease = activeLeases.find((entry) => entry.id === leaseId) || activeLeases[0];
    if (!lease) {
      toast.error("You need an active lease before submitting maintenance.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      toast.error("Add a title and description.");
      return;
    }

    try {
      setSubmitting(true);
      const created = await maintenanceService.createRequest({
        tenantUserId: userId,
        organizationId: lease.organization_id,
        leaseId: lease.id,
        listingId: lease.listing_id,
        title: title.trim(),
        description: description.trim(),
      });
      if (photoFiles.length > 0) {
        await maintenanceService.uploadRequestPhotos({
          organizationId: lease.organization_id,
          requestId: created.id,
          files: photoFiles,
        });
      }
      toast.success("Maintenance request submitted.");
      setTitle("");
      setDescription("");
      setPhotoFiles([]);
      await onCreated();
    } catch (error) {
      console.error(error);
      toast.error("Unable to submit maintenance request.");
    } finally {
      setSubmitting(false);
    }
  };

  const hireVendor = async (requestId: string, vendorId: string) => {
    try {
      setAssigning(`${requestId}-${vendorId}`);
      await maintenanceService.assignVendor(requestId, vendorId);
      toast.success("Vendor assigned to your request.");
      await onCreated();
    } catch (error) {
      console.error(error);
      toast.error("Unable to assign vendor.");
    } finally {
      setAssigning(null);
    }
  };

  return (
    <section className="space-y-6">
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">New request</h3>
        {activeLeases.length > 1 && (
          <select
            className="w-full rounded-lg border border-border px-3 py-2"
            value={leaseId || activeLeases[0]?.id || ""}
            onChange={(event) => setLeaseId(event.target.value)}
          >
            {activeLeases.map((lease) => (
              <option key={lease.id} value={lease.id}>
                {lease.listing?.property?.address || lease.id}
              </option>
            ))}
          </select>
        )}
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Issue title" />
        <textarea
          className="w-full min-h-28 rounded-lg border border-border px-3 py-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue"
        />
        <div>
          <label className="text-sm text-muted-foreground block mb-2">Photos (optional)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => setPhotoFiles(Array.from(event.target.files || []))}
            {...mobileCaptureProps()}
          />
        </div>
        <Button onClick={() => void handleSubmit()} disabled={submitting || activeLeases.length === 0}>
          {submitting ? "Submitting..." : "Submit request"}
        </Button>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Vendor marketplace</h3>
        </div>
        {loadingVendors ? (
          <p className="text-sm text-muted-foreground">Loading verified vendors...</p>
        ) : vendors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No verified maintenance vendors available yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vendors.slice(0, 4).map((vendor) => (
              <div key={vendor.id} className="rounded-lg border border-border p-4">
                <p className="font-medium">{vendor.business_name}</p>
                <p className="text-sm text-muted-foreground">
                  {vendor.rating_avg || 0}/5 · {vendor.total_jobs_completed || 0} jobs
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No maintenance requests yet.</Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{request.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {request.status.replace(/_/g, " ")}
                </Badge>
              </div>
              {Array.isArray(request.photo_urls) && request.photo_urls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {request.photo_urls.map((url: string) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img
                        src={url}
                        alt="Maintenance evidence"
                        className="h-20 w-20 rounded-lg border border-border object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : null}
              {request.status === "open" && vendors[0] ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void hireVendor(request.id, vendors[0].id)}
                  disabled={assigning === `${request.id}-${vendors[0].id}`}
                >
                  {assigning === `${request.id}-${vendors[0].id}`
                    ? "Assigning..."
                    : `Hire ${vendors[0].business_name}`}
                </Button>
              ) : null}
              {request.status === "resolved" && !request.tenant_rating ? (
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <p className="text-sm font-medium">Rate this repair</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className="p-1"
                        onClick={() =>
                          setRatings((current) => ({ ...current, [request.id]: value }))
                        }
                      >
                        <Star
                          className={`w-5 h-5 ${
                            (ratings[request.id] || 0) >= value
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <Input
                    value={ratingComments[request.id] || ""}
                    onChange={(event) =>
                      setRatingComments((current) => ({
                        ...current,
                        [request.id]: event.target.value,
                      }))
                    }
                    placeholder="Optional comment"
                  />
                  <Button
                    size="sm"
                    disabled={!ratings[request.id] || ratingRequestId === request.id}
                    onClick={async () => {
                      try {
                        setRatingRequestId(request.id);
                        await maintenanceService.submitTenantRating(
                          request.id,
                          userId,
                          ratings[request.id],
                          ratingComments[request.id]
                        );
                        toast.success("Thanks for your feedback.");
                        await onCreated();
                      } catch (error) {
                        console.error(error);
                        toast.error("Unable to submit rating.");
                      } finally {
                        setRatingRequestId(null);
                      }
                    }}
                  >
                    {ratingRequestId === request.id ? "Submitting..." : "Submit rating"}
                  </Button>
                </div>
              ) : request.tenant_rating ? (
                <p className="text-sm text-muted-foreground">
                  Your rating: {request.tenant_rating}/5
                  {request.tenant_rating_comment ? ` — ${request.tenant_rating_comment}` : ""}
                </p>
              ) : null}
              <ActivityTimeline steps={buildMaintenanceTimeline(request)} />
            </Card>
          ))
        )}
      </div>
    </section>
  );
}

export function WalletHubSection({
  wallet,
  ledger,
  escrowHolds,
  payoutRequests,
  payments,
  savedMethods,
  onRefresh,
  onSaveMethod,
  onDownloadReceipt,
  downloadingReceiptId,
}: {
  wallet: any;
  ledger: any[];
  escrowHolds: any[];
  payoutRequests: any[];
  payments: any[];
  savedMethods: any[];
  onRefresh: () => Promise<void>;
  onSaveMethod: (label: string) => Promise<void>;
  onDownloadReceipt: (payment: any) => Promise<void>;
  downloadingReceiptId: string | null;
}) {
  const [methodLabel, setMethodLabel] = useState("");
  const [savingMethod, setSavingMethod] = useState(false);
  const [disputingHoldId, setDisputingHoldId] = useState<string | null>(null);

  const handleDisputeEscrow = async (holdId: string) => {
    const note = window.prompt("Describe the issue with this escrow hold:");
    if (!note?.trim()) return;

    try {
      setDisputingHoldId(holdId);
      await escrowService.disputeEscrowHold(holdId, note.trim());
      toast.success("Escrow dispute submitted.");
      await onRefresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to submit escrow dispute.");
    } finally {
      setDisputingHoldId(null);
    }
  };

  const handleSaveMethod = async () => {
    if (!methodLabel.trim()) {
      toast.error("Enter a label for this payment method.");
      return;
    }
    try {
      setSavingMethod(true);
      await onSaveMethod(methodLabel.trim());
      setMethodLabel("");
      toast.success("Payment method saved.");
      await onRefresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save payment method.");
    } finally {
      setSavingMethod(false);
    }
  };

  return (
    <section className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Available</p>
          <p className="text-3xl font-semibold">
            {formatMoney(wallet.available_minor, wallet.currency)}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">In escrow</p>
          <p className="text-3xl font-semibold">
            {formatMoney(wallet.pending_minor, wallet.currency)}
          </p>
        </Card>
        <Card className="p-6">
          <Shield className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Active escrow holds</p>
          <p className="text-3xl font-semibold">
            {escrowHolds.filter((hold) => hold.status === "held").length}
          </p>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Saved payment methods</h3>
        {savedMethods.length === 0 ? (
          <p className="text-sm text-muted-foreground">Save a MoMo number or bank label for faster checkout.</p>
        ) : (
          <div className="space-y-2">
            {savedMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between text-sm">
                <span>{method.label}</span>
                <Badge variant="outline" className="capitalize">
                  {method.method_type.replace(/_/g, " ")}
                </Badge>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <Input
            value={methodLabel}
            onChange={(event) => setMethodLabel(event.target.value)}
            placeholder="Label e.g. MTN MoMo"
          />
          <Button onClick={() => void handleSaveMethod()} disabled={savingMethod}>
            {savingMethod ? "Saving..." : "Save"}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Escrow holds</h3>
        {escrowHolds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No escrow-backed payments yet.</p>
        ) : (
          escrowHolds.map((hold) => (
            <div key={hold.id} className="py-3 border-b border-border last:border-0 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>{formatMoney(hold.amount_minor, hold.currency)}</span>
                <Badge variant="outline" className="capitalize">
                  {hold.status}
                </Badge>
              </div>
              <ActivityTimeline steps={buildEscrowTimeline(hold)} />
              {hold.status === "held" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleDisputeEscrow(hold.id)}
                  disabled={disputingHoldId === hold.id}
                >
                  {disputingHoldId === hold.id ? "Submitting..." : "Dispute hold"}
                </Button>
              ) : null}
            </div>
          ))
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Receipts & Paystack history</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          payments.map((payment) => {
            const receipt = Array.isArray(payment.receipt) ? payment.receipt[0] : payment.receipt;
            return (
              <div key={payment.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                <CreditCard className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium capitalize">{payment.purpose.replace(/_/g, " ")}</p>
                  <p className="text-sm text-muted-foreground">{payment.provider_reference}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatMoney(payment.amount_minor, payment.currency)}</p>
                  {receipt ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => void onDownloadReceipt(payment)}
                      disabled={downloadingReceiptId === payment.id}
                    >
                      {downloadingReceiptId === payment.id ? "Opening..." : "Receipt"}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </Card>

      {ledger.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Wallet ledger</h3>
          <div className="space-y-2">
            {ledger.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <span>{entry.description || entry.entry_type}</span>
                <span>{formatMoney(entry.amount_minor, wallet.currency)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {payoutRequests.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Payout requests</h3>
          {payoutRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between text-sm py-2">
              <span>{formatMoney(request.amount_minor, request.currency)}</span>
              <Badge variant="outline" className="capitalize">
                {request.status}
              </Badge>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}

export function BaytMiftahAssistantPanel() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  const handleAsk = async () => {
    if (!query.trim()) return;
    const { aiAssistantService } = await import("../../../lib/ai-assistant.service");
    const filters = await aiAssistantService.parseSearchQuery(query);
    const parts = Object.entries(filters).map(([key, value]) => `${key}: ${value}`);
    setAnswer(
      parts.length > 0
        ? `BaytMiftah AI parsed your request as ${parts.join(", ")}. Open Explore to see matching listings.`
        : "BaytMiftah AI can help with search, documents, payments, and maintenance. Try asking for a 2-bed rental in Accra under 5000."
    );
  };

  return (
    <Card className="p-6 border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">BaytMiftah AI</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        One assistant across search, My BaytMiftah, documents, and support.
      </p>
      <div className="flex gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask BaytMiftah anything..."
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleAsk();
          }}
        />
        <Button onClick={() => void handleAsk()}>Ask</Button>
      </div>
      {answer ? <p className="text-sm mt-4">{answer}</p> : null}
      <Link to="/search" className="inline-block mt-4">
        <Button variant="outline" size="sm">
          Open Explore with AI
        </Button>
      </Link>
    </Card>
  );
}

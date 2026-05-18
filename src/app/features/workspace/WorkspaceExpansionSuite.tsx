import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import {
  ArrowRightLeft,
  Brain,
  Building2,
  CheckCircle,
  Copy,
  FileSignature,
  HandCoins,
  LineChart,
  Loader2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { dealCaseService } from "../../../lib/dealcase.service";
import { leadAggregationService } from "../../../lib/lead-aggregation.service";
import { listingService } from "../../../lib/listing.service";
import type { Database } from "../../../lib/database.types";
import { documentCenterService } from "../../../lib/document-center.service";
import { buildMaintenanceSummary, maintenanceOpsService } from "../../../lib/maintenance-ops.service";
import { messageService } from "../../../lib/message.service";
import { organizationService } from "../../../lib/organization.service";
import { paymentService } from "../../../lib/payment.service";
import { crmTaskService } from "../../../lib/production-depth.service";
import { propertyViewingService } from "../../../lib/property-viewing.service";
import {
  buildReferralPerformanceSnapshot,
  parseReferralMetadata,
  trackReferralDealWon,
} from "../../../lib/referral-attribution.service";
import {
  buildAgentPerformanceSnapshot,
  buildAgentCrmActions,
  buildDealTimeline,
  buildListingLaunchPlan,
  buildOfferSuggestion,
  buildReferralLink,
  buildSellerNetSheet,
  buildSellerPortalHealth,
  formatCaseType,
  formatLabel,
  formatMoney,
  formatRelativeTime,
  getMaintenancePlaybooks,
} from "../expansion/feature-helpers";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type WorkspaceExpansionSection =
  | "offers"
  | "deal-rooms"
  | "performance"
  | "seller-portal"
  | "crm"
  | "referrals"
  | "aftercare";

interface WorkspaceExpansionSuiteProps {
  organization: Organization;
  workspaceBasePath: string;
  section: WorkspaceExpansionSection;
}

function isClosedCase(dealCase: any) {
  return ["closed", "rejected"].includes(dealCase.status) ||
    ["won", "lost"].includes(dealCase.pipeline_stage);
}

function getDealContact(dealCase: any) {
  return dealCase.user?.full_name || dealCase.user?.email || "Prospect";
}

function getSelectedCaseId(cases: any[]) {
  return cases.find((dealCase) => !isClosedCase(dealCase))?.id || cases[0]?.id || null;
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
    </Card>
  );
}

const MAINTENANCE_SERVICE_OPTIONS = [
  "cleaning",
  "plumbing",
  "electrical",
  "painting",
  "carpentry",
  "moving",
  "internet",
  "security",
] as const;

export function WorkspaceExpansionSuite({
  organization,
  workspaceBasePath,
  section,
}: WorkspaceExpansionSuiteProps) {
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [aggregatedLeads, setAggregatedLeads] = useState<any[]>([]);
  const [crmTasks, setCrmTasks] = useState<any[]>([]);
  const [viewings, setViewings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [sharedConversations, setSharedConversations] = useState<any[]>([]);
  const [membersById, setMembersById] = useState<Record<string, any>>({});
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [updatingCaseId, setUpdatingCaseId] = useState<string | null>(null);
  const [maintenanceAssignments, setMaintenanceAssignments] = useState<any[]>([]);
  const [maintenanceVendors, setMaintenanceVendors] = useState<any[]>([]);
  const [loadingMaintenanceVendors, setLoadingMaintenanceVendors] = useState(false);
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);
  const [dispatchStatusId, setDispatchStatusId] = useState<string | null>(null);
  const [generatingCrmTasks, setGeneratingCrmTasks] = useState(false);
  const [updatingCrmTaskId, setUpdatingCrmTaskId] = useState<string | null>(null);
  const [dispatchForm, setDispatchForm] = useState({
    propertyId: "",
    serviceType: "cleaning",
    vendorId: "",
    requestedDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().slice(0, 10),
    cost: "",
    description: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        organizationCases,
        organizationListings,
        organizationLeads,
        organizationCrmTasks,
        organizationViewings,
        organizationPayments,
        organizationDocuments,
        inbox,
        members,
        assignments,
      ] =
        await Promise.all([
          dealCaseService.getDealCasesByOrganization(organization.id),
          listingService.getOrganizationListings(organization.id),
          leadAggregationService.getLeads(organization.id).catch(() => []),
          crmTaskService.getOrganizationTasks(organization.id).catch(() => []),
          propertyViewingService.getOrganizationViewings(organization.id),
          paymentService.getOrganizationPropertyTransactions(organization.id),
          documentCenterService.getOrganizationDocuments(organization.id),
          messageService.getOrganizationInbox(organization.id),
          organizationService.getOrganizationMembers(organization.id),
          maintenanceOpsService.getAssignments(organization.id).catch(() => []),
        ]);

      setCases(organizationCases || []);
      setListings(organizationListings || []);
      setAggregatedLeads(organizationLeads || []);
      setCrmTasks(organizationCrmTasks || []);
      setViewings(organizationViewings || []);
      setPayments(organizationPayments || []);
      setDocuments(organizationDocuments || []);
      setSharedConversations(inbox || []);
      setMaintenanceAssignments(assignments || []);
      setMembersById(
        (members || []).reduce<Record<string, any>>((acc, member) => {
          if (member.user_id) {
            acc[member.user_id] = member.user;
          }
          return acc;
        }, {})
      );
      setSelectedCaseId((current) => {
        if (current && (organizationCases || []).some((dealCase) => dealCase.id === current)) {
          return current;
        }

        return getSelectedCaseId(organizationCases || []);
      });
    } catch (error) {
      console.error("Failed to load workspace expansion suite:", error);
      toast.error("We couldn't load these workspace expansion tools right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organization.id]);

  const openCases = useMemo(
    () => cases.filter((dealCase) => !isClosedCase(dealCase)),
    [cases]
  );

  const selectedCase = useMemo(
    () => cases.find((dealCase) => dealCase.id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  const selectedConversation = useMemo(
    () =>
      sharedConversations.find(
        (conversation) =>
          conversation.deal_case_id === selectedCase?.id ||
          (selectedCase &&
            conversation.lead_user_id === selectedCase.user_id &&
            (!conversation.deal_case_id || conversation.deal_case_id === selectedCase.id))
      ) || null,
    [selectedCase, sharedConversations]
  );

  const selectedDocuments = useMemo(
    () =>
      documents.filter(
        (document) =>
          document.deal_case_id === selectedCase?.id ||
          (selectedCase?.listing_id && document.listing_id === selectedCase.listing_id)
      ),
    [documents, selectedCase?.id, selectedCase?.listing_id]
  );

  const selectedPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          (selectedCase?.listing_id && payment.listing_id === selectedCase.listing_id) ||
          (selectedCase?.user_id && payment.payer_user_id === selectedCase.user_id)
      ),
    [payments, selectedCase?.listing_id, selectedCase?.user_id]
  );

  const selectedViewings = useMemo(
    () =>
      viewings.filter(
        (viewing) =>
          viewing.deal_case_id === selectedCase?.id ||
          (selectedCase?.listing_id && viewing.listing_id === selectedCase.listing_id) ||
          (selectedCase?.user_id && viewing.user_id === selectedCase.user_id)
      ),
    [selectedCase?.id, selectedCase?.listing_id, selectedCase?.user_id, viewings]
  );

  const selectedTimeline = useMemo(
    () =>
      buildDealTimeline({
        dealCase: selectedCase,
        viewings: selectedViewings,
        payments: selectedPayments,
        documents: selectedDocuments,
        messages: selectedConversation?.conversation?.messages || [],
      }),
    [
      selectedCase,
      selectedConversation?.conversation?.messages,
      selectedDocuments,
      selectedPayments,
      selectedViewings,
    ]
  );

  const paymentsWithOwners = useMemo(
    () =>
      payments.map((payment) => {
        const matchedCase =
          cases.find((dealCase) => dealCase.id === payment.deal_case_id) ||
          cases.find(
            (dealCase) =>
              dealCase.user_id === payment.payer_user_id &&
              dealCase.listing_id === payment.listing_id
          ) ||
          cases.find(
            (dealCase) =>
              dealCase.user_id === payment.payer_user_id &&
              dealCase.organization_id === payment.organization_id
          ) ||
          null;

        return {
          ...payment,
          deal_case: matchedCase,
          assigned_to: matchedCase?.assigned_to || null,
        };
      }),
    [cases, payments]
  );

  const performanceRows = useMemo(
    () =>
      buildAgentPerformanceSnapshot({
        cases,
        viewings,
        payments: paymentsWithOwners,
        members: membersById,
      }),
    [cases, membersById, paymentsWithOwners, viewings]
  );

  const totalRevenueMinor = useMemo(
    () =>
      payments.filter((payment) => payment.status === "success").reduce((total, payment) => {
        return total + Number(payment.amount_minor || 0);
      }, 0),
    [payments]
  );

  const verifiedPaymentsCount = useMemo(
    () =>
      payments.filter((payment) => {
        const receipt = Array.isArray(payment.receipt) ? payment.receipt[0] : payment.receipt;
        return receipt?.integrity_status === "hashed" || receipt?.integrity_status === "verified";
      }).length,
    [payments]
  );

  const wonCases = useMemo(
    () =>
      cases.filter(
        (dealCase) => dealCase.pipeline_stage === "won" || dealCase.status === "closed"
      ),
    [cases]
  );

  const maintenancePropertyOptions = useMemo(() => {
    const references = new Map<
      string,
      {
        propertyId: string;
        organizationId: string;
        address: string;
        city: string | null;
        region: string | null;
        neighborhood: string | null;
      }
    >();

    [...wonCases, ...cases].forEach((dealCase) => {
      const property = dealCase.listing?.property;
      if (!property?.id) return;

      references.set(property.id, {
        propertyId: property.id,
        organizationId: organization.id,
        address: property.address || "Property",
        city: property.city || null,
        region: property.region || null,
        neighborhood: property.neighborhood || null,
      });
    });

    return [...references.values()];
  }, [cases, organization.id, wonCases]);

  const completedViewings = useMemo(
    () => viewings.filter((viewing) => viewing.status === "completed"),
    [viewings]
  );

  const signedDocumentsCount = useMemo(
    () => documents.filter((document) => document.status === "signed").length,
    [documents]
  );

  const selectedMaintenanceProperty = useMemo(
    () =>
      maintenancePropertyOptions.find((property) => property.propertyId === dispatchForm.propertyId) ||
      null,
    [dispatchForm.propertyId, maintenancePropertyOptions]
  );

  const maintenanceSummary = useMemo(
    () => buildMaintenanceSummary(maintenanceAssignments),
    [maintenanceAssignments]
  );

  const referralPerformance = useMemo(
    () => buildReferralPerformanceSnapshot({ cases }),
    [cases]
  );

  const sellerHealth = useMemo(
    () => buildSellerPortalHealth({ listings, cases, documents, payments }),
    [cases, documents, listings, payments]
  );

  const sellerNetSheet = useMemo(
    () => buildSellerNetSheet({ listings, cases, payments }),
    [cases, listings, payments]
  );

  const listingLaunchPlan = useMemo(
    () => buildListingLaunchPlan({ listings, cases, documents }),
    [cases, documents, listings]
  );

  const crmActions = useMemo(
    () => buildAgentCrmActions({ cases, leads: aggregatedLeads, viewings, payments }),
    [aggregatedLeads, cases, payments, viewings]
  );

  const openCrmTasks = useMemo(
    () => crmTasks.filter((task) => !["completed", "cancelled"].includes(task.status)),
    [crmTasks]
  );

  const activeMarkets = useMemo(
    () =>
      Array.from(
        new Set(
          cases
            .map((dealCase) => dealCase.listing?.property?.city)
            .filter((city): city is string => Boolean(city))
        )
      ).slice(0, 4),
    [cases]
  );

  const referralCampaigns = useMemo(() => {
    const baseUrl =
      typeof window === "undefined" ? "https://baytmiftah.example/search" : `${window.location.origin}/search`;

    return [
      {
        key: "diaspora",
        label: "Diaspora Buyers",
        helper: "Lead with verified listings, remote approvals, and guided payment rails.",
        link: buildReferralLink(baseUrl, organization.slug || organization.id, "diaspora"),
      },
      {
        key: "executive-rentals",
        label: "Executive Rentals",
        helper: "Share with HR teams, relocation coordinators, and corporate partners.",
        link: buildReferralLink(baseUrl, organization.slug || organization.id, "executive-rentals"),
      },
      {
        key: "investor-intro",
        label: "Investor Intro",
        helper: "Route investment leads into listings with stronger trust and payment proof.",
        link: buildReferralLink(baseUrl, organization.slug || organization.id, "investor-intro"),
      },
    ];
  }, [organization.id, organization.slug]);

  const playbooks = getMaintenancePlaybooks();

  useEffect(() => {
    if (!maintenancePropertyOptions.length) return;

    setDispatchForm((current) => ({
      ...current,
      propertyId: current.propertyId || maintenancePropertyOptions[0]?.propertyId || "",
    }));
  }, [maintenancePropertyOptions]);

  useEffect(() => {
    if (!selectedMaintenanceProperty) {
      setMaintenanceVendors([]);
      return;
    }

    const loadVendors = async () => {
      try {
        setLoadingMaintenanceVendors(true);
        const vendors = await maintenanceOpsService.getRecommendedVendors({
          serviceType: dispatchForm.serviceType,
          neighborhood: selectedMaintenanceProperty.neighborhood,
          city: selectedMaintenanceProperty.city,
          region: selectedMaintenanceProperty.region,
        });
        setMaintenanceVendors(vendors);
        setDispatchForm((current) => ({
          ...current,
          vendorId:
            vendors.some((vendor) => vendor.id === current.vendorId)
              ? current.vendorId
              : vendors[0]?.id || "",
        }));
      } catch (error) {
        console.error("Failed to load maintenance vendors:", error);
        setMaintenanceVendors([]);
      } finally {
        setLoadingMaintenanceVendors(false);
      }
    };

    void loadVendors();
  }, [dispatchForm.serviceType, selectedMaintenanceProperty]);

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Referral link copied.");
    } catch (error) {
      console.error("Failed to copy referral link:", error);
      toast.error("We couldn't copy that link right now.");
    }
  };

  const handleDispatchRequest = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedMaintenanceProperty) {
      toast.error("Pick a property before dispatching a vendor.");
      return;
    }

    if (!dispatchForm.vendorId || !dispatchForm.description.trim()) {
      toast.error("Choose a vendor and add a short work summary.");
      return;
    }

    try {
      setDispatchSubmitting(true);
      await maintenanceOpsService.createMaintenanceRequest({
        organizationId: organization.id,
        propertyId: selectedMaintenanceProperty.propertyId,
        vendorId: dispatchForm.vendorId,
        serviceType: dispatchForm.serviceType,
        description: dispatchForm.description.trim(),
        requestedDate: new Date(`${dispatchForm.requestedDate}T12:00:00`),
        cost: dispatchForm.cost ? Number(dispatchForm.cost) : null,
      });

      const refreshedAssignments = await maintenanceOpsService.getAssignments(organization.id);
      setMaintenanceAssignments(refreshedAssignments || []);
      setDispatchForm((current) => ({
        ...current,
        vendorId: maintenanceVendors[0]?.id || "",
        cost: "",
        description: "",
      }));
      toast.success("Vendor dispatch created.");
    } catch (error) {
      console.error("Failed to create maintenance request:", error);
      toast.error("We couldn't dispatch that vendor right now.");
    } finally {
      setDispatchSubmitting(false);
    }
  };

  const handleAssignmentStatusUpdate = async (
    assignmentId: string,
    status: "accepted" | "in_progress" | "completed" | "cancelled"
  ) => {
    try {
      setDispatchStatusId(assignmentId);
      const updated = await maintenanceOpsService.updateAssignment(assignmentId, { status });
      setMaintenanceAssignments((current) =>
        current.map((assignment) => (assignment.id === assignmentId ? updated : assignment))
      );
      toast.success("Service job updated.");
    } catch (error) {
      console.error("Failed to update maintenance assignment:", error);
      toast.error("We couldn't update that service job.");
    } finally {
      setDispatchStatusId(null);
    }
  };

  const handleGenerateCrmTasks = async () => {
    try {
      setGeneratingCrmTasks(true);
      const tasks = await crmTaskService.generateSuggestedTasks({
        organizationId: organization.id,
        cases,
        leads: aggregatedLeads,
        viewings,
        payments,
      });
      setCrmTasks(tasks || []);
      toast.success("CRM task queue refreshed.");
    } catch (error) {
      console.error("Failed to generate CRM tasks:", error);
      toast.error("We couldn't generate CRM tasks right now.");
    } finally {
      setGeneratingCrmTasks(false);
    }
  };

  const handleCrmTaskStatus = async (
    taskId: string,
    status: "open" | "in_progress" | "completed" | "snoozed" | "cancelled"
  ) => {
    try {
      setUpdatingCrmTaskId(taskId);
      const updated = await crmTaskService.updateTaskStatus(taskId, status);
      setCrmTasks((current) =>
        current.map((task) => (task.id === taskId ? updated : task))
      );
      toast.success("CRM task updated.");
    } catch (error) {
      console.error("Failed to update CRM task:", error);
      toast.error("We couldn't update that CRM task.");
    } finally {
      setUpdatingCrmTaskId(null);
    }
  };

  const updateCaseStage = async (
    caseId: string,
    action: "negotiation" | "payment_pending" | "won" | "lost"
  ) => {
    const currentCase = cases.find((dealCase) => dealCase.id === caseId);
    if (!currentCase) return;

    try {
      setUpdatingCaseId(caseId);

      if (action === "won") {
        await dealCaseService.closeDealCase(caseId);
        const metadata = parseReferralMetadata(currentCase.message);
        if (metadata?.ref) {
          trackReferralDealWon(metadata.ref, metadata.channel, {
            dealCaseId: currentCase.id,
            caseType: currentCase.case_type,
            organizationId: currentCase.organization_id,
          });
        }
      } else if (action === "lost") {
        await dealCaseService.rejectDealCase(caseId);
      } else {
        await dealCaseService.updatePipeline(caseId, {
          pipeline_stage: action,
          priority: currentCase.priority || "medium",
          next_follow_up_at: currentCase.next_follow_up_at || null,
          last_contacted_at: new Date().toISOString(),
        });
      }

      toast.success("Deal stage updated.");
      await loadData();
    } catch (error) {
      console.error("Failed to update deal stage:", error);
      toast.error("We couldn't update that deal stage right now.");
    } finally {
      setUpdatingCaseId(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-10">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading workspace tools...</p>
        </div>
      </Card>
    );
  }

  if (section === "offers") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Offers & Negotiation</h1>
          <p className="mt-2 text-muted-foreground">
            Work live offers, move cases into negotiation, and keep pricing guidance close to the team.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Open Opportunities"
            value={openCases.length}
            helper="Active cases not yet won or lost."
          />
          <StatCard
            label="In Negotiation"
            value={openCases.filter((dealCase) => dealCase.pipeline_stage === "negotiation").length}
            helper="Deals where terms are actively moving."
          />
          <StatCard
            label="Awaiting Payment"
            value={
              openCases.filter((dealCase) => dealCase.pipeline_stage === "payment_pending").length
            }
            helper="Booking fees, deposits, or proof-of-funds pending."
          />
          <StatCard
            label="Pipeline Value"
            value={formatMoney(
              openCases.reduce((total, dealCase) => total + Number(dealCase.listing?.price || 0), 0)
            )}
            helper="Based on linked listing prices."
          />
        </div>

        {openCases.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            New inquiries and applications will appear here once your lead pipeline starts moving.
          </Card>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {openCases.map((dealCase) => {
              const offerGuide = buildOfferSuggestion({
                listingPrice: dealCase.listing?.price,
                caseType: dealCase.case_type,
                priority: dealCase.priority,
              });

              return (
                <Card key={dealCase.id} className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold">{getDealContact(dealCase)}</h2>
                        <Badge variant="outline">
                          {formatLabel(dealCase.pipeline_stage || dealCase.status)}
                        </Badge>
                        <Badge variant="secondary">{formatLabel(dealCase.priority || "medium")}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatCaseType(dealCase.case_type)} for{" "}
                        {dealCase.listing?.property?.address || "this listing"}
                      </p>
                      <p className="text-lg font-semibold">
                        {formatMoney(
                          dealCase.listing?.price,
                          dealCase.listing?.currency || "GHS"
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Updated {formatRelativeTime(dealCase.updated_at || dealCase.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Link to={`${workspaceBasePath}/leads`}>
                        <Button variant="outline" size="sm">
                          Open Lead
                        </Button>
                      </Link>
                      <Link to={`${workspaceBasePath}/documents`}>
                        <Button variant="outline" size="sm">
                          Draft Terms
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Anchor</p>
                      <p className="mt-2 text-lg font-semibold">
                        {formatMoney(offerGuide.anchor, dealCase.listing?.currency || "GHS")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Close Target</p>
                      <p className="mt-2 text-lg font-semibold">
                        {formatMoney(offerGuide.closeTarget, dealCase.listing?.currency || "GHS")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Stretch</p>
                      <p className="mt-2 text-lg font-semibold">
                        {formatMoney(offerGuide.stretch, dealCase.listing?.currency || "GHS")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void updateCaseStage(dealCase.id, "negotiation")}
                      disabled={updatingCaseId === dealCase.id}
                    >
                      Start Negotiation
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void updateCaseStage(dealCase.id, "payment_pending")}
                      disabled={updatingCaseId === dealCase.id}
                    >
                      Await Payment
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void updateCaseStage(dealCase.id, "won")}
                      disabled={updatingCaseId === dealCase.id}
                    >
                      Mark Won
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void updateCaseStage(dealCase.id, "lost")}
                      disabled={updatingCaseId === dealCase.id}
                    >
                      Mark Lost
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (section === "deal-rooms") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Deal Rooms</h1>
          <p className="mt-2 text-muted-foreground">
            Keep every viewing, payment, conversation, and signature in one deal-specific thread.
          </p>
        </div>

        {cases.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            Deal rooms will appear here once the workspace starts receiving inquiries.
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
            <Card className="p-4">
              <div className="space-y-3">
                {cases.map((dealCase) => (
                  <button
                    key={dealCase.id}
                    type="button"
                    onClick={() => setSelectedCaseId(dealCase.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      selectedCaseId === dealCase.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {dealCase.listing?.property?.address || "Deal room"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {getDealContact(dealCase)}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {formatLabel(dealCase.pipeline_stage || dealCase.status)}
                      </Badge>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {formatCaseType(dealCase.case_type)}
                    </p>
                  </button>
                ))}
              </div>
            </Card>

            {selectedCase && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard
                    label="Stage"
                    value={formatLabel(selectedCase.pipeline_stage || selectedCase.status)}
                    helper="Current workflow position."
                  />
                  <StatCard
                    label="Viewings"
                    value={selectedViewings.length}
                    helper="Booked or completed site visits."
                  />
                  <StatCard
                    label="Payments"
                    value={selectedPayments.length}
                    helper="Transactions tied to this client or listing."
                  />
                  <StatCard
                    label="Documents"
                    value={selectedDocuments.length}
                    helper="Offer letters, contracts, and revisions."
                  />
                </div>

                <Card className="p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <FileSignature className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Timeline</h2>
                  </div>

                  {selectedTimeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Activity will appear here once the team starts scheduling, messaging, or collecting documents.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {selectedTimeline.map((event) => (
                        <div key={event.id} className="flex gap-3 rounded-xl border border-border p-4">
                          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{event.title}</p>
                              <Badge variant="outline">{formatLabel(event.type)}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {new Date(event.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Room Summary</h3>
                    </div>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>
                        {selectedConversation
                          ? `${selectedConversation.conversation?.messages?.length || 0} tracked messages are tied to this room.`
                          : "This deal room has not been linked to a conversation yet."}
                      </p>
                      <p>
                        {selectedDocuments.length > 0
                          ? `${selectedDocuments.filter((document) => document.status === "signed").length} document(s) already signed.`
                          : "No signed paperwork yet for this opportunity."}
                      </p>
                      <p>
                        Assigned owner:{" "}
                        {selectedCase.assigned_to
                          ? membersById[selectedCase.assigned_to]?.full_name ||
                            membersById[selectedCase.assigned_to]?.email ||
                            "Team member"
                          : "Unassigned"}
                      </p>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <ArrowRightLeft className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Next Workspace Move</h3>
                    </div>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>
                        {selectedViewings.length === 0
                          ? "Confirm a viewing or virtual tour first so the client has enough confidence to move."
                          : selectedPayments.length === 0
                            ? "Push toward a booking fee, deposit, or proof-of-funds milestone."
                            : "Keep signatures, receipts, and final handoff notes together until close."}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Link to={`${workspaceBasePath}/leads`}>
                          <Button variant="outline" size="sm">
                            Open Leads
                          </Button>
                        </Link>
                        <Link to={`${workspaceBasePath}/documents`}>
                          <Button variant="outline" size="sm">
                            Open Documents
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (section === "performance") {
    const topPerformer = performanceRows[0] || null;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Agent Performance</h1>
          <p className="mt-2 text-muted-foreground">
            Track who is converting lead flow, closing revenue, and keeping viewings moving.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Team Members"
            value={Object.keys(membersById).length}
            helper="People with workspace visibility."
          />
          <StatCard
            label="Active Leads"
            value={openCases.length}
            helper="Cases still in motion."
          />
          <StatCard
            label="Verified Payments"
            value={verifiedPaymentsCount}
            helper="Receipts confirmed with integrity hashes."
          />
          <StatCard
            label="Revenue Collected"
            value={formatMoney(totalRevenueMinor, "GHS", { isMinor: true })}
            helper="Successful payments received."
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Leaderboard</h2>
              </div>
            </div>
            {performanceRows.length === 0 ? (
              <div className="p-8 text-sm text-muted-foreground">
                Assign cases and viewings to team members to unlock performance reporting here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-secondary/30 text-left">
                    <tr>
                      <th className="px-6 py-3 font-medium text-muted-foreground">Agent</th>
                      <th className="px-6 py-3 font-medium text-muted-foreground">Active Leads</th>
                      <th className="px-6 py-3 font-medium text-muted-foreground">Negotiations</th>
                      <th className="px-6 py-3 font-medium text-muted-foreground">Won Deals</th>
                      <th className="px-6 py-3 font-medium text-muted-foreground">Viewings</th>
                      <th className="px-6 py-3 font-medium text-muted-foreground">Verified</th>
                      <th className="px-6 py-3 font-medium text-muted-foreground">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceRows.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        <td className="px-6 py-4 font-medium">{row.name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{row.activeLeads}</td>
                        <td className="px-6 py-4 text-muted-foreground">{row.negotiations}</td>
                        <td className="px-6 py-4 text-muted-foreground">{row.wonDeals}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {row.completedViewings}/{row.assignedViewings}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{row.verifiedPayments}</td>
                        <td className="px-6 py-4 font-medium">
                          {formatMoney(row.collectedRevenueMinor, "GHS", { isMinor: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Top Snapshot</h2>
            </div>
            {!topPerformer ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Team rankings will populate once work is assigned and payments start landing.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current leader</p>
                  <p className="text-2xl font-semibold">{topPerformer.name}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Won Deals</p>
                    <p className="mt-2 text-lg font-semibold">{topPerformer.wonDeals}</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue</p>
                    <p className="mt-2 text-lg font-semibold">
                      {formatMoney(topPerformer.collectedRevenueMinor, "GHS", { isMinor: true })}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use this alongside lead response time and calendar operations to coach the team week over week.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (section === "seller-portal") {
    const topListings = [...listings]
      .sort((a, b) => Number(b.quality_score || 0) - Number(a.quality_score || 0))
      .slice(0, 5);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Seller Portal</h1>
          <p className="mt-2 text-muted-foreground">
            Give owners a clear read on listing health, buyer demand, proof, and next revenue moves.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Seller Health"
            value={`${sellerHealth.score}/100`}
            helper="Quality, demand, documents, and payment evidence."
          />
          <StatCard
            label="Listed Inventory"
            value={sellerHealth.listedCount}
            helper="Public listings currently available."
          />
          <StatCard
            label="Active Buyer Demand"
            value={sellerHealth.activeDemand}
            helper="Open cases tied to seller inventory."
          />
          <StatCard
            label="Proof Assets"
            value={sellerHealth.signedDocs + sellerHealth.successfulPayments}
            helper="Signed docs plus successful payment records."
          />
          <StatCard
            label="Projected Owner Net"
            value={formatMoney(sellerNetSheet.ownerNetProjection)}
            helper="Modeled after commission and closing reserves."
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
          <Card className="p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Seller Net Sheet</h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  A fast owner-facing projection from live inventory, active pipeline, and collected proof.
                </p>
              </div>
              <Badge variant={sellerNetSheet.ownerNetProjection > 0 ? "default" : "outline"}>
                {formatMoney(sellerNetSheet.collectedProofValue)} proof
              </Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Inventory Gross</p>
                <p className="mt-2 text-lg font-semibold">
                  {formatMoney(sellerNetSheet.grossInventoryValue)}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Pipeline Basis</p>
                <p className="mt-2 text-lg font-semibold">
                  {formatMoney(sellerNetSheet.activePipelineValue)}
                </p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Owner Net</p>
                <p className="mt-2 text-lg font-semibold text-primary">
                  {formatMoney(sellerNetSheet.ownerNetProjection)}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {sellerNetSheet.lineItems.slice(1).map((item) => (
                <div key={item.label} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-sm font-semibold">{formatMoney(item.amount)}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{sellerNetSheet.guidance}</p>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Launch Readiness</h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Package listing proof, quality, and demand into an owner update before scaling campaigns.
                </p>
              </div>
              <Badge variant={listingLaunchPlan.needsWorkCount === 0 ? "default" : "outline"}>
                {listingLaunchPlan.readyCount} ready
              </Badge>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium">Owner update draft</p>
              <p className="mt-2 text-sm text-muted-foreground">{listingLaunchPlan.ownerUpdate}</p>
            </div>
            <div className="mt-4 space-y-3">
              {listingLaunchPlan.actions.map((action) => (
                <div key={action.label} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{action.label}</p>
                    <Badge
                      variant={
                        action.status === "blocked"
                          ? "destructive"
                          : action.status === "ready"
                            ? "default"
                            : "outline"
                      }
                    >
                      {formatLabel(action.status)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{action.helper}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Owner Inventory Brief</h2>
            </div>
            {topListings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create or publish listings to unlock owner-facing health reporting.
              </p>
            ) : (
              <div className="space-y-3">
                {topListings.map((listing) => (
                  <div key={listing.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold">{listing.property?.address || "Listing"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatMoney(listing.price, listing.currency || "GHS")} /{" "}
                          {formatLabel(listing.status)}
                        </p>
                      </div>
                      <Badge variant={Number(listing.quality_score || 0) >= 75 ? "default" : "outline"}>
                        Quality {Math.round(Number(listing.quality_score || 0))}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Seller Next Steps</h2>
            </div>
            <div className="space-y-3">
              {sellerHealth.actions.map((action) => (
                <div key={action} className="rounded-xl border border-border p-4 text-sm">
                  <CheckCircle className="mr-2 inline h-4 w-4 text-primary" />
                  {action}
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to={`${workspaceBasePath}/listings`}>
                <Button variant="outline" size="sm">
                  Improve Listings
                </Button>
              </Link>
              <Link to={`${workspaceBasePath}/trust`}>
                <Button variant="outline" size="sm">
                  Add Trust Proof
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (section === "crm") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Agent CRM Automation</h1>
            <p className="mt-2 text-muted-foreground">
              Prioritize hot leads, stale deal rooms, tour confirmations, and payment follow-up.
            </p>
          </div>
          <Button onClick={() => void handleGenerateCrmTasks()} disabled={generatingCrmTasks}>
            {generatingCrmTasks ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Building Queue
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Generate Tasks
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {crmActions.map((action) => (
            <StatCard
              key={action.label}
              label={action.label}
              value={action.count}
              helper={action.helper}
            />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr,0.9fr]">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Automation Playbook</h2>
            </div>
            <div className="space-y-3">
              {[
                "Send same-day WhatsApp/email follow-up to leads above 75 score.",
                "Escalate deal rooms untouched for more than 48 hours.",
                "Confirm pending viewing requests before the next business day.",
                "Trigger payment reminder after offer acceptance or booking-fee request.",
              ].map((item) => (
                <div key={item} className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Hot Lead Queue</h2>
            </div>
            {aggregatedLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                External and referral leads will appear here once lead aggregation receives traffic.
              </p>
            ) : (
              <div className="space-y-3">
                {[...aggregatedLeads]
                  .sort((a, b) => Number(b.lead_score || 0) - Number(a.lead_score || 0))
                  .slice(0, 5)
                  .map((lead) => (
                    <div key={lead.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{lead.lead_name || "Lead"}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatLabel(lead.source)} / {lead.requested_timeframe || "timeframe pending"}
                          </p>
                        </div>
                        <Badge variant="outline">Score {Math.round(Number(lead.lead_score || 0))}</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            <div className="mt-5">
              <Link to={`${workspaceBasePath}/leads`}>
                <Button variant="outline" size="sm">
                  Open Leads & Messages
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Persisted Task Queue</h2>
              </div>
              <Badge variant="outline">{openCrmTasks.length} open</Badge>
            </div>
            {crmTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Generate tasks to persist hot lead, stale deal, viewing, and payment follow-up work for the team.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {crmTasks.slice(0, 8).map((task) => (
                  <div key={task.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{task.title}</p>
                          <Badge variant={task.priority === "urgent" ? "destructive" : "outline"}>
                            {formatLabel(task.priority)}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatLabel(task.task_type)}
                          {task.due_at ? ` / due ${new Date(task.due_at).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                        {formatLabel(task.status)}
                      </Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {task.status === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingCrmTaskId === task.id}
                          onClick={() => void handleCrmTaskStatus(task.id, "in_progress")}
                        >
                          Start
                        </Button>
                      )}
                      {task.status !== "completed" && (
                        <Button
                          size="sm"
                          disabled={updatingCrmTaskId === task.id}
                          onClick={() => void handleCrmTaskStatus(task.id, "completed")}
                        >
                          Complete
                        </Button>
                      )}
                      {!["completed", "cancelled"].includes(task.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingCrmTaskId === task.id}
                          onClick={() => void handleCrmTaskStatus(task.id, "snoozed")}
                        >
                          Snooze
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (section === "referrals") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Referral Program</h1>
          <p className="mt-2 text-muted-foreground">
            Create repeatable referral campaigns for diaspora buyers, executive rentals, and investor intros.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Live Markets"
            value={activeMarkets.length || 1}
            helper={activeMarkets.length > 0 ? activeMarkets.join(", ") : "Ready for launch"}
          />
          <StatCard
            label="Attributed Leads"
            value={referralPerformance.totals.leads}
            helper="Deal cases carrying referral metadata."
          />
          <StatCard
            label="Won Referral Deals"
            value={referralPerformance.totals.wonDeals}
            helper="Referral-backed cases already closed."
          />
          <StatCard
            label="Estimated Rewards"
            value={formatMoney(referralPerformance.totals.estimatedRewardMinor, "GHS", { isMinor: true })}
            helper="Modeled from lead and won-deal referral credits."
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-4">
            {referralCampaigns.map((campaign) => (
              <Card key={campaign.key} className="p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <HandCoins className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-semibold">{campaign.label}</h2>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{campaign.helper}</p>
                    <div className="mt-4 rounded-xl border border-border bg-secondary/20 p-4">
                      <p className="break-all text-sm text-muted-foreground">{campaign.link}</p>
                    </div>
                  </div>
                  <Button onClick={() => void handleCopyLink(campaign.link)}>
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Program Blueprint</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>Ask closed clients for introductions while the trust proof is still fresh.</p>
              <p>Bundle high-trust listings with diaspora-friendly payment guidance in every campaign.</p>
              <p>Route all referred leads into your shared inbox so nothing disappears into personal chats.</p>
              {referralPerformance.campaigns.length > 0 && (
                <div className="rounded-xl border border-border p-4">
                  <p className="font-medium text-foreground">Best performing channels</p>
                  <div className="mt-3 space-y-3">
                    {referralPerformance.campaigns.slice(0, 3).map((campaign) => (
                      <div key={`${campaign.referrerKey}-${campaign.channel}`} className="rounded-lg bg-secondary/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-foreground">{formatLabel(campaign.channel)}</p>
                          <Badge variant="outline">{campaign.wonDeals} won</Badge>
                        </div>
                        <p className="mt-1 text-xs">
                          {campaign.leads} leads / {campaign.visits} visits / {campaign.savedAlerts} alerts
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-2">
                <Link to={`${workspaceBasePath}/leads`}>
                  <Button variant="outline" size="sm">
                    Open Shared Inbox
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Aftercare & Maintenance</h1>
        <p className="mt-2 text-muted-foreground">
          Turn signed deals into smooth handoffs, retained clients, and recurring service revenue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Won Deals"
          value={wonCases.length}
          helper="Transactions ready for handoff."
        />
        <StatCard
          label="Completed Viewings"
          value={completedViewings.length}
          helper="Strong candidates for post-viewing nurture."
        />
        <StatCard
          label="Signed Documents"
          value={signedDocumentsCount}
          helper="Useful for move-in and compliance handoff."
        />
        <StatCard
          label="Open Service Jobs"
          value={maintenanceSummary.pending + maintenanceSummary.accepted + maintenanceSummary.inProgress}
          helper="Vendor assignments currently in motion."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {playbooks.map((playbook) => (
          <Card key={playbook.key} className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{playbook.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{playbook.helper}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Handoff Queue</h2>
          </div>

          {wonCases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Closed deals will appear here once the team starts moving opportunities to won.
            </p>
          ) : (
            <div className="space-y-4">
              {wonCases.slice(0, 5).map((dealCase) => {
                const caseDocuments = documents.filter((document) => document.deal_case_id === dealCase.id);
                const casePayments = payments.filter(
                  (payment) =>
                    payment.payer_user_id === dealCase.user_id &&
                    payment.listing_id === dealCase.listing_id
                );
                const nextStep =
                  casePayments.length === 0
                    ? "Confirm deposit or final settlement proof."
                    : caseDocuments.filter((document) => document.status === "signed").length === 0
                      ? "Publish and sign the final handoff paperwork."
                      : "Coordinate keys, utilities, and maintenance intro.";

                return (
                  <div key={dealCase.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{getDealContact(dealCase)}</p>
                          <Badge>{formatLabel(dealCase.pipeline_stage || dealCase.status)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {dealCase.listing?.property?.address || "Closed deal"}
                        </p>
                        <p className="mt-3 text-sm">{nextStep}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Closed {formatRelativeTime(dealCase.updated_at || dealCase.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Service Dispatch</h2>
          </div>
          {maintenancePropertyOptions.length === 0 ? (
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>Keep move-in inventory, emergency contacts, and first-service dates in the deal room.</p>
              <p>Once a property is tied to an active or won deal, you can dispatch cleaning, repairs, utility follow-up, and move support here.</p>
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleDispatchRequest}>
              <div>
                <label className="mb-2 block text-sm text-foreground">Property</label>
                <select
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3 text-foreground"
                  value={dispatchForm.propertyId}
                  onChange={(event) =>
                    setDispatchForm((current) => ({
                      ...current,
                      propertyId: event.target.value,
                      vendorId: "",
                    }))
                  }
                >
                  {maintenancePropertyOptions.map((property) => (
                    <option key={property.propertyId} value={property.propertyId}>
                      {property.address}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-foreground">Service Type</label>
                  <select
                    className="w-full rounded-lg border border-border bg-input-background px-4 py-3 text-foreground"
                    value={dispatchForm.serviceType}
                    onChange={(event) =>
                      setDispatchForm((current) => ({
                        ...current,
                        serviceType: event.target.value,
                        vendorId: "",
                      }))
                    }
                  >
                    {MAINTENANCE_SERVICE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Requested Date"
                  type="date"
                  value={dispatchForm.requestedDate}
                  onChange={(event) =>
                    setDispatchForm((current) => ({
                      ...current,
                      requestedDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-foreground">Preferred Vendor</label>
                <select
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3 text-foreground"
                  value={dispatchForm.vendorId}
                  onChange={(event) =>
                    setDispatchForm((current) => ({
                      ...current,
                      vendorId: event.target.value,
                    }))
                  }
                  disabled={loadingMaintenanceVendors || maintenanceVendors.length === 0}
                >
                  <option value="">
                    {loadingMaintenanceVendors
                      ? "Loading vendors..."
                      : maintenanceVendors.length === 0
                        ? "No matching vendors yet"
                        : "Choose a vendor"}
                  </option>
                  {maintenanceVendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.business_name} {vendor.rating_avg ? `(${vendor.rating_avg.toFixed(1)}/5)` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Budget / Estimate (Optional)"
                type="number"
                min="0"
                value={dispatchForm.cost}
                onChange={(event) =>
                  setDispatchForm((current) => ({
                    ...current,
                    cost: event.target.value,
                  }))
                }
              />
              <div>
                <label className="mb-2 block text-sm text-foreground">Work Summary</label>
                <textarea
                  className="min-h-[120px] w-full rounded-lg border border-border bg-input-background px-4 py-3 text-foreground"
                  placeholder="Describe access notes, scope, urgency, and any handoff dependencies."
                  value={dispatchForm.description}
                  onChange={(event) =>
                    setDispatchForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={dispatchSubmitting}>
                  {dispatchSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Dispatching
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4" />
                      Create Dispatch
                    </>
                  )}
                </Button>
                <Link to={`${workspaceBasePath}/calendar`}>
                  <Button variant="outline" size="sm">
                    Calendar Ops
                  </Button>
                </Link>
                <Link to={`${workspaceBasePath}/documents`}>
                  <Button variant="outline" size="sm">
                    Documents
                  </Button>
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Active Service Queue</h2>
        </div>
        {maintenanceAssignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Dispatch requests will appear here once the team starts assigning vendors.
          </p>
        ) : (
          <div className="space-y-4">
            {maintenanceAssignments.slice(0, 8).map((assignment) => (
              <div key={assignment.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {assignment.property?.address || "Property service request"}
                      </p>
                      <Badge variant="outline">{formatLabel(assignment.status)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatLabel(assignment.service_type)} with {assignment.vendor?.business_name || "vendor pending"}
                    </p>
                    {assignment.description && (
                      <p className="mt-3 text-sm">{assignment.description}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Requested {assignment.requested_date ? new Date(assignment.requested_date).toLocaleDateString() : "recently"}
                      {assignment.cost ? ` / ${formatMoney(assignment.cost, "GHS")}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {assignment.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={dispatchStatusId === assignment.id}
                        onClick={() => void handleAssignmentStatusUpdate(assignment.id, "accepted")}
                      >
                        Accept
                      </Button>
                    )}
                    {assignment.status !== "completed" && assignment.status !== "cancelled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={dispatchStatusId === assignment.id}
                        onClick={() => void handleAssignmentStatusUpdate(assignment.id, "in_progress")}
                      >
                        Start Work
                      </Button>
                    )}
                    {assignment.status !== "completed" && (
                      <Button
                        size="sm"
                        disabled={dispatchStatusId === assignment.id}
                        onClick={() => void handleAssignmentStatusUpdate(assignment.id, "completed")}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  UserCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import type { Database } from "../../../lib/database.types";
import { dealCaseService } from "../../../lib/dealcase.service";
import { messageService } from "../../../lib/message.service";
import { organizationService } from "../../../lib/organization.service";
import { paymentService } from "../../../lib/payment.service";
import { propertyViewingService } from "../../../lib/property-viewing.service";
import { savedPropertyService } from "../../../lib/savedproperty.service";
import { savedSearchAlertService } from "../../../lib/saved-search-alert.service";
import { userService } from "../../../lib/user.service";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type PipelineStage =
  | "new_inquiry"
  | "contacted"
  | "qualified"
  | "viewing_scheduled"
  | "negotiation"
  | "payment_pending"
  | "won"
  | "lost";
type LeadPriority = "low" | "medium" | "high" | "urgent";
type ViewingStatus =
  | "requested"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "no_show";

interface WorkspaceLeadsProps {
  organization: Organization;
  currentUserId: string;
}

const PIPELINE_COLUMNS: Array<{
  key: PipelineStage;
  label: string;
  helper: string;
}> = [
  { key: "new_inquiry", label: "New Inquiry", helper: "Fresh inbound interest" },
  { key: "contacted", label: "Contacted", helper: "First outreach done" },
  { key: "qualified", label: "Qualified", helper: "Lead is worth pursuing" },
  { key: "viewing_scheduled", label: "Viewing", helper: "Site visit in motion" },
  { key: "negotiation", label: "Negotiation", helper: "Terms being discussed" },
  { key: "payment_pending", label: "Payment", helper: "Awaiting funds or proof" },
  { key: "won", label: "Won", helper: "Deal completed" },
  { key: "lost", label: "Lost", helper: "Lead inactive or declined" },
];

function formatRelativeTime(value?: string | null) {
  if (!value) return "Recently";

  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not scheduled";

  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(amountMinor?: number | null, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amountMinor || 0) / 100);
}

function getDisplayName(profile?: { full_name?: string | null; email?: string | null } | null) {
  return profile?.full_name || profile?.email || "Team member";
}

function formatLabel(value?: string | null) {
  if (!value) return "Unknown";

  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizePipelineStage(dealCase: any): PipelineStage {
  if (dealCase?.pipeline_stage) return dealCase.pipeline_stage;
  if (dealCase?.status === "approved") return "qualified";
  if (dealCase?.status === "closed") return "won";
  if (dealCase?.status === "rejected") return "lost";
  return "new_inquiry";
}

function normalizePriority(dealCase: any): LeadPriority {
  return (dealCase?.priority || "medium") as LeadPriority;
}

function getStatusVariant(
  status?: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "approved":
    case "closed":
    case "completed":
    case "confirmed":
      return "default";
    case "rejected":
    case "cancelled":
    case "no_show":
      return "destructive";
    case "requested":
    case "rescheduled":
      return "outline";
    default:
      return "secondary";
  }
}

function getPriorityVariant(
  priority?: LeadPriority
): "default" | "secondary" | "outline" | "destructive" {
  switch (priority) {
    case "urgent":
      return "destructive";
    case "high":
      return "default";
    case "low":
      return "outline";
    default:
      return "secondary";
  }
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const pad = (num: number) => String(num).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function splitDateTime(value?: string | null) {
  if (!value) return { date: "", time: "" };

  const date = new Date(value);
  const pad = (num: number) => String(num).padStart(2, "0");

  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function latestActivityDate(item: { updated_at?: string | null; created_at?: string | null }) {
  return new Date(item.updated_at || item.created_at || 0).getTime();
}

export function WorkspaceLeads({ organization, currentUserId }: WorkspaceLeadsProps) {
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<any[]>([]);
  const [sharedConversations, setSharedConversations] = useState<any[]>([]);
  const [organizationViewings, setOrganizationViewings] = useState<any[]>([]);
  const [organizationPayments, setOrganizationPayments] = useState<any[]>([]);
  const [leadProfiles, setLeadProfiles] = useState<Record<string, any>>({});
  const [memberProfiles, setMemberProfiles] = useState<Record<string, any>>({});
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [openingConversationForLeadId, setOpeningConversationForLeadId] = useState<string | null>(
    null
  );
  const [assigningConversationId, setAssigningConversationId] = useState<string | null>(null);
  const [savingCaseId, setSavingCaseId] = useState<string | null>(null);
  const [leadContextLoading, setLeadContextLoading] = useState(false);
  const [selectedLeadProfile, setSelectedLeadProfile] = useState<any | null>(null);
  const [selectedLeadSavedProperties, setSelectedLeadSavedProperties] = useState<any[]>([]);
  const [selectedLeadAlerts, setSelectedLeadAlerts] = useState<any[]>([]);
  const [caseDraft, setCaseDraft] = useState<{
    pipelineStage: PipelineStage;
    priority: LeadPriority;
    nextFollowUpAt: string;
  }>({
    pipelineStage: "new_inquiry",
    priority: "medium",
    nextFollowUpAt: "",
  });
  const [editingViewing, setEditingViewing] = useState<any | null>(null);
  const [viewingDialogOpen, setViewingDialogOpen] = useState(false);
  const [viewingDraft, setViewingDraft] = useState<{
    status: ViewingStatus;
    confirmedDate: string;
    confirmedTime: string;
    assignedTo: string;
    internalNote: string;
    outcomeNote: string;
  }>({
    status: "requested",
    confirmedDate: "",
    confirmedTime: "",
    assignedTo: "unassigned",
    internalNote: "",
    outcomeNote: "",
  });
  const [savingViewing, setSavingViewing] = useState(false);

  async function loadData() {
    try {
      setLoading(true);

      const [organizationCases, inboxConversations, members, viewings, payments] =
        await Promise.all([
          dealCaseService.getDealCasesByOrganization(organization.id),
          messageService.getOrganizationInbox(organization.id),
          organizationService.getOrganizationMembers(organization.id),
          propertyViewingService.getOrganizationViewings(organization.id),
          paymentService.getOrganizationPropertyTransactions(organization.id),
        ]);

      setCases(organizationCases || []);
      setSharedConversations(inboxConversations || []);
      setOrganizationViewings(viewings || []);
      setOrganizationPayments(payments || []);
      setMemberProfiles(
        (members || []).reduce<Record<string, any>>((acc, member) => {
          if (member.user_id) {
            acc[member.user_id] = member.user;
          }
          return acc;
        }, {})
      );
      setSelectedCaseId((current) => {
        if (current && (organizationCases || []).some((item) => item.id === current)) {
          return current;
        }
        return organizationCases?.[0]?.id ?? null;
      });
      setSelectedConversationId((current) => {
        if (current && (inboxConversations || []).some((item) => item.conversation_id === current)) {
          return current;
        }
        return inboxConversations?.[0]?.conversation_id ?? null;
      });
    } catch (error) {
      console.error("Failed to load workspace leads:", error);
      toast.error("Unable to load leads and messages right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [organization.id, currentUserId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const data = await messageService.getConversation(selectedConversationId);
        await messageService.markMessagesAsRead(selectedConversationId, currentUserId);

        if (!cancelled) {
          setMessages(data || []);
        }
      } catch (error) {
        console.error("Failed to load conversation messages:", error);
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, selectedConversationId]);

  useEffect(() => {
    const leadIds = Array.from(
      new Set(
        [...cases.map((dealCase) => dealCase.user_id), ...sharedConversations.map((item) => item.lead_user_id)]
          .filter(Boolean)
      )
    );

    if (leadIds.length === 0) {
      setLeadProfiles({});
      return;
    }

    let cancelled = false;

    const loadProfiles = async () => {
      const entries = await Promise.all(
        leadIds.map(async (id) => {
          try {
            const profile = await userService.getUserById(id);
            return [id, profile] as const;
          } catch (error) {
            console.error("Failed to load lead profile:", error);
            return [id, null] as const;
          }
        })
      );

      if (!cancelled) {
        setLeadProfiles(
          entries.reduce<Record<string, any>>((acc, [id, profile]) => {
            if (profile) {
              acc[id] = profile;
            }
            return acc;
          }, {})
        );
      }
    };

    void loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [cases, sharedConversations]);

  const selectedCase = useMemo(
    () => cases.find((dealCase) => dealCase.id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  const selectedSharedConversation = useMemo(
    () =>
      sharedConversations.find(
        (sharedConversation) => sharedConversation.conversation_id === selectedConversationId
      ) || null,
    [selectedConversationId, sharedConversations]
  );

  const selectedLeadId = selectedCase?.user_id || selectedSharedConversation?.lead_user_id || null;

  const selectedLeadCases = useMemo(
    () =>
      cases
        .filter((dealCase) => dealCase.user_id === selectedLeadId)
        .sort((a, b) => latestActivityDate(b) - latestActivityDate(a)),
    [cases, selectedLeadId]
  );

  const selectedLeadPrimaryCase = selectedCase || selectedLeadCases[0] || null;

  useEffect(() => {
    setCaseDraft({
      pipelineStage: normalizePipelineStage(selectedLeadPrimaryCase),
      priority: normalizePriority(selectedLeadPrimaryCase),
      nextFollowUpAt: toDateTimeLocal(selectedLeadPrimaryCase?.next_follow_up_at),
    });
  }, [
    selectedLeadPrimaryCase?.id,
    selectedLeadPrimaryCase?.pipeline_stage,
    selectedLeadPrimaryCase?.priority,
    selectedLeadPrimaryCase?.next_follow_up_at,
  ]);

  useEffect(() => {
    if (!selectedLeadId) {
      setSelectedLeadProfile(null);
      setSelectedLeadSavedProperties([]);
      setSelectedLeadAlerts([]);
      return;
    }

    let cancelled = false;

    const loadLeadContext = async () => {
      try {
        setLeadContextLoading(true);

        const [profileResult, savedPropertiesResult, alertsResult] = await Promise.allSettled([
          userService.getUserById(selectedLeadId),
          savedPropertyService.getSavedProperties(selectedLeadId),
          savedSearchAlertService.getUserAlerts(selectedLeadId),
        ]);

        if (cancelled) return;

        setSelectedLeadProfile(
          profileResult.status === "fulfilled"
            ? profileResult.value
            : leadProfiles[selectedLeadId] || null
        );
        setSelectedLeadSavedProperties(
          savedPropertiesResult.status === "fulfilled" ? savedPropertiesResult.value || [] : []
        );
        setSelectedLeadAlerts(alertsResult.status === "fulfilled" ? alertsResult.value || [] : []);
      } finally {
        if (!cancelled) {
          setLeadContextLoading(false);
        }
      }
    };

    void loadLeadContext();

    return () => {
      cancelled = true;
    };
  }, [leadProfiles, selectedLeadId]);

  const conversationsByProspectId = useMemo(() => {
    return sharedConversations.reduce<Record<string, any>>((acc, sharedConversation) => {
      if (!acc[sharedConversation.lead_user_id]) {
        acc[sharedConversation.lead_user_id] = sharedConversation;
      }
      return acc;
    }, {});
  }, [sharedConversations]);

  const pipelineColumns = useMemo(() => {
    return PIPELINE_COLUMNS.map((column) => ({
      ...column,
      cases: cases.filter((dealCase) => normalizePipelineStage(dealCase) === column.key),
    }));
  }, [cases]);

  const openCasesCount = useMemo(
    () => cases.filter((dealCase) => !["closed", "rejected"].includes(dealCase.status)).length,
    [cases]
  );

  const pendingViewingCount = useMemo(
    () =>
      organizationViewings.filter((viewing) =>
        ["requested", "confirmed", "rescheduled"].includes(viewing.status)
      ).length,
    [organizationViewings]
  );

  const successfulPayments = useMemo(
    () => organizationPayments.filter((payment) => payment.status === "success"),
    [organizationPayments]
  );

  const selectedLeadViewings = useMemo(
    () =>
      organizationViewings
        .filter((viewing) => viewing.user_id === selectedLeadId)
        .sort(
          (a, b) =>
            new Date(b.confirmed_datetime || b.requested_datetime).getTime() -
            new Date(a.confirmed_datetime || a.requested_datetime).getTime()
        ),
    [organizationViewings, selectedLeadId]
  );

  const selectedLeadPayments = useMemo(
    () =>
      organizationPayments
        .filter((payment) => payment.payer_user_id === selectedLeadId)
        .sort((a, b) => latestActivityDate(b) - latestActivityDate(a)),
    [organizationPayments, selectedLeadId]
  );

  const selectedLeadStats = useMemo(() => {
    const successfulLeadPayments = selectedLeadPayments.filter((payment) => payment.status === "success");

    return {
      viewingCount: selectedLeadViewings.length,
      paymentCount: successfulLeadPayments.length,
      totalPaidMinor: successfulLeadPayments.reduce(
        (total, payment) => total + Number(payment.amount_minor || 0),
        0
      ),
    };
  }, [selectedLeadPayments, selectedLeadViewings]);

  const viewingQueue = useMemo(
    () =>
      [...organizationViewings].sort(
        (a, b) =>
          new Date(a.confirmed_datetime || a.requested_datetime).getTime() -
          new Date(b.confirmed_datetime || b.requested_datetime).getTime()
      ),
    [organizationViewings]
  );

  const pendingCaseCount = useMemo(
    () => cases.filter((dealCase) => dealCase.status === "pending").length,
    [cases]
  );

  const handleCaseUpdate = async (
    caseId: string,
    action: "assign" | "approve" | "reject" | "close"
  ) => {
    try {
      if (action === "assign") {
        await dealCaseService.assignDealCase(caseId, currentUserId);
      }
      if (action === "approve") {
        await dealCaseService.approveDealCase(caseId);
      }
      if (action === "reject") {
        await dealCaseService.rejectDealCase(caseId);
      }
      if (action === "close") {
        await dealCaseService.closeDealCase(caseId);
      }

      toast.success("Lead updated.");
      await loadData();
    } catch (error) {
      console.error("Failed to update lead:", error);
      toast.error("We couldn't update that lead.");
    }
  };

  const handleSaveCasePlan = async () => {
    if (!selectedLeadPrimaryCase) return;

    try {
      setSavingCaseId(selectedLeadPrimaryCase.id);
      await dealCaseService.updatePipeline(selectedLeadPrimaryCase.id, {
        pipeline_stage: caseDraft.pipelineStage,
        priority: caseDraft.priority,
        next_follow_up_at: caseDraft.nextFollowUpAt
          ? new Date(caseDraft.nextFollowUpAt).toISOString()
          : null,
      });
      toast.success("Lead plan updated.");
      await loadData();
    } catch (error) {
      console.error("Failed to save lead plan:", error);
      toast.error("We couldn't save those workflow changes.");
    } finally {
      setSavingCaseId(null);
    }
  };

  const handleReply = async () => {
    if (!selectedConversationId || !reply.trim()) return;

    try {
      setSending(true);
      await messageService.sendMessage(selectedConversationId, currentUserId, reply.trim());
      setReply("");
      const freshMessages = await messageService.getConversation(selectedConversationId);
      setMessages(freshMessages || []);
      await loadData();
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("We couldn't send that message.");
    } finally {
      setSending(false);
    }
  };

  const openLeadConversation = async (dealCase: any) => {
    const existingConversation = conversationsByProspectId[dealCase.user_id];

    if (existingConversation) {
      setSelectedConversationId(existingConversation.conversation_id);
      setSelectedCaseId(dealCase.id);
      setActiveTab("inbox");
      return;
    }

    try {
      setOpeningConversationForLeadId(dealCase.id);

      const sharedConversation = await messageService.createOrGetOrganizationConversation({
        organizationId: organization.id,
        leadUserId: dealCase.user_id,
        internalParticipantId: dealCase.assigned_to || currentUserId,
        createdBy: currentUserId,
        dealCaseId: dealCase.id,
      });

      await loadData();
      setSelectedCaseId(dealCase.id);
      setSelectedConversationId(sharedConversation.conversation_id);
      setActiveTab("inbox");
      toast.success("Conversation ready.");
    } catch (error) {
      console.error("Failed to start conversation for lead:", error);
      toast.error("We couldn't open a conversation for that lead.");
    } finally {
      setOpeningConversationForLeadId(null);
    }
  };

  const handleAssignment = async (sharedConversationId: string, assignedTo: string | null) => {
    try {
      setAssigningConversationId(sharedConversationId);
      await messageService.assignOrganizationConversation(sharedConversationId, assignedTo);
      toast.success(assignedTo ? "Conversation assigned." : "Conversation released.");
      await loadData();
    } catch (error) {
      console.error("Failed to update conversation assignment:", error);
      toast.error("We couldn't update that conversation owner.");
    } finally {
      setAssigningConversationId(null);
    }
  };

  const handleSelectConversation = (sharedConversation: any) => {
    setSelectedConversationId(sharedConversation.conversation_id);
    setActiveTab("inbox");

    if (sharedConversation.deal_case_id) {
      setSelectedCaseId(sharedConversation.deal_case_id);
      return;
    }

    const leadCase = cases.find((dealCase) => dealCase.user_id === sharedConversation.lead_user_id);
    if (leadCase) {
      setSelectedCaseId(leadCase.id);
    }
  };

  const handleOpenViewingEditor = (viewing: any) => {
    const timing = splitDateTime(viewing.confirmed_datetime || viewing.requested_datetime);

    setEditingViewing(viewing);
    setViewingDraft({
      status: (viewing.status || "requested") as ViewingStatus,
      confirmedDate: timing.date,
      confirmedTime: timing.time,
      assignedTo: viewing.assigned_to || "unassigned",
      internalNote: viewing.internal_note || "",
      outcomeNote: viewing.outcome_note || "",
    });
    setViewingDialogOpen(true);
  };

  const handleSaveViewing = async () => {
    if (!editingViewing) return;

    if (
      ["confirmed", "rescheduled"].includes(viewingDraft.status) &&
      (!viewingDraft.confirmedDate || !viewingDraft.confirmedTime)
    ) {
      toast.error("Add a confirmed date and time before saving.");
      return;
    }

    try {
      setSavingViewing(true);

      const confirmedDateTime =
        viewingDraft.confirmedDate && viewingDraft.confirmedTime
          ? new Date(`${viewingDraft.confirmedDate}T${viewingDraft.confirmedTime}`).toISOString()
          : null;

      await propertyViewingService.updateViewingStatus(editingViewing.id, {
        status: viewingDraft.status,
        confirmedDateTime,
        assignedTo: viewingDraft.assignedTo === "unassigned" ? null : viewingDraft.assignedTo,
        internalNote: viewingDraft.internalNote || null,
        outcomeNote: viewingDraft.outcomeNote || null,
      });

      toast.success("Viewing updated.");
      setViewingDialogOpen(false);
      setEditingViewing(null);
      await loadData();
    } catch (error) {
      console.error("Failed to update viewing:", error);
      toast.error("We couldn't update that viewing.");
    } finally {
      setSavingViewing(false);
    }
  };

  const leadProfileForDisplay =
    selectedLeadProfile || (selectedLeadId ? leadProfiles[selectedLeadId] : null) || selectedLeadPrimaryCase?.user;

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading leads...</Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Leads & Messages</h1>
        <p className="text-muted-foreground mt-2">
          Run the full lead workflow for {organization.name}: triage inquiries, schedule viewings,
          and keep the shared inbox moving.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Open Pipeline</p>
          <p className="text-2xl font-semibold mt-1">{openCasesCount}</p>
          <p className="text-xs text-muted-foreground mt-2">{pendingCaseCount} still pending review</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Viewings In Flight</p>
          <p className="text-2xl font-semibold mt-1">{pendingViewingCount}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Requested, confirmed, or rescheduled
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Shared Inbox Threads</p>
          <p className="text-2xl font-semibold mt-1">{sharedConversations.length}</p>
          <p className="text-xs text-muted-foreground mt-2">Team-visible conversations with prospects</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Successful Payments</p>
          <p className="text-2xl font-semibold mt-1">{successfulPayments.length}</p>
          <p className="text-xs text-muted-foreground mt-2">Collected through Paystack and linked to leads</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="viewings">Viewings</TabsTrigger>
          <TabsTrigger value="inbox">Shared Inbox</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_380px]">
            <Card className="p-4">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Deal Pipeline</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Use stages to keep every lead moving toward a viewing, negotiation, or payment.
                </p>
              </div>

              {cases.length === 0 ? (
                <div className="text-muted-foreground text-sm py-10 text-center">
                  No leads yet. New inquiries and viewing requests will land here.
                </div>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <div className="grid min-w-max auto-cols-[280px] grid-flow-col gap-4">
                    {pipelineColumns.map((column) => (
                      <div key={column.key} className="rounded-xl bg-secondary/20 p-3">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{column.label}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{column.helper}</p>
                          </div>
                          <Badge variant="outline">{column.cases.length}</Badge>
                        </div>

                        <div className="space-y-3">
                          {column.cases.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                              Nothing here yet.
                            </div>
                          ) : (
                            column.cases.map((dealCase) => {
                              const sharedConversation = conversationsByProspectId[dealCase.user_id];
                              const assignedProfile = dealCase.assigned_to
                                ? memberProfiles[dealCase.assigned_to]
                                : null;
                              const isSelected = selectedLeadPrimaryCase?.id === dealCase.id;

                              return (
                                <div
                                  key={dealCase.id}
                                  className={`rounded-xl border p-4 transition-colors ${
                                    isSelected
                                      ? "border-primary bg-primary/5"
                                      : "border-border bg-card hover:border-primary/30"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    className="w-full text-left"
                                    onClick={() => setSelectedCaseId(dealCase.id)}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <h4 className="font-semibold">
                                          {dealCase.user?.full_name || dealCase.user?.email || "Prospect"}
                                        </h4>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                          {dealCase.listing?.property?.address || "Property"} -{" "}
                                          {formatLabel(dealCase.case_type)}
                                        </p>
                                      </div>
                                      <Badge variant={getStatusVariant(dealCase.status)}>
                                        {formatLabel(dealCase.status)}
                                      </Badge>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <Badge variant={getPriorityVariant(normalizePriority(dealCase))}>
                                        {formatLabel(normalizePriority(dealCase))}
                                      </Badge>
                                      {sharedConversation && (
                                        <Badge variant="secondary">Shared inbox</Badge>
                                      )}
                                    </div>

                                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                      <p>
                                        Assigned to{" "}
                                        {dealCase.assigned_to === currentUserId
                                          ? "you"
                                          : assignedProfile
                                            ? getDisplayName(assignedProfile)
                                            : "nobody"}
                                      </p>
                                      <p>
                                        Next touch{" "}
                                        {dealCase.next_follow_up_at
                                          ? formatRelativeTime(dealCase.next_follow_up_at)
                                          : "not set"}
                                      </p>
                                    </div>
                                  </button>

                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => void openLeadConversation(dealCase)}
                                      disabled={openingConversationForLeadId === dealCase.id}
                                    >
                                      {openingConversationForLeadId === dealCase.id
                                        ? "Opening..."
                                        : sharedConversation
                                          ? "Open Thread"
                                          : "Start Thread"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => void handleCaseUpdate(dealCase.id, "assign")}
                                    >
                                      Assign to Me
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-5">
              {!selectedLeadPrimaryCase ? (
                <div className="flex min-h-[460px] items-center justify-center text-center text-muted-foreground">
                  Select a lead to see the full profile, next actions, payments, and viewings.
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold">Lead 360</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Keep the next action, viewing plan, and payment trail together.
                        </p>
                      </div>
                      {leadContextLoading && (
                        <Badge variant="outline">Refreshing profile</Badge>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-secondary/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {getDisplayName(leadProfileForDisplay)}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedLeadPrimaryCase.listing?.property?.address || "Property lead"}
                        </p>
                      </div>
                      <Badge variant={getStatusVariant(selectedLeadPrimaryCase.status)}>
                        {formatLabel(selectedLeadPrimaryCase.status)}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{leadProfileForDisplay?.email || "No email on file"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{leadProfileForDisplay?.phone || "No phone yet"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {selectedLeadPrimaryCase.listing?.property?.city || "Location pending"},{" "}
                          {selectedLeadPrimaryCase.listing?.property?.region || "Region"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline">{formatLabel(selectedLeadPrimaryCase.case_type)}</Badge>
                      <Badge variant={getPriorityVariant(caseDraft.priority)}>
                        {formatLabel(caseDraft.priority)} priority
                      </Badge>
                      <Badge variant="secondary">
                        {formatLabel(normalizePipelineStage(selectedLeadPrimaryCase))}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground">Viewings</p>
                      <p className="mt-2 text-2xl font-semibold">{selectedLeadStats.viewingCount}</p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground">Payments</p>
                      <p className="mt-2 text-2xl font-semibold">{selectedLeadStats.paymentCount}</p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground">Alerts</p>
                      <p className="mt-2 text-2xl font-semibold">{selectedLeadAlerts.length}</p>
                    </Card>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void openLeadConversation(selectedLeadPrimaryCase)}
                        disabled={openingConversationForLeadId === selectedLeadPrimaryCase.id}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {conversationsByProspectId[selectedLeadPrimaryCase.user_id]
                          ? "Open Shared Thread"
                          : "Start Shared Thread"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleCaseUpdate(selectedLeadPrimaryCase.id, "assign")}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Assign to Me
                      </Button>
                    </div>

                    <div className="grid gap-3">
                      <div>
                        <label className="mb-2 block text-sm text-foreground">Pipeline stage</label>
                        <Select
                          value={caseDraft.pipelineStage}
                          onValueChange={(value) =>
                            setCaseDraft((current) => ({
                              ...current,
                              pipelineStage: value as PipelineStage,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                          <SelectContent>
                            {PIPELINE_COLUMNS.map((column) => (
                              <SelectItem key={column.key} value={column.key}>
                                {column.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-foreground">Priority</label>
                        <Select
                          value={caseDraft.priority}
                          onValueChange={(value) =>
                            setCaseDraft((current) => ({
                              ...current,
                              priority: value as LeadPriority,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {["low", "medium", "high", "urgent"].map((priority) => (
                              <SelectItem key={priority} value={priority}>
                                {formatLabel(priority)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Input
                        type="datetime-local"
                        label="Next follow-up"
                        value={caseDraft.nextFollowUpAt}
                        onChange={(event) =>
                          setCaseDraft((current) => ({
                            ...current,
                            nextFollowUpAt: event.target.value,
                          }))
                        }
                      />

                      <Button
                        onClick={() => void handleSaveCasePlan()}
                        disabled={savingCaseId === selectedLeadPrimaryCase.id}
                      >
                        {savingCaseId === selectedLeadPrimaryCase.id
                          ? "Saving workflow..."
                          : "Save Workflow"}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void handleCaseUpdate(selectedLeadPrimaryCase.id, "approve")}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleCaseUpdate(selectedLeadPrimaryCase.id, "close")}
                    >
                      Mark Won
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleCaseUpdate(selectedLeadPrimaryCase.id, "reject")}
                    >
                      Mark Lost
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Recent Viewings</h3>
                      </div>
                      {selectedLeadViewings.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No viewings scheduled yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedLeadViewings.slice(0, 3).map((viewing) => (
                            <button
                              key={viewing.id}
                              type="button"
                              onClick={() => handleOpenViewingEditor(viewing)}
                              className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/30"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium">
                                    {formatDateTime(viewing.confirmed_datetime || viewing.requested_datetime)}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {viewing.listing?.property?.address || "Property viewing"}
                                  </p>
                                </div>
                                <Badge variant={getStatusVariant(viewing.status)}>
                                  {formatLabel(viewing.status)}
                                </Badge>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Payment Trail</h3>
                      </div>
                      {selectedLeadPayments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No payments linked to this lead yet.</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Total paid: {formatMoney(selectedLeadStats.totalPaidMinor)}
                          </p>
                          {selectedLeadPayments.slice(0, 2).map((payment) => (
                            <div key={payment.id} className="rounded-lg border border-border p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium">
                                    {formatMoney(payment.amount_minor, payment.currency || "GHS")}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {formatLabel(payment.purpose || "payment")}
                                  </p>
                                </div>
                                <Badge variant={getStatusVariant(payment.status)}>
                                  {formatLabel(payment.status)}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Signals</h3>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Saved properties: {selectedLeadSavedProperties.length}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Saved alerts: {selectedLeadAlerts.length}
                        </p>
                        {selectedLeadSavedProperties.slice(0, 2).map((saved) => (
                          <div key={saved.id} className="rounded-lg border border-border p-3 text-sm">
                            <p className="font-medium">
                              {saved.listing?.property?.address || "Saved property"}
                            </p>
                            <p className="text-muted-foreground mt-1">
                              Saved {formatRelativeTime(saved.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="viewings">
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Viewing Queue</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Confirm times, assign reps, and record outcomes after every site visit.
              </p>
            </div>

            {viewingQueue.length === 0 ? (
              <div className="text-muted-foreground text-sm py-10 text-center">
                No viewings have been requested yet.
              </div>
            ) : (
              <div className="space-y-4">
                {viewingQueue.map((viewing) => {
                  const leadCase =
                    cases.find((dealCase) => dealCase.id === viewing.deal_case_id) ||
                    cases.find((dealCase) => dealCase.user_id === viewing.user_id) ||
                    null;
                  const assignedMember = viewing.assigned_to ? memberProfiles[viewing.assigned_to] : null;

                  return (
                    <div key={viewing.id} className="rounded-xl border border-border p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">
                              {viewing.user?.full_name || viewing.user?.email || "Prospect"}
                            </h3>
                            <Badge variant={getStatusVariant(viewing.status)}>
                              {formatLabel(viewing.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {viewing.listing?.property?.address || "Property viewing"}
                          </p>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>Requested: {formatDateTime(viewing.requested_datetime)}</p>
                            <p>
                              Confirmed: {formatDateTime(viewing.confirmed_datetime)}
                            </p>
                            <p>
                              Assigned: {assignedMember ? getDisplayName(assignedMember) : "Unassigned"}
                            </p>
                          </div>
                          {viewing.requester_note && (
                            <p className="text-sm rounded-lg bg-secondary/30 p-3">
                              {viewing.requester_note}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenViewingEditor(viewing)}
                          >
                            Manage Viewing
                          </Button>
                          {leadCase && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedCaseId(leadCase.id);
                                  setActiveTab("pipeline");
                                }}
                              >
                                Open Lead
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void openLeadConversation(leadCase)}
                                disabled={openingConversationForLeadId === leadCase.id}
                              >
                                Message Lead
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="inbox">
          <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-6">
            <Card className="p-4">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Shared Team Inbox</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Keep every prospect conversation visible, assignable, and easy to pick back up.
                </p>
              </div>

              {sharedConversations.length === 0 ? (
                <div className="text-muted-foreground text-sm py-8 text-center">
                  No shared conversations yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {sharedConversations.map((sharedConversation) => {
                    const conversation = sharedConversation.conversation;
                    const prospect = leadProfiles[sharedConversation.lead_user_id];
                    const latestMessage =
                      conversation?.messages?.[conversation.messages.length - 1] || null;
                    const unreadCount =
                      conversation?.messages?.filter(
                        (message: any) => !message.read && message.sender_id !== currentUserId
                      ).length || 0;
                    const assignedMember = sharedConversation.assigned_to
                      ? memberProfiles[sharedConversation.assigned_to]
                      : null;

                    return (
                      <button
                        key={sharedConversation.id}
                        type="button"
                        onClick={() => handleSelectConversation(sharedConversation)}
                        className={`w-full rounded-lg p-4 text-left transition-colors ${
                          selectedConversationId === sharedConversation.conversation_id
                            ? "border border-primary/20 bg-primary/10"
                            : "bg-secondary/30 hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold">{getDisplayName(prospect)}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Updated {formatRelativeTime(conversation?.last_message_at)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {assignedMember ? (
                                <Badge variant="outline">
                                  {sharedConversation.assigned_to === currentUserId
                                    ? "Assigned to you"
                                    : `Assigned to ${getDisplayName(assignedMember)}`}
                                </Badge>
                              ) : (
                                <Badge variant="outline">Unassigned</Badge>
                              )}
                            </div>
                            {latestMessage?.content && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {latestMessage.content}
                              </p>
                            )}
                          </div>
                          {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-6">
              {!selectedConversationId || !selectedSharedConversation ? (
                <div className="min-h-[320px] flex items-center justify-center text-muted-foreground">
                  Select a shared conversation to view the thread.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-semibold">Conversation Thread</h2>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getDisplayName(leadProfiles[selectedSharedConversation.lead_user_id])}
                      </p>
                      {selectedLeadPrimaryCase && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            {formatLabel(normalizePipelineStage(selectedLeadPrimaryCase))}
                          </Badge>
                          <Badge variant="outline">
                            {selectedLeadViewings.length} viewing
                            {selectedLeadViewings.length === 1 ? "" : "s"}
                          </Badge>
                          <Badge variant="outline">
                            {selectedLeadPayments.length} payment
                            {selectedLeadPayments.length === 1 ? "" : "s"}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {selectedSharedConversation.assigned_to === currentUserId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleAssignment(selectedSharedConversation.id, null)}
                          disabled={assigningConversationId === selectedSharedConversation.id}
                        >
                          Release Thread
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void handleAssignment(selectedSharedConversation.id, currentUserId)
                          }
                          disabled={assigningConversationId === selectedSharedConversation.id}
                        >
                          Claim Thread
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 min-h-[260px] max-h-[420px] overflow-y-auto pr-2">
                    {messages.map((message) => {
                      const senderProfile =
                        memberProfiles[message.sender_id] ||
                        leadProfiles[message.sender_id] ||
                        selectedLeadProfile;
                      const isCurrentUser = message.sender_id === currentUserId;

                      return (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg max-w-[80%] ${
                            isCurrentUser ? "ml-auto bg-primary text-white" : "bg-secondary/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-sm font-semibold">
                              {isCurrentUser ? "You" : getDisplayName(senderProfile)}
                            </p>
                            <p
                              className={`text-xs ${
                                isCurrentUser ? "text-white/70" : "text-muted-foreground"
                              }`}
                            >
                              {formatRelativeTime(message.created_at)}
                            </p>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock3 className="h-4 w-4" />
                      <span>
                        Last activity{" "}
                        {selectedSharedConversation.conversation?.last_message_at
                          ? formatRelativeTime(selectedSharedConversation.conversation.last_message_at)
                          : "recently"}
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <Textarea
                        value={reply}
                        onChange={(event) => setReply(event.target.value)}
                        placeholder="Reply to the shared thread..."
                        className="min-h-[110px]"
                      />
                      <Button onClick={() => void handleReply()} disabled={sending || !reply.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={viewingDialogOpen} onOpenChange={setViewingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Viewing</DialogTitle>
            <DialogDescription>
              Confirm timing, assign a rep, or record what happened after the visit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-foreground">Status</label>
              <Select
                value={viewingDraft.status}
                onValueChange={(value) =>
                  setViewingDraft((current) => ({
                    ...current,
                    status: value as ViewingStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose status" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "requested",
                    "confirmed",
                    "rescheduled",
                    "completed",
                    "cancelled",
                    "no_show",
                  ].map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                type="date"
                label="Confirmed date"
                value={viewingDraft.confirmedDate}
                onChange={(event) =>
                  setViewingDraft((current) => ({
                    ...current,
                    confirmedDate: event.target.value,
                  }))
                }
              />
              <Input
                type="time"
                label="Confirmed time"
                value={viewingDraft.confirmedTime}
                onChange={(event) =>
                  setViewingDraft((current) => ({
                    ...current,
                    confirmedTime: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-foreground">Assigned rep</label>
              <Select
                value={viewingDraft.assignedTo}
                onValueChange={(value) =>
                  setViewingDraft((current) => ({
                    ...current,
                    assignedTo: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {Object.entries(memberProfiles).map(([memberId, member]) => (
                    <SelectItem key={memberId} value={memberId}>
                      {getDisplayName(member)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-foreground">Internal notes</label>
              <Textarea
                value={viewingDraft.internalNote}
                onChange={(event) =>
                  setViewingDraft((current) => ({
                    ...current,
                    internalNote: event.target.value,
                  }))
                }
                placeholder="Parking instructions, rep handoff, or prep notes"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-foreground">Outcome notes</label>
              <Textarea
                value={viewingDraft.outcomeNote}
                onChange={(event) =>
                  setViewingDraft((current) => ({
                    ...current,
                    outcomeNote: event.target.value,
                  }))
                }
                placeholder="What happened after the viewing?"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveViewing()} disabled={savingViewing}>
              {savingViewing ? "Saving..." : "Save Viewing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

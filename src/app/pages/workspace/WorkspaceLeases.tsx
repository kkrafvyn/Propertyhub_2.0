import { Textarea } from "@/app/components/ui/textarea";
import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Check,
  KeyRound,
  FileSignature,
  UserCheck,
  RefreshCw,
  Shield,
  AlertCircle,
  ChevronDown,
  Send,
  CalendarRange,
  Wallet,
  ArrowRight,
  ClipboardList,
  ArrowUpDown,
  Bell,
  Inbox,
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  Building2,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { MetricCard } from "../../components/ui/MetricCard";
import { ActionDialog } from "../../components/ux/ActionDialog";
import { leaseService } from "../../../lib/lease.service";
import { leaseWorkflowService } from "../../../lib/lease-workflow.service";
import { tenantNoticeService } from "../../../lib/tenant-notice.service";
import { walletService } from "../../../lib/wallet.service";
import { moveChecklistService } from "../../../lib/move-checklist.service";
import { leaseDepositService } from "../../../lib/lease-deposit.service";
import { dealCaseService } from "../../../lib/dealcase.service";
import { leaseScreeningService } from "../../../lib/lease-screening.service";
import { PropertyLeaseClausePanel } from "../../components/compliance/PropertyLeaseClausePanel";
import { LeaseNotesPanel } from "../../components/workspace/LeaseNotesPanel";
import { useAuth } from "../../context/AuthContext";
import { leaseEsignatureService } from "../../../lib/lease-esignature.service";
import { eSignatureService } from "../../../lib/esignature.service";
import {
  filterByNestedPropertyScope,
  getNestedListingPropertyId,
  type MemberScopeProps,
  withMemberScopeDefaults,
} from "../../../lib/member-scope";

function formatMoney(amountMinor?: number | null, currency = "GHS") {
  return walletService.formatWalletAmount(amountMinor, currency);
}

function leaseStatusVariant(status: string): "success" | "warning" | "info" | "destructive" | "outline" {
  switch (status) {
    case "active": return "success";
    case "approved": return "info";
    case "expired": return "outline";
    case "terminated": return "destructive";
    case "pending": return "warning";
    default: return "outline";
  }
}

// Styled native select wrapped in a premium container
function StyledSelect({
  value,
  onChange,
  children,
  label,
  icon: Icon,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="relative">
      {label && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-secondary mb-1.5">{label}</p>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className="w-3.5 h-3.5 text-ink-tertiary" />
          </span>
        )}
        <NativeSelectControl
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none rounded-xl border border-surface-border bg-surface/80 backdrop-blur-sm px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200 pr-9 ${Icon ? "pl-9" : "pl-3"}`}
        >
          {children}
        </NativeSelectControl>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary pointer-events-none" />
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  accent = "emerald",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  accent?: "emerald" | "blue" | "purple" | "amber";
}) {
  const accentClasses: Record<string, string> = {
    emerald: "text-emerald-500 bg-emerald-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    purple: "text-purple-500 bg-purple-500/10",
    amber: "text-amber-500 bg-amber-500/10",
  };
  return (
    <div className="flex items-start gap-3 mb-5">
      <span className={`p-2 rounded-xl shrink-0 ${accentClasses[accent]}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div>
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {subtitle && <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
}

export function WorkspaceLeases({
  organizationId,
  scopeMode = "organization",
  scopedPropertyIds = null,
  bypassPropertyScope = false,
}: { organizationId: string } & MemberScopeProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leases, setLeases] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sendingNotice, setSendingNotice] = useState(false);
  const [noticeLeaseId, setNoticeLeaseId] = useState("");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [noticeType, setNoticeType] = useState("general");
  const [moveLeaseId, setMoveLeaseId] = useState("");
  const [moveItems, setMoveItems] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [depositValues, setDepositValues] = useState<Record<string, { amount: string; deductions: string; refunded: string; reason: string }>>({});
  const [applications, setApplications] = useState<any[]>([]);
  const [screenings, setScreenings] = useState<any[]>([]);
  const [screeningCaseId, setScreeningCaseId] = useState("");
  const [screeningProvider, setScreeningProvider] = useState<"manual_review" | "provider_pending_setup">("manual_review");
  const [clauseLeaseId, setClauseLeaseId] = useState("");
  const [pendingEsignByLease, setPendingEsignByLease] = useState<Record<string, any>>({});
  const [overrideRequest, setOverrideRequest] = useState<{ lease: any; message: string } | null>(null);

  const loadLeases = async () => {
    try {
      setLoading(true);
      const [rows, noticeRows, dealCases, screeningRows, pendingEsigns] = await Promise.all([
        leaseService.getOrganizationLeases(organizationId),
        tenantNoticeService.getOrganizationNotices(organizationId),
        dealCaseService.getDealCasesByOrganization(organizationId),
        leaseScreeningService.listForOrganization(organizationId),
        eSignatureService.pendingEsignByLeaseId(organizationId).catch(() => ({})),
      ]);
      const scope = withMemberScopeDefaults({
        scopeMode,
        scopedPropertyIds,
        bypassPropertyScope,
      });
      const scopedLeases = filterByNestedPropertyScope(
        rows || [],
        getNestedListingPropertyId,
        scope.scopeMode,
        scope.scopedPropertyIds,
        scope.bypassPropertyScope,
      );
      setLeases(scopedLeases);
      setNotices(noticeRows || []);
      setApplications(
        filterByNestedPropertyScope(
          (dealCases || []).filter((dealCase: any) =>
            ["rental_application", "lease_application"].includes(dealCase.case_type),
          ),
          (deal) => {
            const property = deal.property;
            if (Array.isArray(property)) return property[0]?.id;
            return property?.id ?? deal.property_id;
          },
          scope.scopeMode,
          scope.scopedPropertyIds,
          scope.bypassPropertyScope,
        ),
      );
      setScreenings(screeningRows || []);
      setPendingEsignByLease(pendingEsigns || {});
      const depositRows = await leaseDepositService.getByLeaseIds(scopedLeases.map((lease) => lease.id));
      setDeposits(depositRows);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load leases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLeases();
  }, [organizationId, scopeMode, scopedPropertyIds, bypassPropertyScope]);

  const screeningSubmitted = screenings.filter((s) => ["submitted", "manual_review"].includes(s.status)).length;
  const screeningCompleted = screenings.filter((s) => s.status === "completed").length;
  const renewalsPending = leases.filter((l) => l.renewal_status === "requested").length;
  const readyForSigning = leases.filter((l) => l.status === "approved" && l.signed_at == null).length;

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "renewal" | "unsigned" | "inactive">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLeases = useMemo(() => {
    return leases.filter((lease) => {
      if (statusFilter === "active" && lease.status !== "active") return false;
      if (statusFilter === "renewal" && lease.renewal_status !== "requested") return false;
      if (statusFilter === "unsigned" && (lease.status !== "approved" || lease.signed_at != null)) return false;
      if (statusFilter === "inactive" && !["expired", "terminated"].includes(lease.status)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const address = lease.listing?.property?.address?.toLowerCase() || "";
      const tenantName = (lease.tenant?.full_name || lease.tenant?.email || "").toLowerCase();
      return address.includes(q) || tenantName.includes(q);
    });
  }, [leases, statusFilter, searchQuery]);

  const respondRenewal = async (leaseId: string, status: "approved" | "declined") => {
    try {
      setBusyId(`${leaseId}-${status}`);
      await leaseWorkflowService.respondToRenewal(leaseId, status);
      toast.success(`Renewal ${status}.`);
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update renewal.");
    } finally {
      setBusyId(null);
    }
  };

  const startScreening = async () => {
    const application = applications.find((e) => e.id === screeningCaseId) || applications[0];
    if (!application) { toast.error("No rental applications ready for screening."); return; }
    try {
      setBusyId("start-screening");
      await leaseScreeningService.start({ dealCaseId: application.id, provider: screeningProvider });
      toast.success(screeningProvider === "manual_review" ? "Added to manual review." : "Screening request recorded.");
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to start the screening workflow.");
    } finally { setBusyId(null); }
  };

  const recordScreeningResult = async (screening: any, recommendation: "clear" | "review" | "decline") => {
    if (!user) return;
    try {
      setBusyId(`screening-${screening.id}-${recommendation}`);
      await leaseScreeningService.recordResult({
        screeningId: screening.id,
        status: recommendation === "review" ? "manual_review" : "completed",
        recommendation,
        reviewedBy: user.id,
        resultSummary: recommendation === "clear" ? "Reviewed and clear to proceed." : recommendation === "decline" ? "Reviewed and not recommended." : "Needs follow-up before a decision.",
      });
      toast.success("Screening decision saved.");
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save the screening decision.");
    } finally { setBusyId(null); }
  };

  const prepareRentSchedule = async (lease: any) => {
    try {
      setBusyId(`schedule-${lease.id}`);
      await leaseWorkflowService.ensureRentSchedule(lease);
      toast.success("Rent schedule is ready.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to prepare the rent schedule.");
    } finally { setBusyId(null); }
  };

  const requestRenewal = async (leaseId: string) => {
    try {
      setBusyId(`renew-${leaseId}`);
      await leaseWorkflowService.requestRenewal(leaseId);
      toast.success("Renewal request sent.");
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to request renewal.");
    } finally { setBusyId(null); }
  };

  const sendForEsignature = async (lease: any, forceOverride = false) => {
    if (!user) return;
    try {
      setBusyId(`esign-${lease.id}`);
      const request = await leaseEsignatureService.sendLeaseForSigning({
        organizationId,
        lease,
        requestedBy: user.id,
        forceOverride,
      });
      toast.success(`Lease sent for signature.${request.signing_url ? " Signing link ready." : ""}`);
    } catch (error: any) {
      console.error(error);
      if (error?.name === "LeaseAuditBlockedError" || error?.name === "CounselSignoffRequiredError") {
        setOverrideRequest({ lease, message: error.message });
        return;
      }
      toast.error(error?.message || "Unable to send lease for e-signature.");
    } finally { setBusyId(null); }
  };

  const signLease = async (lease: any) => {
    if (!user) return;
    try {
      setBusyId(`sign-${lease.id}`);
      await leaseWorkflowService.signLeaseDocument({ leaseId: lease.id, userId: user.id, signerName: user.user_metadata?.full_name || user.email || "Authorized signer", signerEmail: user.email });
      toast.success("Lease signed and recorded.");
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to sign this lease.");
    } finally { setBusyId(null); }
  };

  const loadMoveChecklist = async (leaseId: string) => {
    if (!leaseId) return;
    try {
      setBusyId(`checklist-${leaseId}`);
      await moveChecklistService.ensureChecklists(leaseId);
      setMoveLeaseId(leaseId);
      setMoveItems(await moveChecklistService.getChecklists(leaseId));
    } catch (error) {
      console.error(error);
      toast.error("Unable to prepare move checklist.");
    } finally { setBusyId(null); }
  };

  const toggleMoveItem = async (item: any) => {
    if (!user) return;
    try {
      setBusyId(`move-${item.id}`);
      await moveChecklistService.toggleItem(item.id, user.id, !item.completed);
      setMoveItems(await moveChecklistService.getChecklists(moveLeaseId));
    } catch (error) {
      console.error(error);
      toast.error("Unable to update checklist item.");
    } finally { setBusyId(null); }
  };

  const saveDeposit = async (lease: any) => {
    if (!user) return;
    const value = depositValues[lease.id] || { amount: "", deductions: "0", refunded: "0", reason: "" };
    const amountMinor = Math.round(Number(value.amount) * 100);
    const deductionsMinor = Math.round(Number(value.deductions || 0) * 100);
    const refundedMinor = Math.round(Number(value.refunded || 0) * 100);
    if (!amountMinor || deductionsMinor + refundedMinor > amountMinor) {
      toast.error("Enter a deposit amount; deductions and refunds cannot exceed it.");
      return;
    }
    try {
      setBusyId(`deposit-${lease.id}`);
      await leaseDepositService.upsert({ leaseId: lease.id, amountMinor, deductionsMinor, refundedMinor, currency: lease.currency || "GHS", reason: value.reason, recordedBy: user.id });
      toast.success("Deposit record saved.");
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save deposit.");
    } finally { setBusyId(null); }
  };

  const sendNotice = async () => {
    const lease = leases.find((e) => e.id === noticeLeaseId) || leases[0];
    if (!lease?.tenant_user_id || !user?.id) { toast.error("Select a lease with an assigned tenant."); return; }
    if (!noticeTitle.trim() || !noticeBody.trim()) { toast.error("Add a title and message."); return; }
    try {
      setSendingNotice(true);
      await tenantNoticeService.sendNotice({ organizationId, tenantUserId: lease.tenant_user_id, leaseId: lease.id, createdBy: user.id, noticeType, title: noticeTitle.trim(), body: noticeBody.trim() });
      toast.success("Notice sent to tenant.");
      setNoticeTitle("");
      setNoticeBody("");
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to send notice.");
    } finally { setSendingNotice(false); }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-surface-subtle animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-surface/80 border border-emerald-500/20 shadow-lg backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-emerald-500/15 via-primary/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-radial from-blue-500/10 via-transparent to-transparent blur-2xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="success" dot pulse className="text-xs font-semibold px-2.5 py-1">
                Tenancy & Lease Governance
              </Badge>
              <span className="text-xs text-ink-muted flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-500" />
                Act 220 & Ghana Rent Cap Compliant
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-medium tracking-tight text-ink">
              Lease & Tenancy Hub
            </h1>
            <p className="text-sm text-ink-secondary max-w-xl leading-relaxed">
              Automate lease agreements, digital signatures, escrow security deposits, rent reviews, and Ghana Card tenant screening.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button variant="gradient" size="sm" className="gap-2 shadow-sm" onClick={() => void loadLeases()}>
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Tenancies
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI Strip with Halo Illumination ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Applications"
          value={String(applications.length)}
          subtitle="Rental & lease apps"
          icon={ClipboardList}
          iconColor="primary"
          glow="primary"
          trend={applications.length > 0 ? { value: `${applications.length} pending`, isPositive: true } : undefined}
        />
        <MetricCard
          title="Screening Active"
          value={String(screeningSubmitted)}
          subtitle={`${screeningCompleted} completed`}
          icon={UserCheck}
          iconColor="emerald"
          glow="emerald"
          trend={screeningSubmitted > 0 ? { value: "In review", isPositive: true } : undefined}
        />
        <MetricCard
          title="Awaiting Signatures"
          value={String(readyForSigning)}
          subtitle="Approved, unsigned"
          icon={FileSignature}
          iconColor="purple"
          glow="purple"
          trend={readyForSigning > 0 ? { value: "Action needed", isPositive: false } : undefined}
        />
        <MetricCard
          title="Renewals Pending"
          value={String(renewalsPending)}
          subtitle="Awaiting decision"
          icon={RefreshCw}
          iconColor="amber"
          glow="amber"
          trend={renewalsPending > 0 ? { value: "Review required", isPositive: false } : undefined}
        />
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-2 bg-surface/60 backdrop-blur-md rounded-2xl border border-surface-border/80">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All Leases", count: leases.length },
            { id: "active", label: "Active", count: leases.filter((l) => l.status === "active").length },
            { id: "renewal", label: "Renewal Requests", count: renewalsPending },
            { id: "unsigned", label: "Needs Signature", count: readyForSigning },
            { id: "inactive", label: "Concluded", count: leases.filter((l) => ["expired", "terminated"].includes(l.status)).length },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-white shadow-sm shadow-primary/25"
                    : "text-ink-secondary hover:text-ink hover:bg-surface-hover/80"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-surface-subtle text-ink-tertiary"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search address or tenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-surface/90 border border-surface-border text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Active Leases ── */}
      {leases.length === 0 ? (
        <Card variant="glass" className="p-12 flex flex-col items-center justify-center text-center gap-4">
          <span className="p-4 rounded-2xl bg-emerald-500/10">
            <KeyRound className="w-8 h-8 text-emerald-500" />
          </span>
          <div>
            <p className="font-bold text-ink text-base">No tenancy agreements found</p>
            <p className="text-xs text-ink-secondary mt-1">Active tenancy agreements will appear here once executed or approved.</p>
          </div>
        </Card>
      ) : filteredLeases.length === 0 ? (
        <Card variant="glass" className="p-10 flex flex-col items-center justify-center text-center gap-3">
          <SlidersHorizontal className="w-8 h-8 text-ink-muted" />
          <div>
            <p className="font-semibold text-ink text-sm">No leases match your active filters</p>
            <p className="text-xs text-ink-secondary mt-0.5">Try changing the status tab or clearing your search term.</p>
          </div>
          <Button
            size="sm"
            variant="glass"
            onClick={() => {
              setStatusFilter("all");
              setSearchQuery("");
            }}
            className="text-xs mt-1"
          >
            Reset Filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredLeases.map((lease) => {
            const activeEsign = pendingEsignByLease[lease.id];
            const landlordUserId = String(activeEsign?.metadata?.landlordSignerUserId || "");
            const landlordSigner = activeEsign?.signers?.find((s: any) => s.role === "landlord");
            const countersignUrl =
              activeEsign?.status === "partially_signed" && landlordUserId === user?.id
                ? eSignatureService.signingUrlForSigner(activeEsign, landlordSigner?.email)
                : null;
            const existing = deposits.find((d) => d.lease_id === lease.id);
            const depositValue = depositValues[lease.id] || {
              amount: existing ? String(existing.amount_minor / 100) : "",
              deductions: existing ? String(existing.deductions_minor / 100) : "0",
              refunded: existing ? String(existing.refunded_minor / 100) : "0",
              reason: existing?.deduction_reason || "",
            };

            return (
              <Card key={lease.id} variant="glass" className="overflow-visible border border-surface-border/80 hover:border-emerald-500/40 bg-surface/80 backdrop-blur-md rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md group">
                {/* Lease Header */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/20 group-hover:bg-emerald-500/15 transition-colors">
                      <KeyRound className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display font-medium text-ink text-base leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {lease.listing?.property?.address || "Lease property"}
                      </p>
                      <p className="text-xs text-ink-secondary mt-1 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-ink">{lease.tenant?.full_name || lease.tenant?.email || "Tenant"}</span>
                        <span className="text-ink-muted text-[10px]">&bull;</span>
                        <span className="flex items-center gap-1 text-ink-muted">
                          <CalendarRange className="w-3 h-3" />
                          Commenced {lease.start_date ?? "-"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <Badge variant={leaseStatusVariant(lease.status)} className="capitalize text-xs">
                      {lease.status}
                    </Badge>
                    {lease.renewal_status === "requested" && (
                      <Badge variant="warning" dot dotColor="amber" className="text-xs">Renewal requested</Badge>
                    )}
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(lease.rent_minor, lease.currency)}
                      <span className="text-xs font-normal text-ink-secondary ml-1">/mo</span>
                    </span>
                  </div>
                </div>

                {/* Renewal Actions */}
                {lease.renewal_status === "requested" && (
                  <div className="px-5 pb-4 flex gap-2">
                    <Button size="sm" variant="gradient" onClick={() => void respondRenewal(lease.id, "approved")} disabled={busyId === `${lease.id}-approved`} className="gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      {busyId === `${lease.id}-approved` ? "Approving..." : "Approve renewal"}
                    </Button>
                    <Button size="sm" variant="glass" onClick={() => void respondRenewal(lease.id, "declined")} disabled={busyId === `${lease.id}-declined`}>
                      {busyId === `${lease.id}-declined` ? "Declining..." : "Decline"}
                    </Button>
                  </div>
                )}

                {/* Action Bar */}
                <div className="border-t border-surface-border/80 px-5 py-3.5 flex flex-wrap gap-2 bg-surface-subtle/40">
                  <Button
                    size="sm"
                    variant="glass"
                    onClick={() => void sendForEsignature(lease)}
                    disabled={busyId === `esign-${lease.id}` || !lease.tenant?.email}
                    className="gap-1.5 text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {busyId === `esign-${lease.id}` ? "Sending…" : "Send for e-signature"}
                  </Button>
                  <Button
                    size="sm"
                    variant="glass"
                    onClick={() => void prepareRentSchedule(lease)}
                    disabled={busyId === `schedule-${lease.id}`}
                    className="gap-1.5 text-xs"
                  >
                    <CalendarRange className="w-3.5 h-3.5" />
                    {busyId === `schedule-${lease.id}` ? "Preparing…" : "Rent schedule"}
                  </Button>

                  {countersignUrl ? (
                    <Button size="sm" variant="gradient" onClick={() => window.open(countersignUrl, "_blank", "noopener,noreferrer")} className="gap-1.5 text-xs">
                      <FileSignature className="w-3.5 h-3.5" />
                      Countersign lease
                    </Button>
                  ) : activeEsign ? (
                    <Badge variant="info" className="text-xs px-3 py-1.5">E-sign in progress</Badge>
                  ) : lease.signing_status !== "signed" ? (
                    <Button size="sm" variant="glass" onClick={() => void signLease(lease)} disabled={busyId === `sign-${lease.id}`} className="gap-1.5 text-xs">
                      <FileSignature className="w-3.5 h-3.5" />
                      {busyId === `sign-${lease.id}` ? "Signing…" : "Record e-signature"}
                    </Button>
                  ) : (
                    <Badge variant="success" dot className="text-xs px-3 py-1.5">E-signed</Badge>
                  )}

                  {(!lease.renewal_status || lease.renewal_status === "declined") && (
                    <Button size="sm" variant="glass" onClick={() => void requestRenewal(lease.id)} disabled={busyId === `renew-${lease.id}`} className="gap-1.5 text-xs">
                      <RefreshCw className="w-3.5 h-3.5" />
                      {busyId === `renew-${lease.id}` ? "Requesting…" : "Request renewal"}
                    </Button>
                  )}
                </div>

                {/* Deposit Management */}
                <div className="border-t border-surface-border/80 p-5 bg-surface-subtle/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Wallet className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-bold text-ink uppercase tracking-wider">Deposit Management</span>
                    {existing && <Badge variant="success" className="text-[10px] ml-auto">On record</Badge>}
                  </div>
                  <p className="text-[11px] text-ink-secondary mb-3 leading-relaxed">
                    Record held deposit, approved deductions, evidence reason, and refund progress separately from rent.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-ink-secondary mb-1">Held deposit</p>
                      <Input
                        placeholder="e.g. 2500"
                        value={depositValue.amount}
                        onChange={(e) => setDepositValues((c) => ({ ...c, [lease.id]: { ...depositValue, amount: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-ink-secondary mb-1">Deductions</p>
                      <Input
                        placeholder="0"
                        value={depositValue.deductions}
                        onChange={(e) => setDepositValues((c) => ({ ...c, [lease.id]: { ...depositValue, deductions: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-ink-secondary mb-1">Refunded</p>
                      <Input
                        placeholder="0"
                        value={depositValue.refunded}
                        onChange={(e) => setDepositValues((c) => ({ ...c, [lease.id]: { ...depositValue, refunded: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-ink-secondary mb-1">Reason / evidence</p>
                      <Input
                        placeholder="Damage reason…"
                        value={depositValue.reason}
                        onChange={(e) => setDepositValues((c) => ({ ...c, [lease.id]: { ...depositValue, reason: e.target.value } }))}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" variant="glass" onClick={() => void saveDeposit(lease)} disabled={busyId === `deposit-${lease.id}`} className="gap-1.5 text-xs">
                      <Wallet className="w-3.5 h-3.5" />
                      {busyId === `deposit-${lease.id}` ? "Saving…" : "Save deposit record"}
                    </Button>
                  </div>
                </div>

                {user?.id ? (
                  <LeaseNotesPanel
                    organizationId={organizationId}
                    leaseId={lease.id}
                    authorUserId={user.id}
                  />
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Jurisdiction Lease Schedule ── */}
      <Card variant="glass" className="p-6 border-surface-border/80">
        <SectionHeader
          icon={Shield}
          title="Jurisdiction Lease Schedule"
          subtitle="Generate mandatory clauses and audit drafts against property-specific rent and deposit caps."
          accent="emerald"
        />
        {leases.length > 0 ? (
          <div className="space-y-4">
            <StyledSelect
              value={clauseLeaseId || leases[0]?.id || ""}
              onChange={setClauseLeaseId}
              icon={KeyRound}
              label="Select lease"
            >
              {leases.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {lease.listing?.property?.address || "Property"} — {lease.tenant?.full_name || lease.tenant?.email || "Tenant"}
                </option>
              ))}
            </StyledSelect>
            {(() => {
              const lease = leases.find((e) => e.id === (clauseLeaseId || leases[0]?.id)) || leases[0];
              const property = lease?.listing?.property;
              return (
                <PropertyLeaseClausePanel
                  property={property}
                  landlordName={lease?.landlord?.full_name || undefined}
                  tenantName={lease?.tenant?.full_name || lease?.tenant?.email || undefined}
                  rentAmountMajor={lease?.rent_minor ? lease.rent_minor / 100 : undefined}
                  currency={lease?.currency || property?.currency || "GHS"}
                />
              );
            })()}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-ink-secondary bg-surface-subtle/50 rounded-xl border border-surface-border">
            Active leases will appear here for schedule generation.
          </div>
        )}
      </Card>

      {/* ── Application Screening ── */}
      <Card variant="glass" className="p-6 border-surface-border/80">
        <SectionHeader
          icon={UserCheck}
          title="Application Screening"
          subtitle="Keep the application, the result, and the next decision together. Manual review stays inside the platform."
          accent="blue"
        />
        {applications.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-[1fr_240px_auto] items-end">
            <StyledSelect
              value={screeningCaseId || applications[0]?.id || ""}
              onChange={setScreeningCaseId}
              icon={UserCheck}
              label="Applicant"
            >
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.user?.full_name || app.user?.email || "Applicant"} — {app.listing?.property?.address || "Rental application"}
                </option>
              ))}
            </StyledSelect>
            <StyledSelect
              value={screeningProvider}
              onChange={(v) => setScreeningProvider(v as "manual_review" | "provider_pending_setup")}
              icon={ArrowUpDown}
              label="Review method"
            >
              <option value="manual_review">Manual review</option>
              <option value="provider_pending_setup">Connected provider (setup required)</option>
            </StyledSelect>
            <div className="pb-px">
              <Button
                onClick={() => void startScreening()}
                disabled={busyId === "start-screening"}
                variant="gradient"
                size="sm"
                className="gap-1.5 w-full"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                {busyId === "start-screening" ? "Starting…" : "Start review"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-ink-secondary bg-surface-subtle/50 rounded-xl border border-surface-border">
            New rental and lease applications will appear here as soon as they are submitted.
          </div>
        )}

        {screenings.length > 0 && (
          <div className="mt-5 space-y-2">
            {screenings.slice(0, 6).map((screening) => {
              const application = applications.find((e) => e.id === screening.deal_case_id);
              const isBusy = busyId?.startsWith(`screening-${screening.id}`);
              return (
                <div
                  key={screening.id}
                  className="flex flex-col gap-3 rounded-xl border border-surface-border p-4 md:flex-row md:items-center md:justify-between bg-surface/60 hover:border-blue-500/30 transition-all"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{application?.user?.full_name || application?.user?.email || "Applicant"}</p>
                    <p className="text-xs text-ink-secondary mt-0.5">
                      {application?.listing?.property?.address || "Rental application"} / {screening.provider === "manual_review" ? "Manual review" : "Provider workflow"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize text-xs">
                      {screening.recommendation || screening.status.replace("_", " ")}
                    </Badge>
                    {!["clear", "decline"].includes(screening.recommendation || "") && (
                      <>
                        <Button size="sm" variant="glass" onClick={() => void recordScreeningResult(screening, "review")} disabled={isBusy} className="text-xs">
                          Needs follow-up
                        </Button>
                        <Button size="sm" variant="gradient" onClick={() => void recordScreeningResult(screening, "clear")} disabled={isBusy} className="text-xs">
                          <Check className="w-3 h-3" /> Clear to proceed
                        </Button>
                        <Button size="sm" variant="glass" onClick={() => void recordScreeningResult(screening, "decline")} disabled={isBusy} className="text-xs text-red-500 border-red-500/20 hover:bg-red-500/5">
                          Do not proceed
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Send Tenant Notice ── */}
      <Card variant="glass" className="p-6 border-surface-border/80">
        <SectionHeader
          icon={Bell}
          title="Send Tenant Notice"
          accent="purple"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            {leases.length > 0 && (
              <StyledSelect
                value={noticeLeaseId || leases[0]?.id || ""}
                onChange={setNoticeLeaseId}
                icon={KeyRound}
                label="Lease"
              >
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.tenant?.full_name || lease.tenant?.email || "Tenant"} — {lease.listing?.property?.address || lease.id}
                  </option>
                ))}
              </StyledSelect>
            )}
            <StyledSelect value={noticeType} onChange={setNoticeType} label="Notice type">
              <option value="general">General</option>
              <option value="rent_increase">Rent increase</option>
              <option value="lease_renewal">Lease renewal</option>
              <option value="termination">Termination</option>
              <option value="inspection">Inspection</option>
              <option value="maintenance">Maintenance</option>
            </StyledSelect>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider mb-1.5">Notice title</p>
              <Input
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                placeholder="e.g. Upcoming rent review"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider mb-1.5">Message</p>
              <Textarea
                className="w-full min-h-[80px] rounded-xl border border-surface-border bg-surface/80 backdrop-blur-sm px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200 resize-none"
                value={noticeBody}
                onChange={(e) => setNoticeBody(e.target.value)}
                placeholder="Notice message…"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => void sendNotice()}
            disabled={sendingNotice || leases.length === 0}
            variant="gradient"
            size="sm"
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {sendingNotice ? "Sending…" : "Send notice"}
          </Button>
        </div>
      </Card>

      {/* ── Recent Notices ── */}
      {notices.length > 0 && (
        <Card variant="glass" className="p-6 border-surface-border/80">
          <SectionHeader
            icon={Inbox}
            title="Recent Notices"
            subtitle={`${notices.length} notices sent`}
            accent="amber"
          />
          <div className="space-y-2">
            {notices.slice(0, 8).map((notice) => (
              <div
                key={notice.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-surface-border p-4 bg-surface/60 hover:border-amber-500/30 transition-all"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{notice.title}</p>
                  <p className="text-xs text-ink-secondary mt-0.5 line-clamp-1">{notice.body}</p>
                  <p className="text-[11px] text-ink-muted mt-1">
                    {notice.tenant?.full_name || notice.tenant?.email} &bull; {new Date(notice.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize text-xs shrink-0">
                  {notice.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Move-In / Move-Out Handover ── */}
      <Card variant="glass" className="p-6 border-surface-border/80">
        <SectionHeader
          icon={ClipboardList}
          title="Move-In / Move-Out Handover"
          subtitle="Track keys, condition checks, utilities, damage review, and deposit-release readiness against the lease."
          accent="emerald"
        />
        {leases.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {leases.map((lease) => (
              <button
                key={lease.id}
                onClick={() => void loadMoveChecklist(lease.id)}
                disabled={busyId === `checklist-${lease.id}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  moveLeaseId === lease.id
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "border-surface-border text-ink-secondary hover:bg-surface-hover hover:text-ink"
                }`}
              >
                {busyId === `checklist-${lease.id}` ? "Loading…" : lease.listing?.property?.address || "Lease"}
              </button>
            ))}
          </div>
        ) : null}

        {moveItems.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {(["move_in", "move_out"] as const).map((type) => {
              const items = moveItems.filter((item) => item.checklist_type === type);
              const doneCount = items.filter((i) => i.completed).length;
              return (
                <div key={type} className="rounded-xl border border-surface-border p-4 bg-surface/60">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-ink capitalize">{type.replace("_", " ")} checklist</h3>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {doneCount}/{items.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all text-sm ${
                          item.completed
                            ? "border-emerald-500/20 bg-emerald-500/5 text-ink"
                            : "border-surface-border bg-surface/40 text-ink-secondary hover:bg-surface-hover hover:text-ink"
                        }`}
                        onClick={() => void toggleMoveItem(item)}
                        disabled={busyId === `move-${item.id}`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-surface-border"}`}>
                          {item.completed && <Check className="h-3 w-3" />}
                        </span>
                        <span className={`text-xs font-medium ${item.completed ? "line-through text-ink-secondary" : ""}`}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : leases.length > 0 ? (
          <div className="py-6 text-center text-sm text-ink-secondary bg-surface-subtle/50 rounded-xl border border-surface-border">
            Choose a lease above to prepare its handover checklist.
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-ink-secondary bg-surface-subtle/50 rounded-xl border border-surface-border">
            <AlertCircle className="w-4 h-4 text-ink-muted mx-auto mb-1.5" />
            No leases to generate a checklist for yet.
          </div>
        )}
      </Card>
      <ActionDialog
        open={Boolean(overrideRequest)}
        onOpenChange={(open) => !open && setOverrideRequest(null)}
        title="Send with manager override?"
        description={`${overrideRequest?.message || "This lease requires additional review."} The override is recorded in the audit trail.`}
        confirmLabel="Send with override"
        tone="destructive"
        pending={Boolean(overrideRequest && busyId === `esign-${overrideRequest.lease.id}`)}
        onConfirm={async () => {
          const lease = overrideRequest?.lease;
          if (!lease) return;
          setOverrideRequest(null);
          await sendForEsignature(lease, true);
        }}
      />
    </div>
  );
}

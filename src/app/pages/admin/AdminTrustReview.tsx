import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Shield,
  UserCheck,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  FileText,
  Building2,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  AlertTriangle,
  Fingerprint,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  BadgeCheck,
  Inbox,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { kycService } from "../../../lib/kyc.service";
import { AdminKycPolicies } from "./AdminKycPolicies";
import {
  trustVerificationService,
  type TrustRequestStatus,
} from "../../../lib/trust-verification.service";
import { AdminActionDialog } from "../../components/admin/AdminActionDialog";

function formatLabel(value?: string | null) {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function recommendationColors(recommendation?: string | null) {
  if (recommendation === "approve")
    return {
      badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      bar: "bg-emerald-500",
      glow: "shadow-[0_0_12px_rgba(16,185,129,0.25)]",
    };
  if (recommendation === "reject")
    return {
      badge: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
      bar: "bg-red-500",
      glow: "shadow-[0_0_12px_rgba(239,68,68,0.25)]",
    };
  return {
    badge: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-400",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.25)]",
  };
}

function ConfidenceBar({ score, recommendation }: { score: number; recommendation?: string | null }) {
  const colors = recommendationColors(recommendation);
  return (
    <div className="mt-1 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">AI Confidence</span>
        <span className="text-[11px] font-bold tabular-nums text-foreground">{score}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function FlagChips({ flags }: { flags: string[] }) {
  if (!flags.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {flags.map((flag) => (
        <span
          key={flag}
          className="inline-flex items-center gap-1 rounded-lg border border-red-400/30 bg-red-500/8 px-2 py-0.5 text-[10px] font-semibold capitalize text-red-600 dark:text-red-400"
        >
          <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
          {formatLabel(flag)}
        </span>
      ))}
    </div>
  );
}

function ExtractedDataAccordion({ data }: { data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(data);
  if (!keys.length) return null;
  return (
    <div className="border-t border-border/40 pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>OCR Extracted Fields ({keys.length})</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-muted/50 p-3 sm:grid-cols-3">
          {keys.map((k) => (
            <div key={k} className="min-w-0">
              <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                {formatLabel(k)}
              </p>
              <p className="truncate text-[11px] font-medium text-foreground">
                {String(data[k] ?? "—")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Filter pill component ──────────────────────────────────────────────────
function FilterPill({
  active,
  onClick,
  count,
  label,
  activeColor = "text-foreground",
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  label: string;
  activeColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
        active
          ? `bg-background shadow-xs ${activeColor}`
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${active ? "bg-border/80" : "bg-muted"}`}>
        {count}
      </span>
    </button>
  );
}

export function AdminTrustReview() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"queue" | "policies">("queue");
  const [kycQueue, setKycQueue] = useState<any[]>([]);
  const [trustQueue, setTrustQueue] = useState<any[]>([]);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [kycFilter, setKycFilter] = useState<"all" | "approve" | "review" | "flags">("all");
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [reviewAction, setReviewAction] = useState<
    | { kind: "kyc"; id: string; status: "verified" | "rejected" }
    | { kind: "trust"; id: string; status: TrustRequestStatus }
    | null
  >(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const loadQueues = async () => {
    try {
      setLoading(true);
      const [kycRows, trustRows] = await Promise.all([
        kycService.listPendingSubmissions(50),
        trustVerificationService.listPendingTrustRequests(30),
      ]);
      setKycQueue(kycRows);
      setTrustQueue(trustRows);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load trust review queues.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadQueues(); }, []);

  const handleOpenDocPreview = async (storagePath: string, applicantName: string) => {
    try {
      const url = await kycService.getDocumentSignedUrl(storagePath, 600);
      if (url) {
        setPreviewDoc({ url, title: `Document: ${applicantName}` });
        setPreviewZoom(1);
        setPreviewRotation(0);
      } else {
        toast.error("Could not generate secure signed document URL.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch document preview.");
    }
  };

  const rescreenKyc = async (submissionId: string) => {
    try {
      setWorkingId(`kyc:${submissionId}:screen`);
      await kycService.requestAiScreening(submissionId);
      toast.success("AI neural pre-screening completed.");
      await loadQueues();
    } catch (error) {
      console.error(error);
      toast.error("Unable to run AI pre-screening.");
    } finally {
      setWorkingId(null);
    }
  };

  const reviewKyc = async (submissionId: string, status: "verified" | "rejected", notes?: string) => {
    try {
      setWorkingId(`kyc:${submissionId}:${status}`);
      await kycService.reviewSubmission(submissionId, status, notes?.trim() || undefined);
      toast.success(`KYC submission ${status}.`);
      await loadQueues();
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Unable to review KYC submission.");
      return false;
    } finally {
      setWorkingId(null);
    }
  };

  const reviewTrust = async (requestId: string, status: TrustRequestStatus, notes?: string) => {
    try {
      setWorkingId(`trust:${requestId}:${status}`);
      await trustVerificationService.reviewTrustRequest(requestId, status, notes?.trim() || undefined);
      toast.success(`Trust request marked ${status.replace(/_/g, " ")}.`);
      await loadQueues();
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Unable to review trust request.");
      return false;
    } finally {
      setWorkingId(null);
    }
  };

  const filteredKycQueue = useMemo(() => {
    if (kycFilter === "all") return kycQueue;
    if (kycFilter === "approve") return kycQueue.filter((i) => i.ai_recommendation === "approve");
    if (kycFilter === "review") return kycQueue.filter((i) => i.ai_recommendation === "review");
    if (kycFilter === "flags") return kycQueue.filter((i) => Array.isArray(i.ai_flags) && i.ai_flags.length > 0);
    return kycQueue;
  }, [kycQueue, kycFilter]);

  if (loading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-card shadow-sm">
          <Fingerprint className="h-7 w-7 animate-pulse text-primary" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold text-foreground">Loading trust review queues…</p>
          <p className="text-xs text-muted-foreground">Fetching KYC submissions and agency requests</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Trust &amp; KYC Review</h2>
            <span className="rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {kycQueue.length + trustQueue.length} pending
            </span>
          </div>
          <p className="pl-11 text-sm text-muted-foreground">
            Audit government IDs, inspect AI biometric results, and certify trusted accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void loadQueues()}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/50 p-1">
            <Button
              size="sm"
              variant={view === "queue" ? "default" : "ghost"}
              onClick={() => setView("queue")}
              className="h-7 gap-1.5 text-xs font-semibold"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Queues
            </Button>
            <Button
              size="sm"
              variant={view === "policies" ? "default" : "ghost"}
              onClick={() => setView("policies")}
              className="h-7 gap-1.5 text-xs font-semibold"
            >
              <Building2 className="h-3.5 w-3.5" />
              Policies
            </Button>
          </div>
        </div>
      </div>

      {view === "policies" && <AdminKycPolicies />}

      {view === "queue" && (
        <>
          {/* ── KYC Identity Queue ── */}
          <Card className="overflow-hidden rounded-2xl border-border/70 p-0 shadow-xs">
            {/* Section header */}
            <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Identity Submissions (KYC)</h3>
                  <p className="text-[11px] text-muted-foreground">{kycQueue.length} pending review</p>
                </div>
              </div>

              {/* Filter pills */}
              <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border/50 bg-muted/50 p-1">
                <FilterPill active={kycFilter === "all"} onClick={() => setKycFilter("all")} count={kycQueue.length} label="All" />
                <FilterPill
                  active={kycFilter === "approve"}
                  onClick={() => setKycFilter("approve")}
                  count={kycQueue.filter((k) => k.ai_recommendation === "approve").length}
                  label="AI Approve"
                  activeColor="text-emerald-600 dark:text-emerald-400"
                />
                <FilterPill
                  active={kycFilter === "review"}
                  onClick={() => setKycFilter("review")}
                  count={kycQueue.filter((k) => k.ai_recommendation === "review").length}
                  label="Needs Review"
                  activeColor="text-amber-600 dark:text-amber-400"
                />
                <FilterPill
                  active={kycFilter === "flags"}
                  onClick={() => setKycFilter("flags")}
                  count={kycQueue.filter((k) => Array.isArray(k.ai_flags) && k.ai_flags.length > 0).length}
                  label="Flagged"
                  activeColor="text-red-600 dark:text-red-400"
                />
              </div>
            </div>

            <div className="p-6">
              {filteredKycQueue.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-14">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">Queue is clear</p>
                    <p className="text-xs text-muted-foreground">No submissions match this filter.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredKycQueue.map((submission) => {
                    const applicantName = submission.full_name || submission.user?.full_name || "Applicant";
                    const hasFlags = Array.isArray(submission.ai_flags) && submission.ai_flags.length > 0;
                    const hasAI = !!(submission.ai_screening_status || submission.ai_recommendation || submission.ai_summary);
                    const colors = recommendationColors(submission.ai_recommendation);

                    return (
                      <div
                        key={submission.id}
                        className={`rounded-2xl border bg-background p-5 transition-all hover:shadow-md ${
                          hasFlags ? "border-red-400/30 bg-red-500/[0.02]" : "border-border/70"
                        }`}
                      >
                        {/* Applicant header */}
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                {applicantName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="font-bold text-foreground">{applicantName}</p>
                                  <Badge variant="outline" className="text-[9px] font-mono uppercase tracking-wider">
                                    {formatLabel(submission.document_type)}
                                  </Badge>
                                  {submission.jurisdiction_id && (
                                    <Badge variant="secondary" className="text-[9px] font-mono">
                                      📍 {submission.jurisdiction_id}
                                    </Badge>
                                  )}
                                  {hasFlags && (
                                    <span className="flex items-center gap-0.5 rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-bold text-red-600 dark:text-red-400">
                                      <AlertTriangle className="h-2.5 w-2.5" />
                                      {submission.ai_flags.length} flag{submission.ai_flags.length !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  {submission.user?.email || "No email on record"}
                                  {submission.document_number ? ` · ID: ${submission.document_number}` : ""}
                                  {submission.date_of_birth ? ` · DOB: ${submission.date_of_birth}` : ""}
                                </p>
                              </div>
                            </div>
                            <p className="pl-11 text-[10px] text-muted-foreground">
                              Submitted {new Date(submission.submitted_at).toLocaleString()}
                              {submission.context ? ` · Context: ${formatLabel(submission.context)}` : ""}
                              {submission.provider_engine ? ` · Engine: ${submission.provider_engine}` : ""}
                            </p>
                          </div>

                          {/* Action buttons */}
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {submission.storage_path && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleOpenDocPreview(submission.storage_path, applicantName)}
                                className="h-8 gap-1.5 text-xs font-semibold"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Inspect
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={workingId === `kyc:${submission.id}:screen`}
                              onClick={() => void rescreenKyc(submission.id)}
                              className="h-8 gap-1.5 text-xs font-semibold"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              {workingId === `kyc:${submission.id}:screen` ? "Screening…" : "AI Re-screen"}
                            </Button>
                            <Button
                              size="sm"
                              disabled={workingId === `kyc:${submission.id}:verified`}
                              onClick={() => { setReviewNotes(""); setReviewAction({ kind: "kyc", id: submission.id, status: "verified" }); }}
                              className="h-8 gap-1 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={workingId === `kyc:${submission.id}:rejected`}
                              onClick={() => { setReviewNotes(""); setReviewAction({ kind: "kyc", id: submission.id, status: "rejected" }); }}
                              className="h-8 gap-1 text-xs font-bold"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        </div>

                        {/* AI Assessment panel */}
                        {hasAI ? (
                          <div className={`mt-4 rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3 ${colors.glow}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                  AI Assessment
                                </p>
                              </div>
                              {submission.ai_recommendation && (
                                <Badge
                                  variant="outline"
                                  className={`capitalize text-[10px] font-bold ${colors.badge}`}
                                >
                                  {submission.ai_recommendation}
                                </Badge>
                              )}
                            </div>

                            {typeof submission.ai_confidence_score === "number" && (
                              <ConfidenceBar
                                score={submission.ai_confidence_score}
                                recommendation={submission.ai_recommendation}
                              />
                            )}

                            {submission.ai_summary && (
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {submission.ai_summary}
                              </p>
                            )}

                            <FlagChips flags={hasFlags ? submission.ai_flags : []} />

                            {submission.ai_extracted_data &&
                              typeof submission.ai_extracted_data === "object" && (
                                <ExtractedDataAccordion data={submission.ai_extracted_data as Record<string, unknown>} />
                              )}
                          </div>
                        ) : (
                          <div className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-border/70 p-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              No AI screening executed yet
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 text-xs font-semibold"
                              onClick={() => void rescreenKyc(submission.id)}
                            >
                              <Sparkles className="h-3 w-3" />
                              Run AI Pre-screen
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* ── Agency Trust Requests ── */}
          <Card className="overflow-hidden rounded-2xl border-border/70 p-0 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-6 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Agency Trust &amp; Accreditation</h3>
                <p className="text-[11px] text-muted-foreground">{trustQueue.length} pending</p>
              </div>
              {trustQueue.length > 0 && (
                <Badge variant="outline" className="ml-auto border-violet-400/30 bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  {trustQueue.length} to review
                </Badge>
              )}
            </div>

            <div className="p-6">
              {trustQueue.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-14">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/40 bg-muted/60">
                    <Inbox className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">No pending agency requests</p>
                    <p className="text-xs text-muted-foreground">All agency trust requests are resolved.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {trustQueue.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-2xl border border-border/70 bg-background p-4 transition-all hover:shadow-sm"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                              <BadgeCheck className="h-4 w-4" />
                            </div>
                            <p className="font-semibold text-foreground">{formatLabel(request.request_type)}</p>
                            <Badge variant="outline" className="capitalize text-[10px]">{request.status}</Badge>
                          </div>
                          <p className="pl-10 text-xs text-muted-foreground">
                            {request.organization?.name || "Organization"}
                            {request.listing?.property?.address ? ` · ${request.listing.property.address}` : ""}
                          </p>
                          {request.public_summary && (
                            <p className="pl-10 text-xs leading-relaxed text-muted-foreground">
                              {request.public_summary}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            disabled={workingId === `trust:${request.id}:verified`}
                            onClick={() => { setReviewNotes(""); setReviewAction({ kind: "trust", id: request.id, status: "verified" }); }}
                            className="h-8 gap-1 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <BadgeCheck className="h-3.5 w-3.5" />
                            Verify Agency
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={workingId === `trust:${request.id}:needs_changes`}
                            onClick={() => { setReviewNotes(""); setReviewAction({ kind: "trust", id: request.id, status: "needs_changes" }); }}
                            className="h-8 gap-1 text-xs font-semibold"
                          >
                            Request Changes
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={workingId === `trust:${request.id}:rejected`}
                            onClick={() => { setReviewNotes(""); setReviewAction({ kind: "trust", id: request.id, status: "rejected" }); }}
                            className="h-8 gap-1 text-xs font-bold"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* ── Document Inspection Modal ── */}
      <AdminActionDialog
        open={Boolean(reviewAction)}
        onOpenChange={(open) => { if (!open) { setReviewAction(null); setReviewNotes(""); } }}
        title={
          reviewAction?.kind === "kyc"
            ? reviewAction.status === "verified" ? "Approve identity verification?" : "Reject identity verification?"
            : reviewAction?.status === "verified" ? "Verify trust request?" : reviewAction?.status === "needs_changes" ? "Request changes?" : "Reject trust request?"
        }
        description={
          reviewAction?.kind === "kyc" && reviewAction.status === "verified"
            ? "This certifies the applicant and grants verified resident or investor status."
            : reviewAction?.status === "rejected"
              ? "This decision prevents the current submission from being approved. Record a clear reason for the audit trail."
              : reviewAction?.status === "needs_changes"
                ? "The applicant will need to correct the requested information before verification can continue."
                : "This marks the request as verified and records your decision."
        }
        confirmLabel={reviewAction?.status === "verified" ? "Approve verification" : reviewAction?.status === "needs_changes" ? "Request changes" : "Reject submission"}
        tone={reviewAction?.status === "rejected" ? "destructive" : "default"}
        notesLabel={reviewAction?.status === "verified" ? "Reviewer notes (optional)" : "Reviewer reason"}
        notesPlaceholder={reviewAction?.status === "rejected" ? "For example: document expired or details do not match…" : "Add context for this decision…"}
        notesRequired={reviewAction?.status !== "verified"}
        notes={reviewNotes}
        onNotesChange={setReviewNotes}
        pending={Boolean(workingId)}
        onConfirm={async () => {
          if (!reviewAction) return;
          const succeeded = reviewAction.kind === "kyc"
            ? await reviewKyc(reviewAction.id, reviewAction.status, reviewNotes)
            : await reviewTrust(reviewAction.id, reviewAction.status, reviewNotes);
          if (succeeded) {
            setReviewAction(null);
            setReviewNotes("");
          }
        }}
      />

      {previewDoc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewDoc(null); }}
        >
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-background shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-6 py-3.5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">{previewDoc.title}</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 rounded-xl p-0"
                  onClick={() => setPreviewZoom((z) => Math.max(z - 0.25, 0.5))}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="min-w-[44px] text-center text-xs font-bold tabular-nums text-foreground">
                  {Math.round(previewZoom * 100)}%
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 rounded-xl p-0"
                  onClick={() => setPreviewZoom((z) => Math.min(z + 0.25, 3))}
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 rounded-xl p-0"
                  onClick={() => setPreviewRotation((r) => (r + 90) % 360)}
                  title="Rotate"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Tab
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 rounded-xl p-0"
                  onClick={() => setPreviewDoc(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Document preview area */}
            <div className="flex min-h-[400px] flex-1 items-center justify-center overflow-auto bg-black/10 p-6 dark:bg-black/30">
              <div
                style={{
                  transform: `scale(${previewZoom}) rotate(${previewRotation}deg)`,
                  transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                }}
                className="flex items-center justify-center"
              >
                {previewDoc.url.toLowerCase().includes(".pdf") ? (
                  <iframe
                    src={previewDoc.url}
                    className="h-[500px] w-[700px] rounded-xl border border-border shadow-lg"
                    title={previewDoc.title}
                  />
                ) : (
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.title}
                    className="max-h-[65vh] max-w-full rounded-2xl border border-border object-contain shadow-xl"
                  />
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-6 py-3">
              <span className="text-xs text-muted-foreground">
                Rotation: {previewRotation}° · Zoom: {Math.round(previewZoom * 100)}%
              </span>
              <Button size="sm" onClick={() => setPreviewDoc(null)} className="h-8 text-xs font-semibold">
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

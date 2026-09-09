import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FileSignature,
  Send,
  Plus,
  CheckCircle2,
  Clock,
  ExternalLink,
  Ban,
  FileText,
  RefreshCw,
  Bell,
  Eye,
  ChevronRight,
  ChevronDown,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Sparkles,
  X,
  AlertTriangle,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import {
  eSignatureService,
  type EsigRequest,
  type DocumentType,
} from "../../../lib/esignature.service";
import { useAuth } from "../../context/AuthContext";
import { leaseService } from "../../../lib/lease.service";
import { leaseEsignReminderService } from "../../../lib/lease-esign-reminder.service";
import {
  leaseEsignatureService,
  prepareLeaseEnvelope,
} from "../../../lib/lease-esignature.service";
import { LEASE_TEMPLATE_PRESETS } from "../../../lib/lease-template.service";

// ── Status helpers ────────────────────────────────────────────────────────────

function statusCfg(status: string) {
  switch (status) {
    case "completed":
      return { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Completed", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:border-emerald-900" };
    case "sent":
      return { icon: <Send className="w-3.5 h-3.5" />, label: "Sent", cls: "bg-blue-500/10 text-blue-700 border-blue-200 dark:border-blue-900" };
    case "viewed":
      return { icon: <Eye className="w-3.5 h-3.5" />, label: "Viewed", cls: "bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:border-indigo-900" };
    case "partially_signed":
      return { icon: <FileSignature className="w-3.5 h-3.5" />, label: "Partially Signed", cls: "bg-amber-500/10 text-amber-700 border-amber-200 dark:border-amber-900" };
    case "declined":
    case "voided":
    case "expired":
      return { icon: <Ban className="w-3.5 h-3.5" />, label: status.charAt(0).toUpperCase() + status.slice(1), cls: "bg-red-500/10 text-red-700 border-red-200 dark:border-red-900" };
    default:
      return { icon: <Clock className="w-3.5 h-3.5" />, label: status, cls: "bg-muted text-muted-foreground border-border" };
  }
}

// ── Timeline steps ────────────────────────────────────────────────────────────

const ENVELOPE_STEPS = ["Created", "Sent", "Viewed", "Signed", "Executed"];

function envelopeStep(status: string): number {
  if (status === "completed") return 4;
  if (status === "partially_signed") return 3;
  if (status === "viewed") return 2;
  if (status === "sent") return 1;
  return 0;
}

function EnvelopeTimeline({ status }: { status: string }) {
  const activeStep = envelopeStep(status);
  return (
    <div className="flex items-center gap-0">
      {ENVELOPE_STEPS.map((step, i) => {
        const done = i < activeStep;
        const current = i === activeStep;
        const isLast = i === ENVELOPE_STEPS.length - 1;
        return (
          <div key={step} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all
                ${done ? "bg-emerald-500 border-emerald-500" : current ? "bg-primary border-primary" : "bg-background border-muted-foreground/30"}`}>
                {done
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  : <span className={`text-[10px] font-bold ${current ? "text-primary-foreground" : "text-muted-foreground"}`}>{i + 1}</span>
                }
              </div>
              <span className={`text-[9px] mt-1 font-medium whitespace-nowrap ${done || current ? "text-foreground" : "text-muted-foreground"}`}>{step}</span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 transition-colors ${done ? "bg-emerald-500" : "bg-muted-foreground/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Envelope card ─────────────────────────────────────────────────────────────

function EnvelopeCard({
  r,
  remindingId,
  onRemind,
  onVoid,
}: {
  r: EsigRequest;
  remindingId: string | null;
  onRemind: (id: string) => void;
  onVoid: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusCfg(r.status);
  const isPending = ["sent", "viewed", "partially_signed"].includes(r.status);
  const pendingLinks = isPending ? eSignatureService.pendingSignerLinks(r) : [];

  return (
    <div className="rounded-xl border border-border overflow-hidden hover:shadow-md transition-all">
      <button
        className="w-full flex items-start gap-4 p-4 hover:bg-muted/20 text-left transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Doc icon */}
        <div className="p-2.5 rounded-xl bg-indigo-500/10 flex-shrink-0">
          <FileText className="w-5 h-5 text-indigo-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{r.document_name}</span>
            <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 border ${cfg.cls}`}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {r.signers?.[0]?.name || "—"}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" /> {r.signers?.[0]?.email || "—"}
            </span>
            <span className="flex items-center gap-1 capitalize">
              <FileText className="w-3 h-3" /> {r.document_type?.replace(/_/g, " ")}
            </span>
            {r.expires_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Expires {r.expires_at.slice(0, 10)}
              </span>
            )}
          </div>
        </div>

        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 bg-muted/10 space-y-4">
          {/* Timeline */}
          <EnvelopeTimeline status={r.status} />

          {/* Signer links */}
          {pendingLinks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pending Signer Links</p>
              <div className="flex flex-wrap gap-2">
                {pendingLinks.map((link) => (
                  <a
                    key={`${r.id}-${link.name}`}
                    href={link.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 rounded-full px-3 py-1.5 font-medium hover:bg-indigo-500/20 transition-colors"
                  >
                    {link.name}{link.role ? ` (${link.role})` : ""}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {isPending && (
              <Button
                variant="outline"
                size="sm"
                disabled={remindingId === r.id}
                onClick={() => onRemind(r.id)}
                className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                {remindingId === r.id
                  ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending…</>
                  : <><Bell className="w-3.5 h-3.5 mr-1.5" />Send Reminder</>}
              </Button>
            )}
            {r.status === "sent" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onVoid(r.id)}
                className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Ban className="w-3.5 h-3.5 mr-1.5" /> Void Envelope
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Send modal ────────────────────────────────────────────────────────────────

function SendModal({
  organizationId,
  user,
  leases,
  onClose,
  onSent,
}: {
  organizationId: string;
  user: any;
  leases: any[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState<DocumentType>("lease_agreement");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerPhone, setSignerPhone] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("14");
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [templateId, setTemplateId] = useState("residential_standard");
  const [clausePreview, setClausePreview] = useState("");
  const [auditScore, setAuditScore] = useState<number | null>(null);
  const [forceOverride, setForceOverride] = useState(false);

  useEffect(() => {
    if (docType !== "lease_agreement" || !selectedLeaseId) {
      setClausePreview(""); return;
    }
    const lease = leases.find((l) => l.id === selectedLeaseId);
    if (!lease) return;
    const prepared = prepareLeaseEnvelope({ organizationId, lease, templateId });
    setDocName(prepared.documentName);
    setClausePreview(prepared.documentBody);
    setAuditScore(prepared.auditScore);
    if (lease.tenant?.full_name) setSignerName(lease.tenant.full_name);
    if (lease.tenant?.email) setSignerEmail(lease.tenant.email);
  }, [docType, selectedLeaseId, templateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (docType === "lease_agreement" && selectedLeaseId) {
        const lease = leases.find((l) => l.id === selectedLeaseId);
        if (lease) {
          await leaseEsignatureService.sendLeaseForSigning({
            organizationId, lease, requestedBy: user?.id,
            templateId, expiresInDays: parseInt(expiresInDays) || 14, forceOverride,
          });
          toast.success("Lease envelope sent with jurisdiction clauses");
          onSent(); return;
        }
      }
      await eSignatureService.createRequest({
        organizationId, documentName: docName, documentType: docType,
        documentBody: clausePreview || undefined,
        signerName, signerEmail,
        signerPhone: signerPhone || undefined,
        expiresInDays: parseInt(expiresInDays) || 14, requestedBy: user?.id,
      });
      toast.success("eSignature envelope sent to recipient");
      onSent();
    } catch (err: any) {
      if (err?.name === "CounselSignoffRequiredError" && window.confirm(`${err.message}\n\nSend with manager override?`)) {
        setForceOverride(true);
      } else {
        toast.error(err.message || "Failed to send eSignature request");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" /> Send for eSignature
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Legally binding envelope delivered digitally for execution.
            </p>
          </div>
          <button className="text-muted-foreground hover:text-foreground" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Document title */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Document Title *</label>
            <Input required placeholder="e.g. Standard Residential Lease — Unit 14B" value={docName} onChange={(e) => setDocName(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Document Type</label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
              >
                <option value="lease_agreement">Lease Agreement</option>
                <option value="offer_letter">Offer Letter</option>
                <option value="purchase_agreement">Purchase Agreement</option>
                <option value="addendum">Lease Addendum</option>
                <option value="custom">Custom Document</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Validity Window (Days)</label>
              <Input type="number" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} />
            </div>
          </div>

          {/* Lease auto-clauses */}
          {docType === "lease_agreement" && leases.length > 0 && (
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 p-4 bg-indigo-500/5 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold">Auto-clauses from property jurisdiction</h3>
              </div>
              <select
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none"
                value={selectedLeaseId}
                onChange={(e) => setSelectedLeaseId(e.target.value)}
              >
                <option value="">Manual document (no lease link)</option>
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.listing?.property?.address || "Property"} — {lease.tenant?.full_name || "Tenant"}
                  </option>
                ))}
              </select>
              {selectedLeaseId && (
                <select
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  {LEASE_TEMPLATE_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              )}
              {auditScore != null && (
                <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2
                  ${auditScore >= 70 ? "bg-emerald-500/10 text-emerald-700" : auditScore >= 50 ? "bg-amber-500/10 text-amber-700" : "bg-red-500/10 text-red-700"}`}>
                  {auditScore >= 70 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  Compliance score: {auditScore}/100
                  {auditScore < 50 ? " — below minimum. Enable manager override." : ""}
                </div>
              )}
              {clausePreview && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-indigo-700 dark:text-indigo-300">Preview generated clauses</summary>
                  <pre className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-muted/50 p-3 whitespace-pre-wrap font-mono text-[11px] text-foreground">
                    {clausePreview.slice(0, 2400)}{clausePreview.length > 2400 ? "\n…" : ""}
                  </pre>
                </details>
              )}
              {selectedLeaseId && auditScore != null && auditScore < 50 && (
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={forceOverride} onChange={(e) => setForceOverride(e.target.checked)} className="rounded" />
                  Manager override — send despite low compliance score
                </label>
              )}
            </div>
          )}

          {/* Signer info */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> Recipient / Signer</h3>
            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" required placeholder="Full name" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" type="email" required placeholder="Email address" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="+233 24 123 4567" value={signerPhone} onChange={(e) => setSignerPhone(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />Sending…</>
                : <><Send className="w-4 h-4 mr-1.5" />Send Envelope</>}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function ESignature({ organizationId }: { organizationId?: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<EsigRequest[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | string>("all");

  const loadRequests = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const list = await eSignatureService.listRequests(organizationId);
      setRequests(list);
    } catch (err: any) {
      toast.error(err.message || "Failed to load eSignature requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    if (!organizationId) return;
    void leaseService.getOrganizationLeases(organizationId).then(setLeases).catch(() => setLeases([]));
  }, [organizationId]);

  const handleSendReminder = async (id: string) => {
    try {
      setRemindingId(id);
      await leaseEsignReminderService.sendReminder(id, user?.id);
      toast.success("Signing reminder sent (email + SMS if phone on file)");
      await loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to send reminder");
    } finally {
      setRemindingId(null);
    }
  };

  const handleVoid = async (id: string) => {
    const reason = window.prompt("Reason for voiding this envelope:");
    if (!reason) return;
    try {
      await eSignatureService.voidRequest(id, reason);
      toast.success("Envelope voided");
      await loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to void envelope");
    }
  };

  // metrics
  const completed = requests.filter((r) => r.status === "completed").length;
  const pending = requests.filter((r) => ["sent", "viewed", "partially_signed"].includes(r.status)).length;
  const voided = requests.filter((r) => ["declined", "voided", "expired"].includes(r.status)).length;

  const filtered = filterStatus === "all" ? requests : requests.filter((r) => r.status === filterStatus);

  const STATUS_OPTIONS = ["all", "sent", "viewed", "partially_signed", "completed", "declined", "voided", "expired"];

  return (
    <div className="space-y-6">
      {showSendModal && organizationId && (
        <SendModal
          organizationId={organizationId}
          user={user}
          leases={leases}
          onClose={() => setShowSendModal(false)}
          onSent={() => { setShowSendModal(false); void loadRequests(); }}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10">
              <FileSignature className="h-5 w-5 text-indigo-600" />
            </span>
            eSignature &amp; Digital Contracts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Send, track, and execute legally binding leases, addendums, and offer letters.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadRequests} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowSendModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Send New Envelope
          </Button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Envelopes", value: requests.length, icon: <FileSignature className="w-5 h-5 text-muted-foreground" />, accent: "bg-muted/50" },
          { label: "Pending Signature", value: pending, icon: <Clock className="w-5 h-5 text-amber-600" />, accent: "bg-amber-500/10" },
          { label: "Completed", value: completed, icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, accent: "bg-emerald-500/10" },
          { label: "Voided / Expired", value: voided, icon: <Ban className="w-5 h-5 text-red-600" />, accent: "bg-red-500/10" },
        ].map((m, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${m.accent}`}>{m.icon}</div>
            <div>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-2xl font-bold tabular-nums">{m.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Status filter pills ── */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all
              ${filterStatus === s ? "bg-foreground text-background border-foreground" : "bg-background border-border text-muted-foreground hover:border-muted-foreground"}`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* ── Envelope list ── */}
      <div className="space-y-2">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl border border-border bg-muted/30 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <FileSignature className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="font-semibold text-muted-foreground">No envelopes found</p>
            <p className="text-sm text-muted-foreground">
              {filterStatus !== "all" ? "Try changing the status filter." : "Send your first digital contract to get started."}
            </p>
            <Button size="sm" className="mx-auto" onClick={() => setShowSendModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Send New Envelope
            </Button>
          </Card>
        ) : (
          filtered.map((r) => (
            <EnvelopeCard
              key={r.id}
              r={r}
              remindingId={remindingId}
              onRemind={handleSendReminder}
              onVoid={handleVoid}
            />
          ))
        )}
      </div>
    </div>
  );
}

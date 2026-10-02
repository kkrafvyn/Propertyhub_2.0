import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  CreditCard,
  Fingerprint,
  Home,
  FileText,
  Sparkles,
  User,
  Mail,
  Phone,
  X,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import { leaseScreeningService } from "../../../lib/lease-screening.service";
import { useAuth } from "../../context/AuthContext";

type Recommendation = "clear" | "consider" | "decline" | "pending" | string;

interface ScreeningCheck {
  id: string;
  check_type: string;
  provider: string;
  status: string;
  recommendation: Recommendation;
  result_summary?: string;
  score?: number;
  created_at?: string;
  applicant_name?: string;
  applicant_email?: string;
  details?: Record<string, unknown>;
}

// ── helpers ────────────────────────────────────────────────────────────────

function riskColor(rec: Recommendation) {
  if (rec === "clear") return { ring: "#10b981", bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-200 dark:border-emerald-800" };
  if (rec === "consider") return { ring: "#f59e0b", bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-200 dark:border-amber-800" };
  if (rec === "decline") return { ring: "#ef4444", bg: "bg-red-500/10", text: "text-red-600", border: "border-red-200 dark:border-red-800" };
  return { ring: "#6366f1", bg: "bg-indigo-500/10", text: "text-indigo-600", border: "border-indigo-200 dark:border-indigo-800" };
}

function recBadge(rec: Recommendation) {
  if (rec === "clear") return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:border-emerald-800 gap-1"><CheckCircle2 className="w-3 h-3" /> Clear</Badge>;
  if (rec === "consider") return <Badge className="bg-amber-500/10 text-amber-700 border-amber-200 gap-1"><AlertTriangle className="w-3 h-3" /> Consider</Badge>;
  if (rec === "decline") return <Badge className="bg-red-500/10 text-red-700 border-red-200 gap-1"><XCircle className="w-3 h-3" /> Decline</Badge>;
  return <Badge className="bg-indigo-500/10 text-indigo-700 border-indigo-200 gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
}

function checkIcon(type: string) {
  if (type.includes("credit")) return <CreditCard className="w-4 h-4" />;
  if (type.includes("criminal")) return <Fingerprint className="w-4 h-4" />;
  if (type.includes("eviction")) return <Home className="w-4 h-4" />;
  if (type.includes("id") || type.includes("identity")) return <UserCheck className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

// ── Risk Score Ring SVG ─────────────────────────────────────────────────────

function RiskRing({ score, recommendation }: { score?: number; recommendation: Recommendation }) {
  const safeScore = score ?? 0;
  const capped = Math.min(100, Math.max(0, safeScore));
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (capped / 100) * circ;
  const { ring } = riskColor(recommendation);

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
        <circle
          cx="48" cy="48" r={r}
          fill="none"
          stroke={ring}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold leading-none">{capped}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ── Step wizard state ───────────────────────────────────────────────────────

interface ApplicantForm {
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
}

const BLANK_FORM: ApplicantForm = { applicantName: "", applicantEmail: "", applicantPhone: "" };

const CHECK_TYPES = [
  { key: "credit", label: "Credit Bureau", icon: <CreditCard className="w-4 h-4" />, desc: "TransUnion credit score & history" },
  { key: "criminal", label: "Criminal Record", icon: <Fingerprint className="w-4 h-4" />, desc: "National criminal background check" },
  { key: "eviction", label: "Eviction History", icon: <Home className="w-4 h-4" />, desc: "Court eviction filings search" },
  { key: "identity", label: "Identity Verify", icon: <UserCheck className="w-4 h-4" />, desc: "Ghana NIA / biometric crosscheck" },
];

// ── Row expandable ───────────────────────────────────────────────────────────

function ScreeningRow({ check }: { check: ScreeningCheck }) {
  const [open, setOpen] = useState(false);
  const { bg, text, border } = riskColor(check.recommendation);

  return (
    <div className={`rounded-xl border ${border} overflow-hidden transition-all`}>
      <button
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 text-left transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className={`p-2 rounded-lg ${bg} ${text} flex-shrink-0`}>
          {checkIcon(check.check_type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{check.applicant_name || "—"}</span>
            <span className="text-muted-foreground text-xs">·</span>
            <span className="text-xs text-muted-foreground capitalize">{check.check_type.replace(/_/g, " ")}</span>
            <span className="text-xs text-muted-foreground">· {check.provider}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{check.result_summary || "No summary available."}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {recBadge(check.recommendation)}
          {check.score !== undefined && (
            <span className={`text-sm font-bold tabular-nums ${text}`}>{check.score}</span>
          )}
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 bg-muted/10 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div><span className="text-muted-foreground block mb-0.5">Check Type</span><span className="font-medium capitalize">{check.check_type.replace(/_/g, " ")}</span></div>
            <div><span className="text-muted-foreground block mb-0.5">Provider</span><span className="font-medium">{check.provider}</span></div>
            <div><span className="text-muted-foreground block mb-0.5">Status</span><span className="font-medium capitalize">{check.status}</span></div>
            {check.applicant_email && <div><span className="text-muted-foreground block mb-0.5">Email</span><span className="font-medium">{check.applicant_email}</span></div>}
            {check.created_at && <div><span className="text-muted-foreground block mb-0.5">Run At</span><span className="font-medium">{new Date(check.created_at).toLocaleString()}</span></div>}
          </div>
          {check.details && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-medium">Raw Details</p>
              <pre className="text-xs bg-muted/40 rounded-lg p-3 overflow-auto max-h-40 text-foreground">
                {JSON.stringify(check.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export function TenantScreeningCenter({ organizationId }: { organizationId: string }) {
  const { user } = useAuth();
  const [checks, setChecks] = useState<ScreeningCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRec, setFilterRec] = useState<"all" | Recommendation>("all");

  // wizard
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [form, setForm] = useState<ApplicantForm>(BLANK_FORM);
  const [selectedChecks, setSelectedChecks] = useState<string[]>(["credit", "criminal", "eviction"]);

  const load = async () => {
    try {
      setLoading(true);
      const rows = await leaseScreeningService.listScreeningChecks(organizationId);
      setChecks(rows ?? []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [organizationId]);

  const handleRunPack = async () => {
    try {
      setRunning(true);
      await leaseScreeningService.runFullUsScreeningPack({
        organizationId,
        applicantName: form.applicantName,
        applicantEmail: form.applicantEmail,
        reviewedBy: user?.id,
      });
      toast.success("Screening pack completed — credit, criminal & eviction checked");
      setForm(BLANK_FORM);
      setShowWizard(false);
      setWizardStep(0);
      void load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRunning(false);
    }
  };

  const filtered = useMemo(() => {
    return checks.filter((c) => {
      const matchSearch =
        !search ||
        (c.applicant_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.applicant_email ?? "").toLowerCase().includes(search.toLowerCase()) ||
        c.check_type.toLowerCase().includes(search.toLowerCase());
      const matchRec = filterRec === "all" || c.recommendation === filterRec;
      return matchSearch && matchRec;
    });
  }, [checks, search, filterRec]);

  // Aggregate metrics
  const totalClear = checks.filter((c) => c.recommendation === "clear").length;
  const totalConsider = checks.filter((c) => c.recommendation === "consider").length;
  const totalDecline = checks.filter((c) => c.recommendation === "decline").length;
  const avgScore = checks.length
    ? Math.round(checks.reduce((s, c) => s + (c.score ?? 50), 0) / checks.length)
    : 0;

  const STEPS = ["Applicant Info", "Select Checks", "Review & Run"];

  const toggleCheck = (k: string) =>
    setSelectedChecks((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
            </span>
            Tenant Screening
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Credit, criminal, eviction &amp; identity verification powered by TransUnion + Ghana NIA.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => { setShowWizard(true); setWizardStep(0); }}>
            <Sparkles className="w-4 h-4 mr-1.5" />
            New Screening
          </Button>
        </div>
      </div>

      {/* ── Metric strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Avg Risk Score", value: avgScore, sub: "/ 100", ring: true, rec: avgScore >= 70 ? "clear" : avgScore >= 45 ? "consider" : "decline" as Recommendation },
          { label: "Clear", value: totalClear, icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, accent: "text-emerald-600" },
          { label: "Consider", value: totalConsider, icon: <AlertTriangle className="w-4 h-4 text-amber-600" />, accent: "text-amber-600" },
          { label: "Decline", value: totalDecline, icon: <XCircle className="w-4 h-4 text-red-600" />, accent: "text-red-600" },
        ].map((m, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            {"ring" in m && m.ring ? (
              <RiskRing score={m.value} recommendation={m.rec} />
            ) : (
              <div className="p-2.5 rounded-xl bg-muted/50">{m.icon}</div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className={`text-2xl font-bold tabular-nums ${"accent" in m ? m.accent : ""}`}>
                {m.value}{"sub" in m ? <span className="text-xs text-muted-foreground ml-1">{m.sub}</span> : null}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Risk Distribution Bar ── */}
      {checks.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Screening Outcome Distribution</span>
            <span className="text-xs text-muted-foreground">{checks.length} total screenings</span>
          </div>
          <div className="flex h-4 w-full rounded-full overflow-hidden gap-px">
            {totalClear > 0 && (
              <div
                className="bg-emerald-500 transition-all duration-700 ease-out flex items-center justify-center"
                style={{ width: `${(totalClear / checks.length) * 100}%` }}
                title={`Clear: ${totalClear}`}
              />
            )}
            {totalConsider > 0 && (
              <div
                className="bg-amber-500 transition-all duration-700 ease-out"
                style={{ width: `${(totalConsider / checks.length) * 100}%` }}
                title={`Consider: ${totalConsider}`}
              />
            )}
            {totalDecline > 0 && (
              <div
                className="bg-red-500 transition-all duration-700 ease-out"
                style={{ width: `${(totalDecline / checks.length) * 100}%` }}
                title={`Decline: ${totalDecline}`}
              />
            )}
            {(checks.length - totalClear - totalConsider - totalDecline) > 0 && (
              <div
                className="bg-indigo-400 transition-all duration-700 ease-out"
                style={{ width: `${((checks.length - totalClear - totalConsider - totalDecline) / checks.length) * 100}%` }}
                title={`Pending`}
              />
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Clear ({Math.round((totalClear / checks.length) * 100)}%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />Consider ({Math.round((totalConsider / checks.length) * 100)}%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Decline ({Math.round((totalDecline / checks.length) * 100)}%)</span>
          </div>
        </div>
      )}

      {/* ── Wizard Modal ── */}
      {showWizard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <Card className="w-full max-w-lg p-0 overflow-hidden shadow-2xl">
            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                style={{ width: `${((wizardStep + 1) / STEPS.length) * 100}%` }}
              />
            </div>

            <div className="p-6">
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                {STEPS.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                      ${i === wizardStep ? "bg-indigo-600 text-white" : i < wizardStep ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                      {i < wizardStep ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-xs hidden sm:block ${i === wizardStep ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s}</span>
                    {i < STEPS.length - 1 && <div className="w-8 h-px bg-muted mx-1" />}
                  </div>
                ))}
                <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => { setShowWizard(false); setWizardStep(0); }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step 0 — Applicant Info */}
              {wizardStep === 0 && (
                <div className="space-y-4">
                  <h2 className="font-bold text-lg">Applicant Details</h2>
                  <p className="text-sm text-muted-foreground">Enter the prospective tenant's information to begin screening.</p>
                  <div className="space-y-3">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="Full name"
                        value={form.applicantName}
                        onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        type="email"
                        placeholder="Email address"
                        value={form.applicantEmail}
                        onChange={(e) => setForm({ ...form, applicantEmail: e.target.value })}
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        type="tel"
                        placeholder="Phone (optional)"
                        value={form.applicantPhone}
                        onChange={(e) => setForm({ ...form, applicantPhone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button
                      disabled={!form.applicantName || !form.applicantEmail}
                      onClick={() => setWizardStep(1)}
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 1 — Select checks */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h2 className="font-bold text-lg">Select Check Types</h2>
                  <p className="text-sm text-muted-foreground">Choose which screening packs to run for this applicant.</p>
                  <div className="space-y-2">
                    {CHECK_TYPES.map((ct) => (
                      <button
                        key={ct.key}
                        onClick={() => toggleCheck(ct.key)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                          ${selectedChecks.includes(ct.key)
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                            : "border-border hover:border-muted-foreground"}`}
                      >
                        <div className={`p-2 rounded-lg ${selectedChecks.includes(ct.key) ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"}`}>
                          {ct.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{ct.label}</p>
                          <p className="text-xs text-muted-foreground">{ct.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                          ${selectedChecks.includes(ct.key) ? "bg-indigo-600 border-indigo-600" : "border-muted-foreground"}`}>
                          {selectedChecks.includes(ct.key) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setWizardStep(0)}>Back</Button>
                    <Button disabled={selectedChecks.length === 0} onClick={() => setWizardStep(2)}>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2 — Review & run */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h2 className="font-bold text-lg">Review &amp; Run Screening</h2>
                  <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">{form.applicantName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" /> {form.applicantEmail}
                    </div>
                    {form.applicantPhone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" /> {form.applicantPhone}
                      </div>
                    )}
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Running checks:</p>
                      <div className="flex flex-wrap gap-2">
                        {CHECK_TYPES.filter((ct) => selectedChecks.includes(ct.key)).map((ct) => (
                          <span key={ct.key} className="flex items-center gap-1 text-xs bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-full px-2.5 py-1 font-medium">
                            {ct.icon} {ct.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Results will appear in the screening history below. Add your TransUnion SmartMove API key in workspace Settings when your admin enables live bureau screening.
                  </p>
                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setWizardStep(1)}>Back</Button>
                    <Button onClick={handleRunPack} disabled={running}>
                      {running ? (
                        <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> Running…</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-1.5" /> Run Screening</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, email or check type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "clear", "consider", "decline", "pending"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRec(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize
                ${filterRec === r ? "bg-indigo-600 text-white border-indigo-600" : "bg-surface border-border text-muted-foreground hover:border-muted-foreground"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── Screening history ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <UserCheck className="h-4 w-4 text-muted-foreground" /> Screening History
            <span className="text-xs text-muted-foreground font-normal">({filtered.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl border border-border bg-surface overflow-hidden">
                <div className="h-full p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-lg bg-muted/60 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-muted/60 rounded-full w-1/3" />
                    <div className="h-2.5 bg-muted/40 rounded-full w-2/3" />
                  </div>
                  <div className="w-20 h-6 bg-muted/60 rounded-full shrink-0" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="font-semibold text-muted-foreground">No screenings found</p>
            <p className="text-sm text-muted-foreground">
              {search || filterRec !== "all" ? "Try adjusting your filters." : "Run your first screening to protect your portfolio."}
            </p>
            <Button size="sm" className="mx-auto" onClick={() => { setShowWizard(true); setWizardStep(0); }}>
              <Sparkles className="w-4 h-4 mr-1.5" /> New Screening
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <ScreeningRow key={c.id} check={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

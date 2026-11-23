import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Landmark,
  CheckCircle2,
  Clock,
  Send,
  Building,
  Smartphone,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Search,
  User,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Banknote,
  AlertTriangle,
  X,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import {
  ownerDisbursementService,
  type OwnerProfile,
  type OwnerStatementRecord,
} from "../../../lib/owner-disbursement.service";
import { useAuth } from "../../context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  EmptyState,
  ListSkeleton,
  OperationalQueryState,
  WorkspacePageShell,
} from "../../components/ux";

// ── Formatters ──────────────────────────────────────────────────────────────

const money = (ghs: number = 0) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(ghs);

function pct(v: number) { return `${v}%`; }

// ── Waterfall bar ────────────────────────────────────────────────────────────

function WaterfallBar({
  gross,
  commission,
  tax,
  net,
}: {
  gross: number;
  commission: number;
  tax: number;
  net: number;
}) {
  const safe = gross || 1;
  const commW = (commission / safe) * 100;
  const taxW = (tax / safe) * 100;
  const netW = (net / safe) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        <div
          className="bg-emerald-500 rounded-l-full transition-all duration-700"
          style={{ width: `${netW}%` }}
          title={`Net: ${money(net)}`}
        />
        <div
          className="bg-amber-400 transition-all duration-700"
          style={{ width: `${commW}%` }}
          title={`Commission: ${money(commission)}`}
        />
        <div
          className="bg-red-400 rounded-r-full transition-all duration-700"
          style={{ width: `${taxW}%` }}
          title={`Tax: ${money(tax)}`}
        />
      </div>
      <div className="flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Net payout</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Commission</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Tax (GRA)</span>
      </div>
    </div>
  );
}

// ── Payout method icon ───────────────────────────────────────────────────────

function PayoutMethodBadge({ method }: { method?: string }) {
  if (method === "bank_transfer") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-500/10 border border-blue-200 dark:border-blue-900 rounded-full px-2.5 py-0.5">
        <Landmark className="w-3 h-3" /> Bank Wire
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-500/10 border border-emerald-200 dark:border-emerald-900 rounded-full px-2.5 py-0.5">
      <Smartphone className="w-3 h-3" /> Mobile Money
    </span>
  );
}

// ── Confirm overlay ──────────────────────────────────────────────────────────

function ConfirmDisburse({
  statement,
  onConfirm,
  onCancel,
  loading,
}: {
  statement: OwnerStatementRecord;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm gap-4">
        <DialogHeader className="text-left space-y-0">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 pr-6">
              <DialogTitle className="text-base">Confirm Disbursement</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5 font-normal">
                You are about to release funds to {statement.ownerName}.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gross Rent</span>
            <span className="font-mono">{money(statement.grossRentCollectedGhs)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Commission (10%)</span>
            <span className="font-mono">−{money(statement.managementCommissionGhs)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>GRA Tax (8%)</span>
            <span className="font-mono">−{money(statement.withholdingTaxGhs)}</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between font-bold text-emerald-600">
            <span>Net Payout</span>
            <span className="font-mono">{money(statement.netDisbursableGhs)}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={onConfirm} disabled={loading}>
            {loading ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
            {loading ? "Sending…" : "Confirm & Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Owner profile card ───────────────────────────────────────────────────────

function OwnerCard({ owner }: { owner: OwnerProfile }) {
  const [expanded, setExpanded] = useState(false);
  const totalRent = owner.ownedUnits.reduce((s, u) => s + (u.monthlyRentGhs ?? 0), 0);

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 text-left transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
          {(owner.fullName || "?")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{owner.fullName}</span>
            <PayoutMethodBadge method={owner.payoutMethod} />
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{owner.email}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold font-mono text-sm">{money(totalRent)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
          <p className="text-xs text-muted-foreground">{owner.ownedUnits.length} unit{owner.ownedUnits.length !== 1 ? "s" : ""}</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 bg-muted/10 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground mb-0.5">Payout Target</p>
              <p className="font-semibold">{owner.bankName || owner.momoNetwork} — {owner.accountNumber || owner.momoNumber || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Phone</p>
              <p className="font-semibold">{owner.phone || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Management Fee</p>
              <p className="font-semibold">{pct(owner.managementFeePercent)}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Withholding Tax</p>
              <p className="font-semibold">{pct(owner.withholdingTaxPercent)}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Assigned Units</p>
            <div className="space-y-1">
              {owner.ownedUnits.map((u) => (
                <div key={u.unitId} className="flex justify-between text-xs rounded-lg bg-muted/40 px-3 py-2">
                  <span className="font-medium">{u.unitIdentifier}</span>
                  <span className="font-mono text-muted-foreground">GH₵ {u.monthlyRentGhs}/mo</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export function OwnerDisbursements({ organizationId }: { organizationId?: string }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"pending" | "history" | "owners">("pending");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [confirmStatement, setConfirmStatement] = useState<OwnerStatementRecord | null>(null);
  const [owners, setOwners] = useState<OwnerProfile[]>([]);
  const [statements, setStatements] = useState<OwnerStatementRecord[]>([]);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      setLoadError(null);
      const [ownerList, statementList] = await Promise.all([
        ownerDisbursementService.getLiveOwners(organizationId),
        ownerDisbursementService.getLiveMappedStatements(organizationId),
      ]);
      setOwners(ownerList);
      setStatements(statementList);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load owner disbursements";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [organizationId]);

  const handleDisburse = async (statementId: string) => {
    if (!organizationId || !user?.id) {
      toast.error("Sign in is required to approve owner payouts.");
      return;
    }
    try {
      setExecuting(statementId);
      const statement = statements.find((item) => item.id === statementId);
      if (!statement) throw new Error("Statement not found");
      await ownerDisbursementService.requestLiveDistribution(
        statementId,
        Math.round(statement.netDisbursableGhs * 100),
        user.id,
      );
      toast.success("Payout approval requested. A separate finance approver must review it before execution.");
      setConfirmStatement(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Disbursement failed");
    } finally {
      setExecuting(null);
    }
  };

  const pending = useMemo(() => statements.filter((s) => s.payoutStatus === "pending_approval"), [statements]);
  const history = useMemo(() => statements.filter((s) => s.payoutStatus !== "pending_approval"), [statements]);
  const totalPendingPayout = pending.reduce((sum, s) => sum + s.netDisbursableGhs, 0);
  const confirmedDisbursements = history.filter((s) => s.payoutStatus === "disbursed_bank" || s.payoutStatus === "disbursed_momo");
  const totalDisbursed = confirmedDisbursements.reduce((sum, s) => sum + s.netDisbursableGhs, 0);

  const filteredPending = useMemo(() =>
    pending.filter((s) => !search || s.ownerName.toLowerCase().includes(search.toLowerCase())),
    [pending, search]
  );
  const filteredHistory = useMemo(() =>
    history.filter((s) => !search || s.ownerName.toLowerCase().includes(search.toLowerCase())),
    [history, search]
  );

  const TABS = [
    { key: "pending" as const, label: "Pending Approval", icon: <Clock className="w-4 h-4" />, count: pending.length },
    { key: "history" as const, label: "Disbursement History", icon: <CheckCircle2 className="w-4 h-4" />, count: history.length },
    { key: "owners" as const, label: "Owner Profiles", icon: <Building className="w-4 h-4" />, count: owners.length },
  ];

  const refreshAction = (
    <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
      <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "motion-safe:animate-spin" : ""}`} />
      Refresh
    </Button>
  );

  const queryPhase = loadError
    ? "error"
    : loading
      ? "loading"
      : "ready";

  return (
    <WorkspacePageShell
      tone="finance"
      title="Owner Payouts & Rent Waterfall"
      description="Review owner statements, request payout approval, and track confirmed disbursements."
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
          Owner disbursements
        </span>
      }
      actions={refreshAction}
    >
      {/* Confirm overlay */}
      {confirmStatement && (
        <ConfirmDisburse
          statement={confirmStatement}
          onConfirm={() => handleDisburse(confirmStatement.id)}
          onCancel={() => setConfirmStatement(null)}
          loading={executing === confirmStatement.id}
        />
      )}

      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError ?? undefined}
        onRetry={() => void loadData()}
        loadingFallback={<ListSkeleton rows={4} />}
      >
      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="app-surface-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Pending Waterfall</p>
          <p className="text-2xl font-bold font-mono text-amber-600">{money(totalPendingPayout)}</p>
          <p className="text-xs text-muted-foreground">{pending.length} statement{pending.length !== 1 ? "s" : ""} queued</p>
        </Card>
        <Card className="app-surface-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Total Disbursed</p>
          <p className="text-2xl font-bold font-mono text-emerald-600">{money(totalDisbursed)}</p>
          <p className="text-xs text-muted-foreground">{confirmedDisbursements.length} confirmed deliveries</p>
        </Card>
        <Card className="app-surface-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Withholding review</p>
          <p className="text-lg font-semibold text-ink">Tax review required</p>
          <p className="text-xs text-muted-foreground">Confirm the applicable rate and deductions per statement before approval.</p>
        </Card>
        <Card className="app-surface-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Supported payout routes</p>
          <div className="flex flex-col gap-1 mt-1">
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <Smartphone className="w-3 h-3" /> MTN MoMo / Telecel
            </span>
            <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
              <Landmark className="w-3 h-3" /> ACH / GhIPSS
            </span>
          </div>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl max-w-full overflow-x-auto" role="tablist" aria-label="Disbursement views">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex shrink-0 items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              ${tab === t.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.icon} {t.label}
            <span className={`ml-1 text-xs rounded-full px-1.5 py-0.5 font-bold
              ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Search (pending / history tabs) ── */}
      {tab !== "owners" && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search owner name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {/* ── Pending ── */}
      {tab === "pending" && (
        <div className="space-y-3">
          {loading ? (
            <ListSkeleton rows={2} />
          ) : filteredPending.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No pending distributions"
              description="All owner payouts are up to date. New statements appear here after rent collection closes."
            />
          ) : (
            filteredPending.map((s) => (
              <Card key={s.id} className="p-5 space-y-4 hover:shadow-md transition-shadow">
                {/* Row top */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                    {(s.ownerName || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{s.ownerName}</span>
                      <Badge variant="outline" className="text-xs">Period: {s.period}</Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
                    disabled={!!executing}
                    onClick={() => setConfirmStatement(s)}
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Approve &amp; Disburse
                  </Button>
                </div>

                {/* Waterfall bar */}
                <WaterfallBar
                  gross={s.grossRentCollectedGhs}
                  commission={s.managementCommissionGhs}
                  tax={s.withholdingTaxGhs}
                  net={s.netDisbursableGhs}
                />

                {/* Numbers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                    <p className="text-muted-foreground mb-0.5">Gross Rent</p>
                    <p className="font-mono font-bold">{money(s.grossRentCollectedGhs)}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
                    <p className="text-muted-foreground mb-0.5">Commission</p>
                    <p className="font-mono font-bold text-amber-600">−{money(s.managementCommissionGhs)}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2">
                    <p className="text-muted-foreground mb-0.5">GRA Tax</p>
                    <p className="font-mono font-bold text-red-600">−{money(s.withholdingTaxGhs)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2">
                    <p className="text-muted-foreground mb-0.5">Net Payout</p>
                    <p className="font-mono font-bold text-emerald-600">{money(s.netDisbursableGhs)}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── History ── */}
      {tab === "history" && (
        <div className="space-y-2">
          {loading ? (
            <ListSkeleton rows={3} />
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No disbursement history yet"
              description="Completed owner payouts and references will be listed here after approval."
            />
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto" role="region" aria-label="Owner disbursements" tabIndex={0}>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left">Owner</th>
                    <th className="px-4 py-3 text-left">Period</th>
                    <th className="px-4 py-3 text-left">Reference</th>
                    <th className="px-4 py-3 text-right">Net Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredHistory.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(s.ownerName || "?")[0].toUpperCase()}
                        </div>
                        {s.ownerName}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.period}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.payoutReference || "—"}</td>
                      <td className="px-4 py-3 font-mono text-right font-bold text-emerald-600">{money(s.netDisbursableGhs)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-200 dark:border-emerald-900 rounded-full px-2.5 py-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          {s.payoutStatus.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Owners ── */}
      {tab === "owners" && (
        <div className="space-y-3">
          {loading ? (
            <ListSkeleton rows={2} />
          ) : owners.length === 0 ? (
            <EmptyState
              icon={User}
              title="No owner profiles found"
              description="Add property owners and payout destinations to enable rent waterfall disbursements."
            />
          ) : (
            owners.map((o) => <OwnerCard key={o.id} owner={o} />)
          )}
        </div>
      )}
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}

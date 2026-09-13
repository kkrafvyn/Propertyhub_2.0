import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Settings2,
  Shield,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ActivityFeed } from "../../components/ux/ActivityTimeline";
import { useAuth } from "../../context/AuthContext";
import {
  ownerOversightService,
  type OwnerExpenseApproval,
  type OwnerOversightPrefs,
  type OwnerPropertyOverview,
  type PropertyManagementAgreement,
} from "../../../lib/owner-oversight.service";
import type { TimelineActivity } from "../../components/ux/ActivityTimeline";

const money = (minor = 0, currency = "GHS") =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    minor / 100,
  );

type Tab = "overview" | "activity" | "financials" | "maintenance" | "approvals" | "notifications";

export function OwnerOversight({
  organization,
  workspaceBasePath,
}: {
  organization: { id: string; slug: string; name?: string };
  workspaceBasePath: string;
}) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "overview";
  const [loading, setLoading] = useState(true);
  const [overviews, setOverviews] = useState<OwnerPropertyOverview[]>([]);
  const [agreements, setAgreements] = useState<PropertyManagementAgreement[]>([]);
  const [activity, setActivity] = useState<TimelineActivity[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [expenseLines, setExpenseLines] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<OwnerExpenseApproval[]>([]);
  const [prefs, setPrefs] = useState<OwnerOversightPrefs | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params);
  };

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [ags, ovs, acts, stmts, expenses, maint, apps, notificationPrefs] = await Promise.all([
        ownerOversightService.listMyAgreements(user.id),
        ownerOversightService.getPropertyOverviews(user.id),
        ownerOversightService.getActivity({ ownerUserId: user.id, limit: 40 }),
        ownerOversightService.listStatements(user.id),
        ownerOversightService.listExpenseLines(user.id),
        ownerOversightService.listMaintenance(user.id),
        ownerOversightService.listExpenseApprovals(user.id),
        ownerOversightService.getNotificationPrefs(user.id),
      ]);
      setAgreements(ags);
      setOverviews(ovs);
      setActivity(ownerOversightService.toTimelineItems(acts, workspaceBasePath));
      setStatements(stmts);
      setExpenseLines(expenses);
      setIssues(maint);
      setApprovals(apps);
      setPrefs(notificationPrefs);
      if (!selectedPropertyId && ovs[0]) setSelectedPropertyId(ovs[0].propertyId);
    } catch (error: any) {
      toast.error(error.message || "Failed to load owner oversight");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user?.id, workspaceBasePath]);

  const selected = useMemo(
    () => overviews.find((o) => o.propertyId === selectedPropertyId) || overviews[0] || null,
    [overviews, selectedPropertyId],
  );

  const pendingApprovals = approvals.filter((a) => a.status === "pending");

  const priorityTone = (priority?: string) => {
    if (priority === "urgent" || priority === "critical") return "text-red-600";
    if (priority === "high") return "text-orange-600";
    return "text-amber-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading owner oversight…
      </div>
    );
  }

  if (!agreements.length && !overviews.length) {
    return (
      <Card className="p-10 text-center space-y-3">
        <Shield className="h-8 w-8 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-semibold">Owner Oversight</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          When you hand a property to a management company, your oversight dashboard appears here.
          Claim a listing or join a company with an approved property claim to get started.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Owner Oversight</h1>
          <p className="text-sm text-muted-foreground">
            Transparency for properties managed by {organization.name || "your management company"}.
            You own the asset; they operate it; BaytMiftah records the activity.
          </p>
        </div>
        {overviews.length > 1 ? (
          <select
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={selected?.propertyId || ""}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
          >
            {overviews.map((o) => (
              <option key={o.propertyId} value={o.propertyId}>
                {o.address}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {(
          [
            ["overview", "Overview", BuildingIcon],
            ["activity", "Activity", Activity],
            ["financials", "Financials", CreditCard],
            ["maintenance", "Maintenance", Wrench],
            ["approvals", `Approvals${pendingApprovals.length ? ` (${pendingApprovals.length})` : ""}`, CheckCircle2],
            ["notifications", "Notifications", Settings2],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg ${
              tab === key ? "bg-emerald-500/10 text-emerald-700 font-semibold" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && selected ? (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{selected.address}</h2>
                <p className="text-sm text-muted-foreground">{selected.city || "Ghana"}</p>
              </div>
              <Badge variant="outline">
                Last activity:{" "}
                {selected.lastActivityAt
                  ? new Date(selected.lastActivityAt).toLocaleString()
                  : "—"}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Units" value={String(selected.unitCount)} />
              <Kpi label="Occupied" value={`${selected.occupiedCount} (${selected.occupancyPct}%)`} />
              <Kpi label="Vacant" value={String(selected.vacantCount)} />
              <Kpi label="Collected" value={money(selected.collectedMinor, selected.currency)} />
              <Kpi label="Open maintenance" value={String(selected.openMaintenanceCount)} />
              <Kpi label="Leases expiring (60d)" value={String(selected.leasesExpiringSoon)} />
            </div>
          </Card>
          <div>
            <h3 className="text-sm font-semibold mb-2">Recent activity</h3>
            {activity.length ? (
              <ActivityFeed items={activity.slice(0, 8)} />
            ) : (
              <Card className="p-6 text-sm text-muted-foreground">No activity yet.</Card>
            )}
          </div>
        </div>
      ) : null}

      {tab === "activity" ? (
        activity.length ? (
          <ActivityFeed items={activity} />
        ) : (
          <Card className="p-8 text-center text-sm text-muted-foreground">No activity recorded yet.</Card>
        )
      ) : null}

      {tab === "financials" ? (
        <div className="space-y-4">
          {statements.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No owner statements yet. Your management company publishes them here.
            </Card>
          ) : (
            statements.map((s) => (
              <Card key={s.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">
                      {s.estate?.name || "Estate"} · {s.period_start} → {s.period_end}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">Status: {s.status}</p>
                  </div>
                  <Badge variant="outline">{s.currency || "GHS"}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Income</p>
                    <p className="font-semibold">{money(s.gross_collections_minor, s.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expenses</p>
                    <p className="font-semibold">{money(s.expense_minor, s.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p className="font-semibold text-emerald-700">
                      {money(s.net_distributable_minor, s.currency)}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}

          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Expense detail</h3>
            {expenseLines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No work-order expenses yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Unit</th>
                      <th className="py-2 pr-3">Work</th>
                      <th className="py-2 pr-3">Vendor</th>
                      <th className="py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseLines.map((line) => (
                      <tr key={line.id} className="border-b border-border/60">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {new Date(line.date).toLocaleDateString()}
                        </td>
                        <td className="py-2 pr-3">{line.unit}</td>
                        <td className="py-2 pr-3">{line.work}</td>
                        <td className="py-2 pr-3">{line.vendor}</td>
                        <td className="py-2 font-medium">{money(line.amountMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "maintenance" ? (
        <div className="space-y-3">
          {issues.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">No maintenance issues.</Card>
          ) : (
            issues.map((issue) => (
              <Card key={issue.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm font-semibold ${priorityTone(issue.priority)}`}>
                      {(issue.priority || "normal").toUpperCase()} — Unit{" "}
                      {issue.unit?.identifier || "—"}
                    </p>
                    <p className="font-medium">{issue.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reported {new Date(issue.created_at).toLocaleString()} · Status: {issue.status}
                    </p>
                  </div>
                  <AlertTriangle className={`h-4 w-4 ${priorityTone(issue.priority)}`} />
                </div>
                {issue.work_order ? (
                  <p className="text-xs text-muted-foreground">
                    Work order: {issue.work_order.status}
                    {issue.work_order.scheduled_for
                      ? ` · Scheduled ${new Date(issue.work_order.scheduled_for).toLocaleString()}`
                      : ""}
                    {issue.work_order.estimated_cost_minor
                      ? ` · Quote ${money(issue.work_order.estimated_cost_minor)}`
                      : ""}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(["reported", "assigned", "quote", "approved", "scheduled", "done"] as const).map(
                    (step) => {
                      const wo = Array.isArray(issue.work_order)
                        ? issue.work_order[0]
                        : issue.work_order;
                      const reached =
                        step === "reported" ||
                        (step === "assigned" &&
                          Boolean(wo?.assigned_to_user_id || ["assigned", "in_progress", "scheduled", "completed"].includes(wo?.status))) ||
                        (step === "quote" && Number(wo?.estimated_cost_minor || 0) > 0) ||
                        (step === "approved" &&
                          ["approved", "scheduled", "in_progress", "completed"].includes(String(wo?.status || ""))) ||
                        (step === "scheduled" && Boolean(wo?.scheduled_for)) ||
                        (step === "done" &&
                          ["completed", "resolved", "closed"].includes(String(issue.status || wo?.status || "")));
                      return (
                        <span
                          key={step}
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            reached
                              ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {step}
                        </span>
                      );
                    },
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      ) : null}

      {tab === "approvals" ? (
        <div className="space-y-3">
          {approvals.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No expense approvals. Large spend items from your management company appear here.
            </Card>
          ) : (
            approvals.map((item) => (
              <Card key={item.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description || item.status}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {item.status}
                  </Badge>
                </div>
                <p className="text-sm font-semibold">{money(item.amount_minor, item.currency)}</p>
                {item.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        void ownerOversightService
                          .reviewExpenseApproval({ approvalId: item.id, status: "approved" })
                          .then(() => load())
                          .then(() => toast.success("Approved"))
                          .catch((e) => toast.error(e.message || "Failed"))
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void ownerOversightService
                          .reviewExpenseApproval({ approvalId: item.id, status: "rejected" })
                          .then(() => load())
                          .then(() => toast.success("Rejected"))
                          .catch((e) => toast.error(e.message || "Failed"))
                      }
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </Card>
            ))
          )}
        </div>
      ) : null}

      {tab === "notifications" && prefs ? (
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> What you want to know
          </h2>
          {(
            [
              ["immediate_critical_maintenance", "Immediate: major / critical maintenance"],
              ["immediate_large_expense", "Immediate: large expenses"],
              ["immediate_payment_failure", "Immediate: payment failures"],
              ["immediate_lease_termination", "Immediate: lease termination"],
              ["daily_digest", "Daily digest of property activity"],
              ["weekly_digest", "Weekly performance digest"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(prefs[key])}
                onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
          <Button
            onClick={() =>
              void ownerOversightService
                .saveNotificationPrefs(prefs)
                .then((saved) => {
                  setPrefs(saved);
                  toast.success("Preferences saved");
                })
                .catch((e) => toast.error(e.message || "Failed to save"))
            }
          >
            Save preferences
          </Button>
        </Card>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold mt-1">{value}</p>
    </div>
  );
}

function BuildingIcon(props: { className?: string }) {
  return <Shield {...props} />;
}

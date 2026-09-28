import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import {
  estateOperationsService,
  type EstateIssue,
  type EstateUnit,
  type EstateWorkOrder,
  type ManagedEstate,
} from "../../../lib/estate-operations.service";
import { summarizeEstateLedger, type EstateChargeRow } from "../../../lib/estate-ledger";

const money = (value = 0, currency = "GHS") =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(value / 100);

interface MetricProps {
  icon: any;
  label: string;
  value: string;
  sublabel?: string;
  color?: "primary" | "emerald" | "amber" | "rose";
}

function Metric({ icon: Icon, label, value, sublabel, color = "primary" }: MetricProps) {
  const colorMap = {
    primary: "bg-primary/10 text-primary border-primary/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  };

  return (
    <Card className="p-5 transition-all hover:border-border/80 hover:shadow-xs">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`p-2 rounded-xl border ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
    </Card>
  );
}

export function CommandCenter({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [units, setUnits] = useState<EstateUnit[]>([]);
  const [charges, setCharges] = useState<EstateChargeRow[]>([]);
  const [issues, setIssues] = useState<EstateIssue[]>([]);
  const [orders, setOrders] = useState<EstateWorkOrder[]>([]);

  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const es = await estateOperationsService.getEstates(organizationId);
      const ids = es.map((x) => x.id);
      const us = await estateOperationsService.getUnits(ids);
      const [c, i, o] = await Promise.all([
        estateOperationsService.getCharges(us.map((x) => x.id)),
        estateOperationsService.getIssues(ids),
        estateOperationsService.getWorkOrders(ids),
      ]);
      setEstates(es);
      setUnits(us);
      setCharges(c);
      setIssues(i);
      setOrders(o);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organizationId]);

  const ledger = useMemo(() => summarizeEstateLedger(charges), [charges]);
  const openIssues = issues.filter((x) => !["resolved", "closed"].includes(x.status));
  const openOrders = orders.filter((x) => !["completed", "cancelled"].includes(x.status));
  const vacant = units.filter((x) => !x.status || x.status !== "active").length;
  const currency = estates[0]?.currency || "GHS";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 space-y-3">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            </Card>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="p-6 h-48 rounded-xl border border-border bg-muted/40 animate-pulse" />
          <div className="p-6 h-48 rounded-xl border border-border bg-muted/40 animate-pulse" />
        </div>
      </div>
    );
  }

  const risks: Array<{ label: string; severity: "critical" | "warning" | "info" }> = [
    ...(ledger.overdueMinor > 0
      ? [{ label: `${money(ledger.overdueMinor, currency)} in overdue payments requiring collection`, severity: "critical" as const }]
      : []),
    ...(openIssues.filter((x) => x.priority === "urgent").length > 0
      ? [{ label: `${openIssues.filter((x) => x.priority === "urgent").length} urgent maintenance issue(s) awaiting response`, severity: "critical" as const }]
      : []),
    ...(openOrders.filter((x) => !x.scheduled_for).length > 0
      ? [{ label: `${openOrders.filter((x) => !x.scheduled_for).length} work order(s) not yet scheduled with an artisan`, severity: "warning" as const }]
      : []),
    ...(vacant > 0
      ? [{ label: `${vacant} unit(s) currently vacant and available for occupancy`, severity: "info" as const }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Command Center</h1>
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                Live Monitoring
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time portfolio overview, operational health, arrears tracking, and maintenance dispatch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={Building2}
          label="Estates / Units"
          value={`${estates.length} / ${units.length}`}
          sublabel={`${vacant} vacant units`}
          color="primary"
        />
        <Metric
          icon={CircleDollarSign}
          label="Outstanding / Overdue"
          value={money(ledger.totalOutstandingMinor, currency)}
          sublabel={`Overdue: ${money(ledger.overdueMinor, currency)}`}
          color={ledger.overdueMinor > 0 ? "rose" : "emerald"}
        />
        <Metric
          icon={Wrench}
          label="Open Issues / Work Orders"
          value={`${openIssues.length} / ${openOrders.length}`}
          sublabel={`${openIssues.filter((x) => x.priority === "urgent").length} urgent issues`}
          color={openIssues.filter((x) => x.priority === "urgent").length > 0 ? "amber" : "primary"}
        />
        <Metric
          icon={AlertTriangle}
          label="Current Arrears"
          value={money(ledger.aging.current, currency)}
          sublabel="Current cycle balance"
          color="amber"
        />
      </div>

      {/* Priority Risks + Daily Brief */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Action Items & Operational Flags
            </h2>
            <Badge variant="outline" className="text-xs">
              {risks.length} {risks.length === 1 ? "Item" : "Items"}
            </Badge>
          </div>
          <div className="space-y-2.5">
            {risks.length ? (
              risks.map((risk, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-xs ${
                    risk.severity === "critical"
                      ? "bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-300"
                      : risk.severity === "warning"
                      ? "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-300"
                      : "bg-surface-subtle border-surface-border text-foreground"
                  }`}
                >
                  <AlertTriangle
                    className={`h-4 w-4 shrink-0 mt-0.5 ${
                      risk.severity === "critical"
                        ? "text-rose-500"
                        : risk.severity === "warning"
                        ? "text-amber-500"
                        : "text-blue-500"
                    }`}
                  />
                  <span className="font-medium leading-relaxed">{risk.label}</span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center rounded-xl bg-surface-subtle border border-surface-border text-xs text-muted-foreground flex flex-col items-center justify-center gap-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <p className="font-semibold text-foreground">Everything looks good</p>
                <p>No active alerts, critical arrears, or unscheduled work orders.</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-foreground text-sm mb-4">Today's Operational Summary</h2>
          <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
            <div className="p-3 rounded-xl bg-surface-subtle border border-surface-border">
              <p className="font-medium text-foreground">Financial Status</p>
              <p className="mt-1">
                {ledger.overdueMinor > 0
                  ? `${money(ledger.overdueMinor, currency)} in overdue rent & service charges requires collection follow-up.`
                  : "All accounts are in good standing with zero overdue charges."}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface-subtle border border-surface-border">
              <p className="font-medium text-foreground">Maintenance Operations</p>
              <p className="mt-1">
                {openIssues.length} open issue(s) and {openOrders.length} active work order(s) currently being dispatched or serviced.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface-subtle border border-surface-border">
              <p className="font-medium text-foreground">Portfolio Monitoring</p>
              <p className="mt-1">
                All {estates.length} managed estates ({units.length} total units) are actively monitored by the REOS core system.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Open Maintenance Queue */}
      {openIssues.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              Active Maintenance Queue
            </h2>
            <Badge variant="outline" className="text-xs">
              Showing top {Math.min(openIssues.length, 10)}
            </Badge>
          </div>
          <div className="space-y-2">
            {openIssues.slice(0, 10).map((issue) => (
              <div
                key={issue.id}
                className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-surface-hover transition-colors"
              >
                <div>
                  <span className="text-xs font-semibold text-foreground">{issue.title}</span>
                  {issue.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{issue.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={issue.priority === "urgent" ? "destructive" : "outline"}
                    className="capitalize text-[10px]"
                  >
                    {issue.priority}
                  </Badge>
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {issue.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}


import { useEffect, useMemo, useState } from "react";
import {
  BarChart4,
  TrendingUp,
  Building2,
  ArrowUpRight,
  DollarSign,
  Users,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { estateOperationsService, type ManagedEstate } from "../../../lib/estate-operations.service";
import { summarizeEstateLedger } from "../../../lib/estate-ledger";
import { estateReportingService, type BudgetVariance } from "../../../lib/estate-reporting.service";
import {
  filterEstatesByPropertyScope,
  type MemberScopeProps,
  withMemberScopeDefaults,
} from "../../../lib/member-scope";

const money = (minor = 0, currency = "GHS") =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);

export function PortfolioAnalytics({
  organizationId,
  scopeMode = "organization",
  scopedPropertyIds = null,
  bypassPropertyScope = false,
}: { organizationId?: string } & MemberScopeProps) {
  const [loading, setLoading] = useState(true);
  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [unitCounts, setUnitCounts] = useState<Record<string, number>>({});
  const [estateLedger, setEstateLedger] = useState<Record<string, ReturnType<typeof summarizeEstateLedger>>>({});
  const [portfolioReport, setPortfolioReport] = useState<Awaited<
    ReturnType<typeof estateReportingService.portfolioFinancialReport>
  > | null>(null);
  const [budgetRows, setBudgetRows] = useState<BudgetVariance[]>([]);

  const periodStart = useMemo(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    []
  );
  const periodEnd = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        setLoading(true);
        const scope = withMemberScopeDefaults({ scopeMode, scopedPropertyIds, bypassPropertyScope });
        const estateRows = filterEstatesByPropertyScope(
          await estateOperationsService.getEstates(organizationId),
          scope.scopeMode,
          scope.scopedPropertyIds,
          scope.bypassPropertyScope,
        );
        const units = await estateOperationsService.getUnits(estateRows.map((e) => e.id));
        const charges = await estateOperationsService.getCharges(units.map((u) => u.id));

        const counts: Record<string, number> = {};
        for (const unit of units) {
          counts[unit.estate_id] = (counts[unit.estate_id] || 0) + 1;
        }

        const ledgerByEstate: Record<string, ReturnType<typeof summarizeEstateLedger>> = {};
        for (const estate of estateRows) {
          const estateUnitIds = new Set(units.filter((u) => u.estate_id === estate.id).map((u) => u.id));
          const estateCharges = charges.filter((c) => estateUnitIds.has(c.unit_id));
          ledgerByEstate[estate.id] = summarizeEstateLedger(estateCharges);
        }

        const [report, budgets] = await Promise.all([
          estateReportingService.portfolioFinancialReport(organizationId, periodStart, periodEnd),
          estateReportingService.organizationBudgetVariance(organizationId),
        ]);

        setEstates(estateRows);
        setUnitCounts(counts);
        setEstateLedger(ledgerByEstate);
        setPortfolioReport(report);
        setBudgetRows(budgets.slice(0, 8));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, [organizationId, periodStart, periodEnd, scopeMode, scopedPropertyIds, bypassPropertyScope]);

  const currency = estates[0]?.currency || "GHS";
  const totalUnits = Object.values(unitCounts).reduce((sum, n) => sum + n, 0);
  const totalOutstanding = Object.values(estateLedger).reduce(
    (sum, ledger) => sum + (ledger.totalOutstandingMinor || 0),
    0
  );
  const totalOverdue = Object.values(estateLedger).reduce((sum, ledger) => sum + (ledger.overdueMinor || 0), 0);

  if (!organizationId) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Open portfolio analytics from a workspace to load live estate data.
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading portfolio analytics...
      </div>
    );
  }

  const metrics = [
    {
      title: "Properties / units",
      value: `${estates.length} / ${totalUnits}`,
      change: `${estates.length} managed estate(s)`,
      icon: Building2,
    },
    {
      title: "Net income (MTD)",
      value: money(portfolioReport?.netIncomeMinor || 0, currency),
      change: `Revenue ${money(portfolioReport?.revenueMinor || 0, currency)}`,
      icon: TrendingUp,
    },
    {
      title: "Outstanding receivables",
      value: money(totalOutstanding, currency),
      change: `${money(totalOverdue, currency)} overdue`,
      icon: DollarSign,
    },
    {
      title: "Net cash flow (MTD)",
      value: money(portfolioReport?.netCashFlowMinor || 0, currency),
      change: `In ${money(portfolioReport?.cashInflowsMinor || 0, currency)} · Out ${money(portfolioReport?.cashOutflowsMinor || 0, currency)}`,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart4 className="h-6 w-6 text-emerald-500" />
            <h1 className="text-xl font-bold tracking-tight">Portfolio Performance</h1>
            <Badge variant="outline">Live ledger</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Financial summary across all managed properties · {periodStart} to {periodEnd}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.title} className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs">{m.title}</span>
                <Icon className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-xl font-bold font-mono">{m.value}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                <span>{m.change}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-x-auto" role="region" aria-label="Estate operating breakdown" tabIndex={0}>
        <div className="p-3 border-b border-border text-xs font-semibold">Estate operating breakdown</div>
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
            <tr>
              <th className="p-3">Estate</th>
              <th className="p-3 text-center">Units</th>
              <th className="p-3 text-right">Outstanding</th>
              <th className="p-3 text-right">Overdue</th>
            </tr>
          </thead>
          <tbody>
            {estates.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  No managed estates in this organization yet.
                </td>
              </tr>
            ) : (
              estates.map((estate) => {
                const ledger = estateLedger[estate.id];
                return (
                  <tr key={estate.id} className="border-b border-border/60">
                    <td className="p-3 font-medium">{estate.name}</td>
                    <td className="p-3 text-center">{unitCounts[estate.id] || 0}</td>
                    <td className="p-3 text-right font-mono">{money(ledger?.totalOutstandingMinor || 0, estate.currency || currency)}</td>
                    <td className="p-3 text-right font-mono text-rose-600">{money(ledger?.overdueMinor || 0, estate.currency || currency)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      {budgetRows.length > 0 ? (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold text-sm">Budget vs actual (recent)</h2>
          </div>
          <div className="space-y-2">
            {budgetRows.map((row) => (
              <div key={`${row.category}-${row.period}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-xs">
                <span>{row.category} · {row.period}</span>
                <span className="font-mono">
                  Budget {money(row.budgetMinor, row.currency)} · Actual {money(row.actualMinor, row.currency)}
                  {row.variancePercent !== null ? ` (${row.variancePercent.toFixed(1)}%)` : ""}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

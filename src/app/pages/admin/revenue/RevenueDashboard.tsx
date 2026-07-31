import { useEffect, useState } from "react";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/badge";
import {
  revenueManagementService,
  type RevenueDashboardMetrics,
} from "../../../../lib/revenue-management.service";

function formatMoney(minor: number, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-2">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
    </Card>
  );
}

function BarChart({
  title,
  series,
  valueKey,
  labelKey,
}: {
  title: string;
  series: Array<Record<string, string | number>>;
  valueKey: string;
  labelKey: string;
}) {
  const max = Math.max(...series.map((item) => Number(item[valueKey] || 0)), 1);

  return (
    <Card className="p-5 space-y-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="space-y-3">
        {series.map((item) => {
          const value = Number(item[valueKey] || 0);
          const width = `${Math.max(4, (value / max) * 100)}%`;
          return (
            <div key={String(item[labelKey])}>
              <div className="flex justify-between text-sm mb-1">
                <span>{String(item[labelKey])}</span>
                <span>{formatMoney(value)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function RevenueDashboard() {
  const [metrics, setMetrics] = useState<RevenueDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void revenueManagementService
      .getDashboardMetrics()
      .then(setMetrics)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading revenue dashboard…</Card>;
  }

  if (!metrics) {
    return <Card className="p-8 text-center text-muted-foreground">Unable to load revenue metrics.</Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Revenue Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Live platform revenue, balances, and transaction activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today's Revenue" value={formatMoney(metrics.todayRevenueMinor)} hint={`${metrics.transactionCountToday} transactions`} />
        <MetricCard label="This Month" value={formatMoney(metrics.monthRevenueMinor)} hint={`${metrics.transactionCountMonth} transactions`} />
        <MetricCard label="Recurring Revenue (MRR est.)" value={formatMoney(metrics.recurringRevenueMinor)} hint={`${metrics.activeSubscriptions} active plans`} />
        <MetricCard label="Pending Payouts" value={formatMoney(metrics.pendingPayoutsMinor)} />
        <MetricCard label="Escrow Balance" value={formatMoney(metrics.escrowBalanceMinor)} />
        <MetricCard label="Wallet Balance" value={formatMoney(metrics.walletBalanceMinor)} />
        <MetricCard label="Platform Commission" value={formatMoney(metrics.platformCommissionMinor)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BarChart title="Monthly revenue" series={metrics.monthlySeries} valueKey="amountMinor" labelKey="month" />
        <BarChart title="Daily transactions (last 7 days)" series={metrics.dailySeries} valueKey="amountMinor" labelKey="day" />
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">Top revenue sources</h3>
        {metrics.topSources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No successful transactions yet this month.</p>
        ) : (
          <div className="space-y-3">
            {metrics.topSources.map((source) => (
              <div key={source.source} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {source.source.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{source.count} txns</span>
                </div>
                <span className="font-medium">{formatMoney(source.amountMinor)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Calendar,
  Layers,
  Scale,
  TrendingUp,
  Landmark,
  CheckCircle2,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import { generalLedgerService } from "../../../lib/general-ledger.service";
import { chartOfAccountsService } from "../../../lib/chart-of-accounts.service";
import { estateReportingService } from "../../../lib/estate-reporting.service";

const money = (pesewas: number = 0) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(pesewas / 100);

export function FinancialStatementsViewer({
  organizationId,
}: {
  organizationId?: string;
}) {
  const [tab, setTab] = useState<"trial" | "pl" | "balance" | "cash">("trial");
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10)
  );

  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [incomeReport, setIncomeReport] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);

  const loadStatements = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      if (tab === "trial") {
        const data = await generalLedgerService.getTrialBalance(
          organizationId,
          asOfDate
        );
        setTrialBalance(data || []);
      } else if (tab === "pl" || tab === "cash") {
        const report = await estateReportingService.getOrganizationIncomeStatement(
          organizationId,
          startDate,
          asOfDate
        );
        setIncomeReport(report);
      } else if (tab === "balance") {
        const sheet = await generalLedgerService.getBalanceSheet(
          organizationId,
          asOfDate
        );
        setBalanceSheet(sheet);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate financial statement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatements();
  }, [organizationId, tab, asOfDate, startDate]);

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (tab === "trial") {
      if (trialBalance.length === 0) return;
      headers = ["Account Code", "Account Name", "Debit (GHS)", "Credit (GHS)", "Net Balance"];
      rows = trialBalance.map((r) => [
        r.account_code,
        r.account_name,
        ((r.debit_balance_minor || 0) / 100).toFixed(2),
        ((r.credit_balance_minor || 0) / 100).toFixed(2),
        ((r.net_balance_minor || 0) / 100).toFixed(2),
      ]);
    } else if (tab === "pl") {
      if (!incomeReport) return;
      headers = ["Metric", "Amount (GHS)"];
      rows = [
        ["Revenue", ((incomeReport.revenue_minor || 0) / 100).toFixed(2)],
        ["Expenses", ((incomeReport.expense_minor || 0) / 100).toFixed(2)],
        ["Net income", ((incomeReport.net_income_minor || 0) / 100).toFixed(2)],
        ["Cash inflows", ((incomeReport.cash_inflows_minor || 0) / 100).toFixed(2)],
        ["Cash outflows", ((incomeReport.cash_outflows_minor || 0) / 100).toFixed(2)],
      ];
    } else if (tab === "cash") {
      if (!incomeReport) return;
      headers = ["Metric", "Amount (GHS)"];
      const inflows = incomeReport.cash_inflows_minor || 0;
      const outflows = incomeReport.cash_outflows_minor || 0;
      rows = [
        ["Cash inflows", (inflows / 100).toFixed(2)],
        ["Cash outflows", (outflows / 100).toFixed(2)],
        ["Net cash flow", ((inflows - outflows) / 100).toFixed(2)],
      ];
    } else {
      if (!balanceSheet) return;
      headers = ["Category", "Account Code", "Account Name", "Balance (GHS)"];
      rows = (["ASSET", "LIABILITY", "EQUITY"] as const).flatMap((category) => {
        const section =
          category === "ASSET"
            ? balanceSheet.assets || []
            : category === "LIABILITY"
              ? balanceSheet.liabilities || []
              : balanceSheet.equity || [];
        return section.map((r: any) => [
          category,
          r.account_code,
          r.account_name,
          ((r.net_balance_minor || 0) / 100).toFixed(2),
        ]);
      });
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Financial_Statement_${tab}_${asOfDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalDebitMinor = trialBalance.reduce(
    (sum, r) => sum + (r.debit_balance_minor || 0),
    0
  );
  const totalCreditMinor = trialBalance.reduce(
    (sum, r) => sum + (r.credit_balance_minor || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Financial Statements & Reporting
          </h1>
          <p className="text-sm text-ink-muted">
            Auditable Trial Balance, Income Statement (P&L), Balance Sheet, and Cash Flow.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={tab === "trial" ? "primary" : "outline"}
            onClick={() => setTab("trial")}
            size="sm"
          >
            <Scale className="w-4 h-4 mr-1.5" />
            Trial Balance
          </Button>
          <Button
            variant={tab === "pl" ? "primary" : "outline"}
            onClick={() => setTab("pl")}
            size="sm"
          >
            <TrendingUp className="w-4 h-4 mr-1.5" />
            Profit & Loss (P&L)
          </Button>
          <Button
            variant={tab === "balance" ? "primary" : "outline"}
            onClick={() => setTab("balance")}
            size="sm"
          >
            <Landmark className="w-4 h-4 mr-1.5" />
            Balance Sheet
          </Button>
          <Button
            variant={tab === "cash" ? "primary" : "outline"}
            onClick={() => setTab("cash")}
            size="sm"
          >
            <Layers className="w-4 h-4 mr-1.5" />
            Cash Flow
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-subtle/60 p-4 rounded-xl border border-surface-border">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {(tab === "pl" || tab === "cash") && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink-muted">From:</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-muted">
                {tab === "pl" || tab === "cash" ? "To:" : "As of Date:"}
              </span>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadStatements}
              disabled={loading}
              className="h-8 text-xs"
            >
              Refresh
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-ink-muted">
            Generating statement from ledger...
          </div>
        ) : tab === "trial" ? (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-surface-border rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle border-b border-surface-border text-xs uppercase text-ink-muted font-semibold">
                  <tr>
                    <th className="px-4 py-3">Account Code</th>
                    <th className="px-4 py-3">Account Name</th>
                    <th className="px-4 py-3 text-right">Debit (GHS)</th>
                    <th className="px-4 py-3 text-right">Credit (GHS)</th>
                    <th className="px-4 py-3 text-right">Net Position</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {trialBalance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-ink-muted">
                        No transactions recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    trialBalance.map((r, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover/50">
                        <td className="px-4 py-3 font-mono font-bold text-ink">
                          {r.account_code}
                        </td>
                        <td className="px-4 py-3 text-ink">{r.account_name}</td>
                        <td className="px-4 py-3 font-mono text-right text-ink">
                          {money(r.debit_balance_minor || 0)}
                        </td>
                        <td className="px-4 py-3 font-mono text-right text-ink">
                          {money(r.credit_balance_minor || 0)}
                        </td>
                        <td className="px-4 py-3 font-mono text-right font-medium text-ink">
                          {money(r.net_balance_minor || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-surface-subtle font-mono text-xs font-bold border-t border-surface-border">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-ink">
                      TOTALS
                    </td>
                    <td className="px-4 py-3 text-right text-ink">
                      {money(totalDebitMinor)}
                    </td>
                    <td className="px-4 py-3 text-right text-ink">
                      {money(totalCreditMinor)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600">
                      {Math.abs(totalDebitMinor - totalCreditMinor) === 0 ? (
                        <span className="flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Balanced (0.00)
                        </span>
                      ) : (
                        <span className="text-rose-600">
                          Out of balance by {money(Math.abs(totalDebitMinor - totalCreditMinor))}
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : tab === "pl" ? (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="border border-surface-border rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-ink text-base">Income Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                  <div className="text-xs text-ink-muted">Gross Revenues</div>
                  <div className="text-lg font-bold text-emerald-600 font-mono">
                    {money(incomeReport?.revenue_minor || 0)}
                  </div>
                </div>
                <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/20">
                  <div className="text-xs text-ink-muted">Operating Expenses</div>
                  <div className="text-lg font-bold text-rose-600 font-mono">
                    {money(incomeReport?.expense_minor || 0)}
                  </div>
                </div>
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="text-xs text-ink-muted">Net Operating Income</div>
                  <div className="text-lg font-bold text-primary font-mono">
                    {money(
                      (incomeReport?.revenue_minor || 0) -
                        (incomeReport?.expense_minor || 0)
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : tab === "cash" ? (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="border border-surface-border rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-ink text-base">Cash Flow Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                  <div className="text-xs text-ink-muted">Cash Inflows</div>
                  <div className="text-lg font-bold text-emerald-600 font-mono">
                    {money(incomeReport?.cash_inflows_minor || 0)}
                  </div>
                </div>
                <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/20">
                  <div className="text-xs text-ink-muted">Cash Outflows</div>
                  <div className="text-lg font-bold text-rose-600 font-mono">
                    {money(incomeReport?.cash_outflows_minor || 0)}
                  </div>
                </div>
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="text-xs text-ink-muted">Net Cash Flow</div>
                  <div className="text-lg font-bold text-primary font-mono">
                    {money(
                      (incomeReport?.cash_inflows_minor || 0) -
                        (incomeReport?.cash_outflows_minor || 0)
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-ink-muted">
                Derived from settled payments (inflows) and paid vendor bills and disbursements (outflows) within the
                selected period.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {balanceSheet && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-surface-border bg-surface-subtle/60">
                  <div className="text-xs text-ink-muted">Total Assets</div>
                  <div className="text-lg font-bold font-mono">{money(balanceSheet.totalAssetsMinor || 0)}</div>
                </div>
                <div className="p-3 rounded-xl border border-surface-border bg-surface-subtle/60">
                  <div className="text-xs text-ink-muted">Total Liabilities</div>
                  <div className="text-lg font-bold font-mono">{money(balanceSheet.totalLiabilitiesMinor || 0)}</div>
                </div>
                <div className="p-3 rounded-xl border border-surface-border bg-surface-subtle/60">
                  <div className="text-xs text-ink-muted">Total Equity</div>
                  <div className="text-lg font-bold font-mono">{money(balanceSheet.totalEquityMinor || 0)}</div>
                </div>
              </div>
            )}
            <div className="overflow-x-auto border border-surface-border rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle border-b border-surface-border text-xs uppercase text-ink-muted font-semibold">
                  <tr>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {(["ASSET", "LIABILITY", "EQUITY"] as const).flatMap((category) => {
                    const rows =
                      category === "ASSET"
                        ? balanceSheet?.assets || []
                        : category === "LIABILITY"
                        ? balanceSheet?.liabilities || []
                        : balanceSheet?.equity || [];
                    return rows.map((r: any, idx: number) => (
                      <tr key={`${category}-${idx}`}>
                        <td className="px-4 py-3 font-mono text-xs text-ink-muted">{category}</td>
                        <td className="px-4 py-3 text-ink">
                          <span className="font-mono font-bold mr-2">{r.account_code}</span>
                          {r.account_name}
                        </td>
                        <td className="px-4 py-3 font-mono text-right text-ink font-semibold">
                          {money(r.net_balance_minor || 0)}
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

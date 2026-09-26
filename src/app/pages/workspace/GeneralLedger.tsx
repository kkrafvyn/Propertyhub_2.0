import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  CalendarClock,
  Loader2,
  Plus,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { DesktopOnlyGate, useSurface } from "../../context/SurfaceContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import {
  generalLedgerService,
  isClosedPeriodError,
} from "../../../lib/general-ledger.service";
import { estateReportingService } from "../../../lib/estate-reporting.service";

type JournalLine = {
  accountId: string;
  debit: string;
  credit: string;
  description: string;
};

type PeriodForm = {
  name: string;
  start: string;
  end: string;
  fiscalYear: string;
  notes: string;
};

const money = (amount = 0) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(Number(amount) / 100);

const today = new Date().toISOString().slice(0, 10);

export function GeneralLedger({ organizationId }: { organizationId?: string }) {
  const { user } = useAuth();
  const { isDesktop } = useSurface();
  const [tab, setTab] = useState<"accounts" | "journals" | "periods" | "trial" | "reports">(
    "accounts"
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [trial, setTrial] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [budgetVariance, setBudgetVariance] = useState<any[]>([]);
  const [reportDates, setReportDates] = useState({ start: today.slice(0, 8) + "01", end: today });
  const [reportLoading, setReportLoading] = useState(false);
  const [account, setAccount] = useState({
    code: "",
    name: "",
    type: "ASSET",
    balance: "DEBIT",
  });
  const [entry, setEntry] = useState({
    date: today,
    description: "",
    reference: "",
    lines: [
      { accountId: "", debit: "", credit: "", description: "" },
      { accountId: "", debit: "", credit: "", description: "" },
    ] as JournalLine[],
  });
  const [periodForm, setPeriodForm] = useState<PeriodForm>({
    name: "",
    start: today,
    end: today,
    fiscalYear: new Date().getFullYear().toString(),
    notes: "",
  });

  const load = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [coa, journalsData, trialData, periodsData] = await Promise.all([
        generalLedgerService.getChartOfAccounts(organizationId),
        generalLedgerService.getJournalEntries(organizationId),
        generalLedgerService.getTrialBalance(organizationId),
        generalLedgerService.getAccountingPeriods(organizationId),
      ]);
      setAccounts(coa || []);
      setJournals(journalsData || []);
      setTrial(trialData || []);
      setPeriods(periodsData || []);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load ledger data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const totals = useMemo(
    () =>
      entry.lines.reduce(
        (sum, line) => ({
          debit: sum.debit + Math.round(Number(line.debit || 0) * 100),
          credit: sum.credit + Math.round(Number(line.credit || 0) * 100),
        }),
        { debit: 0, credit: 0 }
      ),
    [entry.lines]
  );

  const currentOpenPeriod = useMemo(
    () =>
      periods.find((period) => period.status === "OPEN") ||
      periods[0] ||
      null,
    [periods]
  );

  const createAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (!organizationId || !user?.id || !account.code || !account.name) return;

    try {
      setSaving(true);
      await generalLedgerService.createAccount(organizationId, {
        organization_id: organizationId,
        account_code: account.code,
        account_name: account.name,
        account_type: account.type,
        balance_type: account.balance,
        parent_account_id: null,
        description: null,
        created_by: user.id,
      });
      setAccount({ code: "", name: "", type: "ASSET", balance: "DEBIT" });
      toast.success("Ledger account created.");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Unable to create account.");
    } finally {
      setSaving(false);
    }
  };

  const createJournal = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !organizationId ||
      !user?.id ||
      !entry.description ||
      totals.debit !== totals.credit ||
      totals.debit <= 0 ||
      entry.lines.some((line) => !line.accountId)
    ) {
      toast.error("Enter a balanced journal with an account on every line.");
      return;
    }

    try {
      setSaving(true);
      const journal = await generalLedgerService.createJournalEntry(organizationId, {
        entryDate: entry.date,
        description: entry.description,
        referenceNumber: entry.reference,
        createdBy: user.id,
        lines: entry.lines.map((line) => ({
          accountId: line.accountId,
          debitAmount:
            Math.round(Number(line.debit || 0) * 100) || undefined,
          creditAmount:
            Math.round(Number(line.credit || 0) * 100) || undefined,
          description: line.description,
        })),
      });
      await generalLedgerService.postJournalEntry(journal.id, user.id);
      toast.success("Balanced journal posted and locked.");
      setEntry({
        ...entry,
        description: "",
        reference: "",
        lines: entry.lines.map(() => ({
          accountId: "",
          debit: "",
          credit: "",
          description: "",
        })),
      });
      await load();
    } catch (error: any) {
      if (isClosedPeriodError(error)) {
        toast.error("That date is in a closed accounting period.");
      } else {
        toast.error(error?.message || "Unable to post journal.");
      }
    } finally {
      setSaving(false);
    }
  };

  const updateLine = (
    index: number,
    field: keyof JournalLine,
    value: string
  ) =>
    setEntry({
      ...entry,
      lines: entry.lines.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      ),
    });

  const createPeriod = async (event: FormEvent) => {
    event.preventDefault();
    if (!organizationId || !user?.id || !periodForm.name || !periodForm.start || !periodForm.end) {
      return;
    }

    try {
      setSaving(true);
      await generalLedgerService.createAccountingPeriod(organizationId, {
        periodName: periodForm.name,
        periodStart: periodForm.start,
        periodEnd: periodForm.end,
        fiscalYear: Number(periodForm.fiscalYear) || undefined,
        notes: periodForm.notes || undefined,
        createdBy: user.id,
      });
      toast.success("Accounting period created.");
      setPeriodForm({
        name: "",
        start: today,
        end: today,
        fiscalYear: new Date().getFullYear().toString(),
        notes: "",
      });
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Unable to create accounting period.");
    } finally {
      setSaving(false);
    }
  };

  const closePeriod = async (periodId: string) => {
    if (!user?.id) return;
    try {
      setSaving(true);
      await generalLedgerService.closeAccountingPeriod(periodId, user.id);
      toast.success("Accounting period closed.");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Unable to close accounting period.");
    } finally {
      setSaving(false);
    }
  };

  const loadReport = async () => {
    if (!organizationId) return;
    try {
      setReportLoading(true);
      const [financialReport, variance] = await Promise.all([
        estateReportingService.portfolioFinancialReport(organizationId, reportDates.start, reportDates.end),
        estateReportingService.organizationBudgetVariance(organizationId),
      ]);
      setReport(financialReport);
      setBudgetVariance(variance);
    } catch (error: any) {
      toast.error(error?.message || "Unable to load financial reports.");
    } finally {
      setReportLoading(false);
    }
  };

  const downloadAuditPack = async () => {
    if (!organizationId) return;
    try {
      const csv = await estateReportingService.exportPortfolioAuditPack(organizationId, reportDates.start, reportDates.end);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `portfolio-audit-pack-${reportDates.start}-${reportDates.end}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.message || "Unable to export audit pack.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading ledger...
      </div>
    );
  }

  const desktopFallback = (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6 text-sm text-amber-200">
      <div className="flex items-center gap-2 font-semibold text-amber-300">
        <AlertCircle className="h-4 w-4" />
        Desktop-only module
      </div>
      <p className="mt-2 text-amber-100/80">
        General Ledger is available on the desktop experience to protect high-risk accounting actions.
      </p>
    </div>
  );

  return (
    <DesktopOnlyGate fallback={desktopFallback}>
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold">General Ledger</h1>
        </div>
        <p className="max-w-3xl text-muted-foreground">
          Double-entry accounting with chart of accounts, journal control, period
          locking, and a live trial balance. Once a period is closed, no entries can
          be posted into it.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["accounts", "journals", "periods", "trial", "reports"] as const).map((key) => (
          <Button
            key={key}
            size="sm"
            variant={tab === key ? "default" : "outline"}
            onClick={() => setTab(key)}
            className="capitalize"
          >
            {key === "trial" ? "Trial balance" : key === "reports" ? "Reports" : key}
          </Button>
        ))}
      </div>

      {tab === "accounts" && (
        <>
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">Add chart account</h2>
                <p className="text-sm text-muted-foreground">
                  Create clean accounts for rent, owner equity, deposits, payables,
                  and service revenue.
                </p>
              </div>
              <Badge variant="outline">{accounts.length} active accounts</Badge>
            </div>

            <form className="mt-4 grid gap-3 md:grid-cols-5" onSubmit={createAccount}>
              <Input
                placeholder="Code (e.g. 1010)"
                value={account.code}
                onChange={(e) => setAccount({ ...account, code: e.target.value })}
              />
              <Input
                placeholder="Account name"
                value={account.name}
                onChange={(e) => setAccount({ ...account, name: e.target.value })}
              />
              <select
                className="rounded-lg border border-border bg-input-background px-3 py-2"
                value={account.type}
                onChange={(e) => setAccount({ ...account, type: e.target.value })}
              >
                {["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
              <select
                className="rounded-lg border border-border bg-input-background px-3 py-2"
                value={account.balance}
                onChange={(e) => setAccount({ ...account, balance: e.target.value })}
              >
                <option>DEBIT</option>
                <option>CREDIT</option>
              </select>
              <Button disabled={saving}>
                <Plus className="h-4 w-4" />
                Add account
              </Button>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b p-4 text-sm text-muted-foreground">
              Accounts are organized by code so finance users can scan the ledger
              quickly.
            </div>
            <div className="divide-y">
              {accounts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div>
                    <span className="font-mono text-primary">{item.account_code}</span>
                    <span className="ml-3 font-medium">{item.account_name}</span>
                  </div>
                  <Badge variant="outline">{item.account_type}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {tab === "journals" && (
        <>
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">Post a balanced journal</h2>
                <p className="text-sm text-muted-foreground">
                  Draft the entry, post it, and the system locks it automatically.
                </p>
              </div>
              {currentOpenPeriod ? (
                <Badge variant="outline">
                  Open period: {currentOpenPeriod.period_name}
                </Badge>
              ) : (
                <Badge variant="destructive">No open accounting period</Badge>
              )}
            </div>

            <form className="mt-4 space-y-3" onSubmit={createJournal}>
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  type="date"
                  value={entry.date}
                  onChange={(e) => setEntry({ ...entry, date: e.target.value })}
                />
                <Input
                  placeholder="Reference"
                  value={entry.reference}
                  onChange={(e) => setEntry({ ...entry, reference: e.target.value })}
                />
                <Input
                  placeholder="Journal description"
                  value={entry.description}
                  onChange={(e) => setEntry({ ...entry, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                {entry.lines.map((line, index) => (
                  <div className="grid gap-2 md:grid-cols-4" key={index}>
                    <select
                      className="rounded-lg border border-border bg-input-background px-3 py-2"
                      value={line.accountId}
                      onChange={(e) =>
                        updateLine(index, "accountId", e.target.value)
                      }
                    >
                      <option value="">Account</option>
                      {accounts.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.account_code} · {item.account_name}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Debit"
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.debit}
                      onChange={(e) => updateLine(index, "debit", e.target.value)}
                    />
                    <Input
                      placeholder="Credit"
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.credit}
                      onChange={(e) => updateLine(index, "credit", e.target.value)}
                    />
                    <Input
                      placeholder="Line note"
                      value={line.description}
                      onChange={(e) =>
                        updateLine(index, "description", e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setEntry({
                      ...entry,
                      lines: [
                        ...entry.lines,
                        { accountId: "", debit: "", credit: "", description: "" },
                      ],
                    })
                  }
                >
                  Add line
                </Button>
                <span
                  className={
                    totals.debit === totals.credit && totals.debit > 0
                      ? "text-sm text-green-600"
                      : "text-sm text-destructive"
                  }
                >
                  Debit {money(totals.debit)} · Credit {money(totals.credit)}
                </span>
                <Button
                  disabled={
                    saving || totals.debit !== totals.credit || totals.debit <= 0
                  }
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Post & lock
                </Button>
              </div>
            </form>
          </Card>

          <Card className="divide-y">
            {journals.map((journal) => (
              <div
                className="flex items-center justify-between gap-3 p-4"
                key={journal.id}
              >
                <div>
                  <p className="font-medium">{journal.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {journal.entry_date} · {journal.reference_number || "No reference"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{journal.status}</Badge>
                  {journal.status === "POSTED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => {
                        if (user?.id) {
                          void generalLedgerService
                            .reverseJournalEntry(journal.id, user.id)
                            .then(() => {
                              toast.success("Reversal posted.");
                              void load();
                            })
                            .catch((error) => {
                              if (isClosedPeriodError(error)) {
                                toast.error(
                                  "The reversal date is in a closed accounting period."
                                );
                              } else {
                                toast.error("Unable to reverse entry.");
                              }
                            });
                        }
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reverse
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {tab === "periods" && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">Accounting periods</h2>
                <p className="text-sm text-muted-foreground">
                  Close the books by month or quarter, then keep them locked.
                </p>
              </div>
              <Badge variant="outline">{periods.length} periods</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {periods.map((period) => (
                <div
                  key={period.id}
                  className="rounded-xl border border-border/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-primary" />
                        <h3 className="font-medium">{period.period_name}</h3>
                        <Badge
                          variant={period.status === "OPEN" ? "default" : "secondary"}
                        >
                          {period.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {period.period_start} to {period.period_end}
                        {period.fiscal_year ? ` · FY ${period.fiscal_year}` : ""}
                      </p>
                      {period.notes ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {period.notes}
                        </p>
                      ) : null}
                    </div>

                    {period.status === "OPEN" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={() => void closePeriod(period.id)}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Close period
                      </Button>
                    ) : (
                      <Badge variant="outline">Locked</Badge>
                    )}
                  </div>
                </div>
              ))}

              {!periods.length && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No periods yet. Create the first period on the right.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold">Create a new period</h2>
                <p className="text-sm text-muted-foreground">
                  Make the workflow obvious for finance users: define the window first,
                  then close it when the books are ready.
                </p>
              </div>
            </div>

            <form className="mt-4 space-y-3" onSubmit={createPeriod}>
              <Input
                placeholder="Period name"
                value={periodForm.name}
                onChange={(e) =>
                  setPeriodForm({ ...periodForm, name: e.target.value })
                }
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="date"
                  value={periodForm.start}
                  onChange={(e) =>
                    setPeriodForm({ ...periodForm, start: e.target.value })
                  }
                />
                <Input
                  type="date"
                  value={periodForm.end}
                  onChange={(e) =>
                    setPeriodForm({ ...periodForm, end: e.target.value })
                  }
                />
              </div>
              <Input
                placeholder="Fiscal year"
                type="number"
                value={periodForm.fiscalYear}
                onChange={(e) =>
                  setPeriodForm({ ...periodForm, fiscalYear: e.target.value })
                }
              />
              <Input
                placeholder="Notes"
                value={periodForm.notes}
                onChange={(e) =>
                  setPeriodForm({ ...periodForm, notes: e.target.value })
                }
              />
              <Button disabled={saving || !periodForm.name}>
                <Plus className="h-4 w-4" />
                Create period
              </Button>
            </form>
          </Card>
        </div>
      )}

      {tab === "trial" && (
        <Card className="overflow-hidden">
          <div className="border-b p-4">
            <h2 className="font-semibold">Trial balance</h2>
            <p className="text-sm text-muted-foreground">
              Posted journals only. The balance view reflects the current open books.
            </p>
          </div>
          <div className="divide-y">
            {trial.map((row) => (
              <div key={row.account_id} className="grid grid-cols-3 gap-3 p-4 text-sm">
                <span>
                  {row.account_code} · {row.account_name}
                </span>
                <span className="text-right">Dr {money(row.debit_minor)}</span>
                <span className="text-right">Cr {money(row.credit_minor)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "reports" && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-semibold">Portfolio financial reports</h2>
                <p className="text-sm text-muted-foreground">Posted journals across the organization, with budget visibility for managed estates.</p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-muted-foreground">From<Input type="date" value={reportDates.start} onChange={(e) => setReportDates({ ...reportDates, start: e.target.value })} /></label>
                <label className="text-xs text-muted-foreground">To<Input type="date" value={reportDates.end} onChange={(e) => setReportDates({ ...reportDates, end: e.target.value })} /></label>
                <Button onClick={() => void loadReport()} disabled={reportLoading}>{reportLoading ? "Loading..." : "Run report"}</Button>
                <Button variant="outline" onClick={() => void downloadAuditPack()} disabled={!report}>Export CSV</Button>
              </div>
            </div>
          </Card>

          {report && <Card className="p-4 text-sm space-y-2"><p>Generated {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : 'just now'} ? {report.lines.length} source ledger lines. CSV includes journal and line IDs for reconciliation.</p>
            {!!report.unbalancedEntryIds?.length && <p role="alert" className="text-destructive">{report.unbalancedEntryIds.length} posted journals do not balance. Resolve these exceptions before using the totals.</p>}
          </Card>}
          {report ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Revenue", report.revenueMinor],
                ["Expenses", report.expenseMinor],
                ["Net income", report.netIncomeMinor],
                ["Cash inflows", report.cashInflowsMinor],
                ["Cash outflows", report.cashOutflowsMinor],
                ["Net cash flow", report.netCashFlowMinor],
              ].map(([label, value]) => (
                <Card className="p-5" key={label as string}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{money(value as number)}</p></Card>
              ))}
            </div>
          ) : <Card className="p-8 text-center text-sm text-muted-foreground">Run a report to view portfolio results.</Card>}

          <Card className="overflow-hidden">
            <div className="border-b p-4"><h2 className="font-semibold">Budget variance</h2></div>
            {budgetVariance.length ? budgetVariance.map((row) => (
              <div className="grid gap-2 border-b p-4 text-sm md:grid-cols-5" key={`${row.category}-${row.period}`}>
                <span>{row.category}</span><span>{row.period}</span><span>Budget {money(row.budgetMinor)}</span><span>Actual {money(row.actualMinor)}</span><span className={row.varianceMinor < 0 ? "text-destructive" : "text-green-600"}>{money(row.varianceMinor)} variance</span>
              </div>
            )) : <p className="p-6 text-sm text-muted-foreground">No budgets found for the managed estates.</p>}
          </Card>
        </div>
      )}
    </div>
    </DesktopOnlyGate>
  );
}

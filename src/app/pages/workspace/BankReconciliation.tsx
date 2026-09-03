import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { BadgeCheck, Landmark, Loader2, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input } from "@/app/components/ui/Input";
import { Badge } from "@/app/components/ui/badge";
import { organizationService } from "@/lib/organization.service";
import { estateOperationsService, type ManagedEstate } from "@/lib/estate-operations.service";
import { bankReconciliationService } from "@/lib/bank-reconciliation.service";
import { getSupportedBankFeedProviders } from "@/lib/bank-feed-providers";
import { supabase } from "@/lib/supabase";

type BankAccount = {
  id: string;
  bank_name?: string | null;
  account_number?: string | null;
  account_holder_name?: string | null;
  currency?: string | null;
  opening_balance_minor?: number | null;
  gl_account_id?: string | null;
};

type BankStatement = {
  id: string;
  bank_account_id: string;
  statement_date?: string | null;
  opening_balance_minor?: number | null;
  closing_balance_minor?: number | null;
  currency?: string | null;
  total_debits_minor?: number | null;
  total_credits_minor?: number | null;
  transaction_count?: number | null;
  reconciliation_completed?: boolean | null;
  reconciled_at?: string | null;
};

type BankTransaction = {
  id: string;
  statement_id: string;
  transaction_date?: string | null;
  description?: string | null;
  amount_minor?: number | null;
  transaction_type?: string | null;
  bank_reference?: string | null;
  line_sequence?: number | null;
  is_matched?: boolean | null;
  matched_to_payment_id?: string | null;
};

type ReconciliationVariance = {
  id: string;
  statement_id: string;
  variance_type?: string | null;
  variance_amount_minor?: number | null;
  description?: string | null;
  resolution_status?: string | null;
  resolved_at?: string | null;
};

const money = (amount = 0, currency = "GHS") =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(amount / 100);

type BankReconciliationProps = {
  organizationId?: string;
  currentUserId?: string;
};

type TransactionDraft = {
  date: string;
  description: string;
  amount: string;
  type: "DEBIT" | "CREDIT";
  reference: string;
};

function parseBankFeedCsv(content: string): TransactionDraft[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  const header = lines[0].toLowerCase().split(",").map((item) => item.trim());
  const dateIndex = header.findIndex((item) => ["date", "transaction_date", "posted_date"].includes(item));
  const descriptionIndex = header.findIndex((item) => ["description", "narration", "details"].includes(item));
  const amountIndex = header.findIndex((item) => ["amount", "value", "debit", "credit"].includes(item));
  const typeIndex = header.findIndex((item) => ["type", "direction", "dr_cr"].includes(item));
  const referenceIndex = header.findIndex((item) => ["reference", "bank_reference", "ref"].includes(item));

  return lines.slice(1).map((line) => {
    const columns = line.split(",").map((item) => item.trim().replace(/^"|"$/g, ""));
    const amountCell = columns[amountIndex] || "0";
    const rawType = (columns[typeIndex] || "").toUpperCase();
    const amount = Number(amountCell.replace(/[^0-9.-]/g, "")) || 0;
    const inferredType =
      rawType.includes("CREDIT") || rawType === "CR" || amountCell.startsWith("+")
        ? "CREDIT"
        : rawType.includes("DEBIT") || rawType === "DR" || amountCell.startsWith("-")
          ? "DEBIT"
          : amount >= 0
            ? "DEBIT"
            : "CREDIT";

    return {
      date: columns[dateIndex] || new Date().toISOString().slice(0, 10),
      description: columns[descriptionIndex] || "Imported bank line",
      amount: String(Math.abs(amount)),
      type: inferredType,
      reference: columns[referenceIndex] || "",
    };
  });
}

export function BankReconciliation({ organizationId, currentUserId }: BankReconciliationProps) {
  const { user } = useAuth();
  const { organizationSlug } = useParams();
  const [resolvedOrganizationId, setResolvedOrganizationId] = useState(organizationId || "");
  const [organizationName, setOrganizationName] = useState("");
  const [resolvingOrg, setResolvingOrg] = useState(!organizationId && !!organizationSlug);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedStatementId, setSelectedStatementId] = useState("");
  const [selectedTransactions, setSelectedTransactions] = useState<BankTransaction[]>([]);
  const [variances, setVariances] = useState<ReconciliationVariance[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const [accountForm, setAccountForm] = useState({
    bankName: "",
    accountNumber: "",
    holderName: "",
    currency: "GHS",
    openingBalance: "0",
    glAccountId: "",
  });
  const [statementForm, setStatementForm] = useState({
    statementDate: new Date().toISOString().slice(0, 10),
    openingBalance: "0",
    closingBalance: "0",
    currency: "GHS",
  });
  const [rows, setRows] = useState<TransactionDraft[]>([
    {
      date: new Date().toISOString().slice(0, 10),
      description: "",
      amount: "",
      type: "DEBIT",
      reference: "",
    },
  ]);
  const [varianceForm, setVarianceForm] = useState({
    type: "BANK_FEE",
    amount: "",
    description: "",
  });
  const [feedFileName, setFeedFileName] = useState("");
  const [feedConnections, setFeedConnections] = useState<Array<{ id: string; provider: string; provider_account_id: string; status: string; last_synced_at?: string | null }>>([]);
  const [feedProvider, setFeedProvider] = useState("gtbank");
  const [feedProviderAccountId, setFeedProviderAccountId] = useState("");
  const [syncingFeedId, setSyncingFeedId] = useState<string | null>(null);
  const [paymentCandidates, setPaymentCandidates] = useState<Array<{ id: string; amount_minor?: number | null; received_at?: string | null; provider_reference?: string | null; payment_reference?: string | null }>>([]);
  const [matchingTxnId, setMatchingTxnId] = useState<string | null>(null);

  const actorId = currentUserId || user?.id || "";
  const selectedAccount = bankAccounts.find((item) => item.id === selectedAccountId);
  const selectedStatement = statements.find((item) => item.id === selectedStatementId);

  useEffect(() => {
    let cancelled = false;

    if (organizationId) {
      setResolvedOrganizationId(organizationId);
      setResolvingOrg(false);
      return () => {
        cancelled = true;
      };
    }

    if (!organizationSlug) {
      setResolvingOrg(false);
      setError("Open bank reconciliation from a workspace to load live account data.");
      return () => {
        cancelled = true;
      };
    }

    setResolvingOrg(true);
    void (async () => {
      try {
        const organization = await organizationService.getOrganizationBySlug(organizationSlug);
        if (cancelled) return;
        setResolvedOrganizationId(organization.id);
        setOrganizationName(organization.name);
        setError("");
      } catch (failure: any) {
        if (!cancelled) {
          setResolvedOrganizationId("");
          setOrganizationName("");
          setError(failure?.message || "We could not resolve this organization.");
        }
      } finally {
        if (!cancelled) setResolvingOrg(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId, organizationSlug]);

  const load = async () => {
    if (!resolvedOrganizationId) return;
    try {
      setLoading(true);
      const estateRows = await estateOperationsService.getEstates(resolvedOrganizationId);
      const { data: accountRows, error: accountError } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("organization_id", resolvedOrganizationId)
        .order("created_at", { ascending: false });
      if (accountError) throw accountError;

      const { data: statementRows, error: statementError } = await supabase
        .from("bank_statements")
        .select("*")
        .eq("organization_id", resolvedOrganizationId)
        .order("statement_date", { ascending: false });
      if (statementError) throw statementError;

      setEstates(estateRows);
      setBankAccounts((accountRows || []) as BankAccount[]);
      setStatements((statementRows || []) as BankStatement[]);

      setSelectedAccountId((current) => current || (accountRows || [])[0]?.id || "");
      setSelectedStatementId((current) => current || (statementRows || [])[0]?.id || "");

      setStatementForm((current) => ({
        ...current,
        currency: estateRows[0]?.currency || current.currency,
      }));

      if (selectedStatementId || (statementRows || [])[0]?.id) {
        await loadStatementDetails(selectedStatementId || (statementRows || [])[0]?.id);
      } else {
        setSelectedTransactions([]);
        setVariances([]);
        setSummary(null);
      }

      const candidates = await bankReconciliationService.getOrganizationPaymentCandidates(resolvedOrganizationId);
      setPaymentCandidates(candidates);
      const connections = await bankReconciliationService.getBankFeedConnections(resolvedOrganizationId);
      setFeedConnections(connections || []);
    } catch (failure: any) {
      console.error(failure);
      toast.error(failure?.message || "Unable to load reconciliation data.");
    } finally {
      setLoading(false);
    }
  };

  const loadStatementDetails = async (statementId: string) => {
    if (!statementId) {
      setSelectedTransactions([]);
      setVariances([]);
      setSummary(null);
      return;
    }

    try {
      const [summaryRow, varianceRows, transactionRows] = await Promise.all([
        bankReconciliationService.getReconciliationSummary(statementId),
        bankReconciliationService.getReconciliationVariances(statementId),
        supabase
          .from("bank_transactions")
          .select("*")
          .eq("statement_id", statementId)
          .order("line_sequence", { ascending: true }),
      ]);

      setSummary(summaryRow);
      setVariances((varianceRows || []) as ReconciliationVariance[]);
      setSelectedTransactions((transactionRows.data || []) as BankTransaction[]);
    } catch (failure: any) {
      console.error(failure);
      toast.error(failure?.message || "Unable to open the selected statement.");
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedOrganizationId]);

  useEffect(() => {
    if (!selectedStatementId) return;
    void loadStatementDetails(selectedStatementId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatementId]);

  const completedCount = useMemo(
    () => selectedTransactions.filter((item) => item.is_matched).length,
    [selectedTransactions]
  );
  const unresolvedVariances = variances.filter((item) => (item.resolution_status || "PENDING") !== "RESOLVED");
  const matchRate = summary?.matchRate || "0%";

  const submit = async (work: () => Promise<any>, success: string) => {
    try {
      setSaving(true);
      await work();
      toast.success(success);
      await load();
    } catch (failure: any) {
      console.error(failure);
      toast.error(failure?.message || "Unable to save this reconciliation step.");
    } finally {
      setSaving(false);
    }
  };

  const createBankAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    const openingBalance = Math.round(Number(accountForm.openingBalance || 0) * 100);
    if (!accountForm.bankName.trim() || !accountForm.accountNumber.trim() || !accountForm.holderName.trim()) return;

    await submit(
      () =>
        bankReconciliationService.createBankAccount(resolvedOrganizationId, {
          bankName: accountForm.bankName,
          accountNumber: accountForm.accountNumber,
          accountHolderName: accountForm.holderName,
          currency: accountForm.currency,
          openingBalance,
          glAccountId: accountForm.glAccountId || undefined,
          createdBy: actorId,
        }),
      "Bank account created."
    );

    setAccountForm({ bankName: "", accountNumber: "", holderName: "", currency: "GHS", openingBalance: "0", glAccountId: "" });
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      {
        date: statementForm.statementDate,
        description: "",
        amount: "",
        type: "DEBIT",
        reference: "",
      },
    ]);
  };

  const importBankFeedFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    const parsedRows = parseBankFeedCsv(content);
    if (parsedRows.length === 0) {
      toast.error("The bank feed file did not contain any usable rows.");
      return;
    }

    setFeedFileName(file.name);
    setRows(parsedRows);
    setStatementForm((current) => ({
      ...current,
      statementDate: parsedRows[0]?.date || current.statementDate,
    }));
    toast.success(`${parsedRows.length} bank feed line(s) imported.`);
  };

  const updateRow = (index: number, field: keyof TransactionDraft, value: string) => {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  };

  const removeRow = (index: number) => {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const uploadStatement = async (event: React.FormEvent) => {
    event.preventDefault();
    const bankAccountId = selectedAccountId;
    if (!bankAccountId || rows.length === 0) return;

    const openingBalance = Math.round(Number(statementForm.openingBalance || 0) * 100);
    const closingBalance = Math.round(Number(statementForm.closingBalance || 0) * 100);
    const transactions = rows
      .filter((row) => row.description.trim() && Number(row.amount) > 0)
      .map((row) => ({
        date: row.date,
        description: row.description,
        amount: Math.round(Number(row.amount) * 100),
        type: row.type,
        reference: row.reference || undefined,
      }));

    if (transactions.length === 0) {
      toast.error("Add at least one transaction line.");
      return;
    }

    await submit(
      () =>
        bankReconciliationService.uploadBankStatement(resolvedOrganizationId, bankAccountId, {
          statementDate: statementForm.statementDate,
          openingBalance,
          closingBalance,
          currency: statementForm.currency,
          transactions,
          uploadedBy: actorId,
        }),
      "Bank statement uploaded."
    );

    setRows([
      {
        date: statementForm.statementDate,
        description: "",
        amount: "",
        type: "DEBIT",
        reference: "",
      },
    ]);
  };

  const autoMatch = async () => {
    if (!selectedStatementId) return;
    await submit(
      () => bankReconciliationService.autoMatchTransactions(selectedStatementId),
      "Automatic matching completed."
    );
  };

  const completeStatement = async () => {
    if (!selectedStatementId) return;
    if (summary && Number(summary.unmatchedTransactions || 0) > 0) {
      toast.error("Resolve unmatched transactions before closing the statement.");
      return;
    }
    if (unresolvedVariances.length > 0) {
      toast.error("Resolve all open variances before closing the statement.");
      return;
    }

    await submit(
      () => bankReconciliationService.completeReconciliation(selectedStatementId, actorId),
      "Bank reconciliation completed."
    );
  };

  const createVariance = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStatementId || !varianceForm.description.trim()) return;
    const amount = Math.round(Number(varianceForm.amount || 0) * 100);
    if (amount === 0) return;

    await submit(
      () =>
        bankReconciliationService.createVariance(selectedStatementId, {
          varianceType: varianceForm.type,
          varianceAmount: amount,
          description: varianceForm.description,
        }),
      "Variance recorded."
    );

    setVarianceForm({ type: "BANK_FEE", amount: "", description: "" });
  };

  const resolveVariance = async (varianceId: string) => {
    await submit(
      () => bankReconciliationService.resolveVariance(varianceId, "Reviewed and resolved in workspace.", actorId),
      "Variance resolved."
    );
  };

  const manualMatch = async (transactionId: string, paymentId: string) => {
    await submit(
      async () => {
        setMatchingTxnId(transactionId);
        await bankReconciliationService.manualMatchTransaction(transactionId, paymentId, actorId);
      },
      "Transaction matched manually."
    );
    setMatchingTxnId(null);
  };

  if (loading || resolvingOrg) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading bank reconciliation...
      </div>
    );
  }

  if (!resolvedOrganizationId) {
    return (
      <Card className="p-8 text-center">
        <Landmark className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-2xl font-semibold">Bank Reconciliation</h1>
        <p className="mt-2 text-muted-foreground">{error || "Open this module from a workspace to continue."}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-subtle p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Bank Reconciliation</h1>
                <p className="text-sm text-muted-foreground">
                  Load bank accounts, upload a statement, match transactions, and close it when finance is clean.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{organizationName || "Live organization"}</Badge>
              <Badge variant="outline">{bankAccounts.length} bank account(s)</Badge>
              <Badge variant="outline">{statements.length} statement(s)</Badge>
              {selectedStatement && <Badge variant="outline">{matchRate} match rate</Badge>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={saving}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Accounts</p>
          <p className="mt-2 text-2xl font-semibold">{bankAccounts.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Statements</p>
          <p className="mt-2 text-2xl font-semibold">{statements.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Matched lines</p>
          <p className="mt-2 text-2xl font-semibold">{completedCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Open variances</p>
          <p className="mt-2 text-2xl font-semibold">{unresolvedVariances.length}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Create bank account</h2>
          </div>
          <form className="mt-4 space-y-3" onSubmit={createBankAccount}>
            <Input
              placeholder="Bank name"
              value={accountForm.bankName}
              onChange={(event) => setAccountForm({ ...accountForm, bankName: event.target.value })}
            />
            <Input
              placeholder="Account number"
              value={accountForm.accountNumber}
              onChange={(event) => setAccountForm({ ...accountForm, accountNumber: event.target.value })}
            />
            <Input
              placeholder="Account holder name"
              value={accountForm.holderName}
              onChange={(event) => setAccountForm({ ...accountForm, holderName: event.target.value })}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Currency"
                value={accountForm.currency}
                onChange={(event) => setAccountForm({ ...accountForm, currency: event.target.value })}
              />
              <Input
                placeholder="Opening balance"
                type="number"
                step="0.01"
                value={accountForm.openingBalance}
                onChange={(event) => setAccountForm({ ...accountForm, openingBalance: event.target.value })}
              />
            </div>
            <Input
              placeholder="Linked GL account ID"
              value={accountForm.glAccountId}
              onChange={(event) => setAccountForm({ ...accountForm, glAccountId: event.target.value })}
            />
            <Button disabled={saving}>
              <Plus className="h-4 w-4" />
              Save account
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Account register</h2>
          </div>
          <div className="mt-4 space-y-3">
            {bankAccounts.length ? (
              bankAccounts.map((account) => (
                <button
                  key={account.id}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    selectedAccountId === account.id ? "border-primary bg-primary/5" : "border-border bg-transparent"
                  }`}
                  onClick={() => setSelectedAccountId(account.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{account.bank_name || "Bank account"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {account.account_holder_name || "No holder"} · {account.account_number || "No number"}
                      </p>
                    </div>
                    <Badge variant="outline">{account.currency || "GHS"}</Badge>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No bank accounts yet.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Upload statement</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the bank statement manually for now. No provider keys are required.
          </p>
          <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-subtle p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Import bank feed CSV</p>
                <p className="text-sm text-muted-foreground">
                  Upload a bank export with date, description, amount, type, and reference columns.
                </p>
              </div>
              {feedFileName && <Badge variant="outline">{feedFileName}</Badge>}
            </div>
            <div className="mt-3">
              <Input type="file" accept=".csv,text/csv" onChange={importBankFeedFile} />
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-border bg-surface-subtle p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">Live bank feed sync</p>
                <p className="text-sm text-muted-foreground">
                  Connect GTBank, Fidelity, Monzo, or other feeds. Demo transactions import automatically when provider keys are not configured.
                </p>
              </div>
              <Badge variant="outline">Code-complete</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <select
                className="rounded-lg border border-border bg-input-background px-3 py-2 text-sm"
                value={feedProvider}
                onChange={(e) => setFeedProvider(e.target.value)}
              >
                {getSupportedBankFeedProviders().map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Provider account ID"
                value={feedProviderAccountId}
                onChange={(e) => setFeedProviderAccountId(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!selectedAccountId || !feedProviderAccountId.trim() || !actorId}
                onClick={() => {
                  void (async () => {
                    try {
                      await bankReconciliationService.connectBankFeed({
                        organizationId: resolvedOrganizationId,
                        bankAccountId: selectedAccountId,
                        provider: feedProvider,
                        providerAccountId: feedProviderAccountId.trim(),
                        createdBy: actorId,
                      });
                      toast.success("Bank feed connected.");
                      await load();
                    } catch (failure: any) {
                      toast.error(failure?.message || "Unable to connect bank feed.");
                    }
                  })();
                }}
              >
                Connect feed
              </Button>
            </div>
            {feedConnections.length > 0 ? (
              <div className="space-y-2">
                {feedConnections.map((connection) => (
                  <div key={connection.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium capitalize">{connection.provider.replace(/-/g, " ")}</p>
                      <p className="text-muted-foreground">
                        {connection.provider_account_id} · {connection.status}
                        {connection.last_synced_at
                          ? ` · Last sync ${new Date(connection.last_synced_at).toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={syncingFeedId === connection.id}
                      onClick={() => {
                        void (async () => {
                          try {
                            setSyncingFeedId(connection.id);
                            const result = await bankReconciliationService.syncBankFeed(connection.id);
                            toast.success(
                              `Synced ${result.imported ?? 0} transaction(s)${(result as { simulated?: boolean }).simulated ? " (demo feed)" : ""}.`
                            );
                            await load();
                          } catch (failure: any) {
                            toast.error(failure?.message || "Bank feed sync failed.");
                          } finally {
                            setSyncingFeedId(null);
                          }
                        })();
                      }}
                    >
                      {syncingFeedId === connection.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1" /> Sync now
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No live feeds connected yet.</p>
            )}
          </div>
          <form className="mt-4 space-y-3" onSubmit={uploadStatement}>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="rounded-lg border border-border bg-input-background px-3 py-2"
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
              >
                <option value="">Select bank account</option>
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bank_name || "Bank"} · {account.account_number || account.id}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                value={statementForm.statementDate}
                onChange={(event) => setStatementForm({ ...statementForm, statementDate: event.target.value })}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                type="number"
                step="0.01"
                placeholder="Opening balance"
                value={statementForm.openingBalance}
                onChange={(event) => setStatementForm({ ...statementForm, openingBalance: event.target.value })}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Closing balance"
                value={statementForm.closingBalance}
                onChange={(event) => setStatementForm({ ...statementForm, closingBalance: event.target.value })}
              />
              <Input
                placeholder="Currency"
                value={statementForm.currency}
                onChange={(event) => setStatementForm({ ...statementForm, currency: event.target.value })}
              />
            </div>
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={index} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[1fr_2fr_1fr_1fr_auto]">
                  <Input type="date" value={row.date} onChange={(event) => updateRow(index, "date", event.target.value)} />
                  <Input
                    placeholder="Description"
                    value={row.description}
                    onChange={(event) => updateRow(index, "description", event.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(event) => updateRow(index, "amount", event.target.value)}
                  />
                  <select
                    className="rounded-lg border border-border bg-input-background px-3 py-2"
                    value={row.type}
                    onChange={(event) => updateRow(index, "type", event.target.value)}
                  >
                    <option value="DEBIT">Debit</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                  <Button type="button" variant="outline" onClick={() => removeRow(index)} disabled={rows.length === 1}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={addRow}>
                Add line
              </Button>
              <Button type="submit" disabled={saving || !selectedAccountId}>
                Upload statement
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Statements</h2>
          </div>
          <div className="mt-4 space-y-3">
            {statements.length ? (
              statements.map((statement) => (
                <button
                  key={statement.id}
                  type="button"
                  onClick={() => setSelectedStatementId(statement.id)}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    selectedStatementId === statement.id ? "border-primary bg-primary/5" : "border-border bg-transparent"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{statement.statement_date || "Statement"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {money(statement.opening_balance_minor || 0, statement.currency || "GHS")} to{" "}
                        {money(statement.closing_balance_minor || 0, statement.currency || "GHS")}
                      </p>
                    </div>
                    <Badge variant="outline">{statement.reconciliation_completed ? "Completed" : "Open"}</Badge>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No bank statements yet.</p>
            )}
          </div>
        </Card>
      </div>

      {selectedStatement && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Selected statement</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedAccount?.bank_name || "Bank"} · {selectedStatement.statement_date}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => void autoMatch()} disabled={saving}>
                  Auto match
                </Button>
                <Button size="sm" onClick={() => void completeStatement()} disabled={saving}>
                  Close statement
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="mt-2 text-xl font-semibold">{selectedTransactions.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Matched</p>
                <p className="mt-2 text-xl font-semibold">{completedCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Unmatched</p>
                <p className="mt-2 text-xl font-semibold">{Number(summary?.unmatchedTransactions || 0)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Variances</p>
                <p className="mt-2 text-xl font-semibold">{unresolvedVariances.length}</p>
              </Card>
            </div>

            <div className="mt-4 space-y-2">
              {selectedTransactions.length ? (
                selectedTransactions.map((txn) => (
                  <div key={txn.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                    <div>
                      <p className="font-medium">{txn.description || "Transaction"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {txn.transaction_date || "No date"} · {txn.bank_reference || "No reference"}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="font-medium">{money(Math.abs(txn.amount_minor || 0), selectedStatement.currency || "GHS")}</p>
                      <Badge variant="outline" className="mt-2">
                        {txn.is_matched ? "Matched" : "Open"}
                      </Badge>
                      {!txn.is_matched && paymentCandidates.length > 0 ? (
                        <select
                          className="mt-2 w-full max-w-[220px] rounded-lg border border-border bg-input-background px-2 py-1 text-xs"
                          defaultValue=""
                          disabled={matchingTxnId === txn.id || saving}
                          onChange={(event) => {
                            const paymentId = event.target.value;
                            if (paymentId) void manualMatch(txn.id, paymentId);
                            event.target.value = "";
                          }}
                        >
                          <option value="">Match to payment…</option>
                          {paymentCandidates.map((payment) => (
                            <option key={payment.id} value={payment.id}>
                              {money(Math.abs(payment.amount_minor || 0), selectedStatement.currency || "GHS")} ·{" "}
                              {(payment.provider_reference || payment.payment_reference || payment.id).slice(0, 12)}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No statement lines uploaded yet for this statement.</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Variance review</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Keep bank-side differences visible until a person resolves them.
            </p>
            <form className="mt-4 space-y-3" onSubmit={createVariance}>
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  className="rounded-lg border border-border bg-input-background px-3 py-2"
                  value={varianceForm.type}
                  onChange={(event) => setVarianceForm({ ...varianceForm, type: event.target.value })}
                >
                  <option value="BANK_FEE">Bank fee</option>
                  <option value="TIMING">Timing difference</option>
                  <option value="MISSING_PAYMENT">Missing payment</option>
                  <option value="UNIDENTIFIED">Unidentified line</option>
                </select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Variance amount"
                  value={varianceForm.amount}
                  onChange={(event) => setVarianceForm({ ...varianceForm, amount: event.target.value })}
                />
                <Button disabled={saving}>Record variance</Button>
              </div>
              <Input
                placeholder="What needs review?"
                value={varianceForm.description}
                onChange={(event) => setVarianceForm({ ...varianceForm, description: event.target.value })}
              />
            </form>

            <div className="mt-4 space-y-2">
              {variances.length ? (
                variances.map((variance) => (
                  <div key={variance.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{variance.variance_type || "Variance"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{variance.description || "No description"}</p>
                      </div>
                      <Badge variant="outline">{variance.resolution_status || "PENDING"}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span>{money(variance.variance_amount_minor || 0, selectedStatement.currency || "GHS")}</span>
                      {(variance.resolution_status || "PENDING") !== "RESOLVED" && (
                        <Button size="sm" variant="outline" onClick={() => void resolveVariance(variance.id)} disabled={saving}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No variances logged yet.</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

import { Textarea } from "@/app/components/ui/textarea";
import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Trash2,
  Search,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import {
  generalLedgerService,
  isClosedPeriodError,
} from "../../../lib/general-ledger.service";
import {
  chartOfAccountsService,
  type CoaAccount,
} from "../../../lib/chart-of-accounts.service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { useAuth } from "../../context/AuthContext";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";

type LineDraft = {
  accountId: string;
  debit: string;
  credit: string;
  description: string;
};

export function JournalEntryManager({
  organizationId,
}: {
  organizationId?: string;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"list" | "create">("list");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<CoaAccount[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [reversalTargetId, setReversalTargetId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversing, setReversing] = useState(false);

  // Create Form
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([
    { accountId: "", debit: "", credit: "", description: "" },
    { accountId: "", debit: "", credit: "", description: "" },
  ]);

  const loadData = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      setLoadError(null);
      const [accs, jes] = await Promise.all([
        chartOfAccountsService.listAccounts(organizationId, { isActive: true }),
        generalLedgerService.getJournalEntries(organizationId),
      ]);
      setAccounts(accs);
      setJournals(jes);
    } catch (err: any) {
      const message = err.message || "Failed to load journal entries";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const totalDebit = lines.reduce(
    (sum, l) => sum + (parseFloat(l.debit) || 0),
    0
  );
  const totalCredit = lines.reduce(
    (sum, l) => sum + (parseFloat(l.credit) || 0),
    0
  );
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  const handleAddLine = () => {
    setLines([
      ...lines,
      { accountId: "", debit: "", credit: "", description: "" },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) {
      toast.error("A journal entry requires at least 2 lines.");
      return;
    }
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (
    idx: number,
    field: keyof LineDraft,
    val: string
  ) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: val };

    // Mutually exclusive debit / credit
    if (field === "debit" && val) {
      updated[idx].credit = "";
    } else if (field === "credit" && val) {
      updated[idx].debit = "";
    }

    setLines(updated);
  };

  const handleCreate = async (postImmediately = false) => {
    if (!organizationId) return;
    if (!isBalanced) {
      toast.error("Debits and credits must balance before saving.");
      return;
    }
    if (lines.some((l) => !l.accountId)) {
      toast.error("Every line must have an assigned account.");
      return;
    }

    try {
      setSaving(true);
      const payloadLines = lines.map((l) => ({
        accountId: l.accountId,
        debitAmount: Math.round((parseFloat(l.debit) || 0) * 100),
        creditAmount: Math.round((parseFloat(l.credit) || 0) * 100),
        description: l.description || description,
      }));

      if (!organizationId || !user?.id) {
        toast.error("Organization and user context are required.");
        return;
      }

      const je = await generalLedgerService.createJournalEntry(organizationId, {
        entryDate,
        description,
        referenceNumber: reference || undefined,
        createdBy: user.id,
        lines: payloadLines,
      });

      if (postImmediately) {
        await generalLedgerService.postJournalEntry(je.id, user?.id || "");
        toast.success("Journal Entry posted directly to general ledger.");
      } else {
        toast.success("Draft Journal Entry created.");
      }

      // Reset form
      setDescription("");
      setReference("");
      setLines([
        { accountId: "", debit: "", credit: "", description: "" },
        { accountId: "", debit: "", credit: "", description: "" },
      ]);
      setTab("list");
      loadData();
    } catch (err: any) {
      if (isClosedPeriodError(err)) {
        toast.error(
          "Cannot post to closed accounting period. Please adjust entry date."
        );
      } else {
        toast.error(err.message || "Failed to create journal entry");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async (id: string) => {
    try {
      await generalLedgerService.postJournalEntry(id, user?.id || "");
      toast.success("Journal entry posted to general ledger");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to post entry");
    }
  };

  const handleConfirmReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTargetId || !reversalReason.trim()) {
      toast.error("Please provide a reason for the journal reversal.");
      return;
    }
    setReversing(true);
    try {
      await generalLedgerService.reverseJournalEntry(reversalTargetId, user?.id || "");
      toast.success("Offset reversal entry posted successfully");
      setReversalTargetId(null);
      setReversalReason("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reverse entry");
    } finally {
      setReversing(false);
    }
  };

  const filteredJournals = journals.filter((j) => {
    if (statusFilter === "ALL") return true;
    return j.status === statusFilter;
  });

  const queryPhase = loadError ? "error" : loading ? "loading" : "ready";

  return (
    <WorkspacePageShell
      tone="finance"
      title="Journal Entries"
      description="Manage draft, posted, and reversed double-entry general ledger records."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant={tab === "list" ? "primary" : "outline"}
            onClick={() => setTab("list")}
            size="sm"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Entries List
          </Button>
          <Button
            variant={tab === "create" ? "primary" : "outline"}
            onClick={() => setTab("create")}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Entry
          </Button>
        </div>
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => void loadData()}
      >
    <div className="space-y-6">

      {tab === "list" && (
        <Card className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {["ALL", "DRAFT", "POSTED", "REVERSED"].map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                  className="text-xs"
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-ink-muted">
              Loading entries...
            </div>
          ) : filteredJournals.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-ink-muted opacity-40" />
              <p className="text-ink-muted">No journal entries found.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTab("create")}
              >
                Create your first journal entry
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-surface-border rounded-xl" role="region" aria-label="Journal entries" tabIndex={0}>
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle border-b border-surface-border text-xs uppercase text-ink-muted font-semibold">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Lines</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredJournals.map((j) => (
                    <tr key={j.id} className="hover:bg-surface-hover/50">
                      <td className="px-4 py-3 font-mono text-xs text-ink">
                        {j.entry_date}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                        {j.reference_number || "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink max-w-sm truncate">
                        {j.description}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted">
                        {j.journal_entry_lines?.length || 0} lines
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            j.status === "POSTED"
                              ? "bg-emerald-500/10 text-emerald-600 border-none"
                              : j.status === "REVERSED"
                              ? "bg-rose-500/10 text-rose-600 border-none"
                              : "bg-amber-500/10 text-amber-600 border-none"
                          }
                        >
                          {j.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        {j.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePost(j.id)}
                            className="text-emerald-600 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Post
                          </Button>
                        )}
                        {j.status === "POSTED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReversalTargetId(j.id);
                              setReversalReason("");
                            }}
                            className="text-amber-600 hover:bg-amber-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Reverse
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "create" && (
        <Card className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="border-b border-surface-border pb-3">
            <h2 className="text-lg font-bold text-ink">New Journal Entry</h2>
            <p className="text-xs text-ink-muted">
              Enter balanced debit and credit allocations across active Chart of Accounts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Entry Date *
              </label>
              <Input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Reference / Invoice #
              </label>
              <Input
                placeholder="e.g. JE-2026-08-001"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Description *
              </label>
              <Input
                required
                placeholder="e.g. Monthly Accrual for Utilities"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-ink-muted">
                Line Items
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddLine}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Row
              </Button>
            </div>

            <div className="overflow-x-auto border border-surface-border rounded-xl" role="region" aria-label="Journal entry lines" tabIndex={0}>
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle border-b border-surface-border text-xs uppercase text-ink-muted font-semibold">
                  <tr>
                    <th className="px-3 py-2 w-1/3">Account *</th>
                    <th className="px-3 py-2 w-1/4">Debit (GHS)</th>
                    <th className="px-3 py-2 w-1/4">Credit (GHS)</th>
                    <th className="px-3 py-2">Line Memo</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {lines.map((line, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <NativeSelectControl
                          className="w-full px-2 py-1.5 rounded-lg border border-surface-border bg-surface text-ink text-xs"
                          value={line.accountId}
                          onChange={(e) =>
                            handleLineChange(idx, "accountId", e.target.value)
                          }
                        >
                          <option value="">Select Account...</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.account_code} — {a.account_name}
                            </option>
                          ))}
                        </NativeSelectControl>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={line.debit}
                          onChange={(e) =>
                            handleLineChange(idx, "debit", e.target.value)
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={line.credit}
                          onChange={(e) =>
                            handleLineChange(idx, "credit", e.target.value)
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          placeholder="Optional memo"
                          value={line.description}
                          onChange={(e) =>
                            handleLineChange(idx, "description", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-ink-muted hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-subtle/50 font-mono text-xs font-bold border-t border-surface-border">
                  <tr>
                    <td className="px-3 py-2.5 text-ink-muted">TOTALS</td>
                    <td className="px-3 py-2.5 text-ink">
                      GH₵ {totalDebit.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-ink">
                      GH₵ {totalCredit.toFixed(2)}
                    </td>
                    <td colSpan={2} className="px-3 py-2.5">
                      {isBalanced ? (
                        <span className="text-emerald-600 flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Balanced
                        </span>
                      ) : (
                        <span className="text-rose-600 flex items-center gap-1 text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Out of balance by GH₵{" "}
                          {Math.abs(totalDebit - totalCredit).toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTab("list")}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving || !isBalanced}
              onClick={() => handleCreate(false)}
            >
              Save Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={saving || !isBalanced}
              onClick={() => handleCreate(true)}
            >
              Post to Ledger
            </Button>
          </div>
        </Card>
      )}

      {/* Journal Reversal Dialog */}
      <Dialog open={Boolean(reversalTargetId)} onOpenChange={(open) => !open && setReversalTargetId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reverse Journal Entry</DialogTitle>
            <DialogDescription>
              Create an offsetting debit/credit entry to reverse this posted transaction in the general ledger.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmReverse} className="space-y-4 pt-2">
            <div>
              <label htmlFor="reversal-reason" className="block text-xs font-semibold text-ink mb-1.5">
                Reason for Reversal
              </label>
              <Textarea
                id="reversal-reason"
                rows={3}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Inadvertent duplicate entry, incorrect account allocation..."
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-hidden focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReversalTargetId(null)}
                disabled={reversing}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="destructive" disabled={reversing || !reversalReason.trim()}>
                {reversing ? "Posting Reversal..." : "Reverse Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}

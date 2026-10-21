import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FolderTree,
  Plus,
  Archive,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Search,
  BookOpen,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import {
  chartOfAccountsService,
  type CoaAccount,
  type AccountType,
  type BalanceType,
} from "../../../lib/chart-of-accounts.service";
import {
  seedChartOfAccounts,
  type CoaTemplateName,
} from "../../../lib/coa-templates";
import { useAuth } from "../../context/AuthContext";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";

export function ChartOfAccountsAdmin({
  organizationId,
}: {
  organizationId?: string;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"tree" | "create" | "templates">("tree");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<CoaAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "ASSET" as AccountType,
    balanceType: "DEBIT" as BalanceType,
    description: "",
    parentAccountId: "",
  });

  const [selectedTemplate, setSelectedTemplate] =
    useState<CoaTemplateName>("residential");

  const fetchAccounts = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      setLoadError(null);
      const list = await chartOfAccountsService.listAccounts(organizationId);
      setAccounts(list);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load Chart of Accounts";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [organizationId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      toast.error("Organization context missing");
      return;
    }
    try {
      setSaving(true);
      await chartOfAccountsService.createAccount({
        organizationId,
        accountCode: formData.code,
        accountName: formData.name,
        accountType: formData.type,
        balanceType: formData.balanceType,
        description: formData.description,
        parentAccountId: formData.parentAccountId || undefined,
        createdBy: user?.id,
      });
      toast.success("Account created successfully");
      setFormData({
        code: "",
        name: "",
        type: "ASSET",
        balanceType: "DEBIT",
        description: "",
        parentAccountId: "",
      });
      setTab("tree");
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await chartOfAccountsService.archiveAccount(id);
      toast.success("Account archived");
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Failed to archive account");
    }
  };

  const handleSeed = async () => {
    if (!organizationId) return;
    try {
      setSaving(true);
      const res = await seedChartOfAccounts(
        organizationId,
        selectedTemplate,
        user?.id
      );
      toast.success(
        `Seeded ${res.seeded} accounts (${res.skipped} skipped existing)`
      );
      setTab("tree");
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Failed to seed accounts");
    } finally {
      setSaving(false);
    }
  };

  const filteredAccounts = accounts.filter((a) => {
    const matchesSearch =
      a.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.account_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "ALL" || a.account_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: string | null) => {
    switch (type) {
      case "ASSET":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Asset</Badge>;
      case "LIABILITY":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Liability</Badge>;
      case "EQUITY":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Equity</Badge>;
      case "REVENUE":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200">Revenue</Badge>;
      case "EXPENSE":
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-200">Expense</Badge>;
      default:
        return <Badge variant="outline">{type || "Other"}</Badge>;
    }
  };

  const queryPhase = loadError ? "error" : loading ? "loading" : "ready";

  return (
    <WorkspacePageShell
      tone="finance"
      title="Chart of Accounts"
      description="Configure financial ledger accounts, parent-child hierarchies, and standard templates."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={tab === "tree" ? "primary" : "outline"}
            onClick={() => setTab("tree")}
            size="sm"
          >
            <FolderTree className="w-4 h-4 mr-1.5" />
            Accounts List
          </Button>
          <Button
            variant={tab === "create" ? "primary" : "outline"}
            onClick={() => setTab("create")}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Account
          </Button>
          <Button
            variant={tab === "templates" ? "primary" : "outline"}
            onClick={() => setTab("templates")}
            size="sm"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Templates
          </Button>
        </div>
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError ?? undefined}
        onRetry={() => void fetchAccounts()}
        loadingFallback={
          <div className="py-12 text-center text-ink-muted">Loading Chart of Accounts...</div>
        }
      >
      {tab === "tree" && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <Input
                placeholder="Search code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {["ALL", "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map(
                (t) => (
                  <Button
                    key={t}
                    variant={typeFilter === t ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setTypeFilter(t)}
                    className="text-xs"
                  >
                    {t}
                  </Button>
                )
              )}
            </div>
          </div>

          {filteredAccounts.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-ink-muted opacity-40" />
              <p className="text-ink-muted">No accounts found.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTab("templates")}
              >
                Seed from standard template
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-surface-border rounded-xl" role="region" aria-label="Chart of accounts" tabIndex={0}>
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle border-b border-surface-border text-xs uppercase text-ink-muted font-semibold">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Account Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredAccounts.map((acc) => (
                    <tr
                      key={acc.id}
                      className={`hover:bg-surface-hover/50 ${
                        !acc.is_active ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-ink">
                        {acc.account_code}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {acc.account_name}
                        {acc.description && (
                          <div className="text-xs text-ink-muted font-normal truncate max-w-xs">
                            {acc.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{getTypeBadge(acc.account_type)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                        {acc.balance_type || "DEBIT"}
                      </td>
                      <td className="px-4 py-3">
                        {acc.is_active ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px]">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Archived
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {acc.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(acc.id)}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Archive className="w-3.5 h-3.5 mr-1" />
                            Archive
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
        <Card className="p-6 max-w-2xl mx-auto space-y-4">
          <div className="border-b border-surface-border pb-3">
            <h2 className="text-lg font-bold text-ink">Add New Account</h2>
            <p className="text-xs text-ink-muted">
              Account codes are immutable once created. Balance type defaults to accounting standards.
            </p>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Account Code *
                </label>
                <Input
                  required
                  placeholder="e.g. 1010"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Account Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Cash in GCB Operating"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Account Type
                </label>
                <NativeSelectControl
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface text-ink text-sm"
                  value={formData.type}
                  onChange={(e) => {
                    const t = e.target.value as AccountType;
                    const bal: BalanceType =
                      t === "ASSET" || t === "EXPENSE" ? "DEBIT" : "CREDIT";
                    setFormData({ ...formData, type: t, balanceType: bal });
                  }}
                >
                  <option value="ASSET">Asset</option>
                  <option value="LIABILITY">Liability</option>
                  <option value="EQUITY">Equity</option>
                  <option value="REVENUE">Revenue</option>
                  <option value="EXPENSE">Expense</option>
                </NativeSelectControl>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Balance Type
                </label>
                <NativeSelectControl
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface text-ink text-sm"
                  value={formData.balanceType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      balanceType: e.target.value as BalanceType,
                    })
                  }
                >
                  <option value="DEBIT">Debit</option>
                  <option value="CREDIT">Credit</option>
                </NativeSelectControl>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Parent Account (Optional)
              </label>
              <NativeSelectControl
                className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface text-ink text-sm"
                value={formData.parentAccountId}
                onChange={(e) =>
                  setFormData({ ...formData, parentAccountId: e.target.value })
                }
              >
                <option value="">None (Top-level Account)</option>
                {accounts
                  .filter((a) => a.is_active)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_code} - {a.account_name} ({a.account_type})
                    </option>
                  ))}
              </NativeSelectControl>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Description / Notes
              </label>
              <Input
                placeholder="Optional purpose for this account"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTab("tree")}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Creating..." : "Save Account"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tab === "templates" && (
        <Card className="p-6 max-w-2xl mx-auto space-y-5">
          <div>
            <h2 className="text-lg font-bold text-ink">
              Ghana Standard COA Templates
            </h2>
            <p className="text-xs text-ink-muted">
              Pre-configured charts of accounts conforming to local real estate standards (including GRA tax & withholding accounts).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: "residential" as CoaTemplateName,
                title: "Residential",
                desc: "30 Standard Accounts (Rent, Utility, Security Deposits, OpEx)",
              },
              {
                id: "commercial" as CoaTemplateName,
                title: "Commercial",
                desc: "35 Accounts (+ Parking, Storage, Lift/Generator Servicing)",
              },
              {
                id: "mixed-use" as CoaTemplateName,
                title: "Mixed-Use",
                desc: "45 Accounts (+ Retail, Short-stay, Staff, VAT Ledger)",
              },
            ].map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedTemplate === t.id
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                    : "border-surface-border hover:border-ink-muted/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-ink">{t.title}</span>
                  {selectedTemplate === t.id && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                </div>
                <p className="text-xs text-ink-muted">{t.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-800 flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Existing accounts with identical codes will be preserved. New accounts will be added automatically.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTab("tree")}
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleSeed}
              disabled={saving}
            >
              {saving ? "Seeding..." : "Apply Selected Template"}
            </Button>
          </div>
        </Card>
      )}
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}

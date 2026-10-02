import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Landmark, Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { trustAccountingService, type TrustAccount, type TrustLedgerEntry } from "../../../lib/trust-accounting.service";
import { useAuth } from "../../context/AuthContext";

const money = (minor = 0, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);

export function TrustAccounting({ organizationId }: { organizationId: string }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TrustAccount[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [ledger, setLedger] = useState<TrustLedgerEntry[]>([]);
  const [summary, setSummary] = useState<{ totalBalance: number } | null>(null);
  const [form, setForm] = useState({ name: "", accountType: "tenant_security", currency: "USD" });
  const [entryForm, setEntryForm] = useState({ type: "deposit" as const, amount: "", memo: "" });

  const load = async () => {
    try {
      const s = await trustAccountingService.getTrustSummary(organizationId);
      setAccounts(s.accounts);
      setSummary({ totalBalance: s.totalBalance });
      setSelectedId((id) => id || s.accounts[0]?.id || "");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => { void load(); }, [organizationId]);

  useEffect(() => {
    if (!selectedId) return;
    void trustAccountingService.getLedger(selectedId).then(setLedger);
  }, [selectedId]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await trustAccountingService.createAccount({
        organizationId,
        name: form.name,
        accountType: form.accountType as TrustAccount["account_type"],
        currency: form.currency,
      });
      setForm({ name: "", accountType: "tenant_security", currency: "USD" });
      toast.success("Trust account created");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePostEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    try {
      await trustAccountingService.postEntry({
        trustAccountId: selectedId,
        entryType: entryForm.type,
        amountMinor: Math.round(parseFloat(entryForm.amount) * 100),
        memo: entryForm.memo,
        postedBy: user?.id,
      });
      setEntryForm({ type: "deposit", amount: "", memo: "" });
      toast.success("Entry posted");
      load();
      setLedger(await trustAccountingService.getLedger(selectedId));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const selected = accounts.find((a) => a.id === selectedId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Landmark className="h-6 w-6" /> Trust Accounting</h1>
        <p className="text-sm text-muted-foreground">Segregated trust ledgers for tenant deposits, owner reserves, and escrow.</p>
      </div>

      {summary && (
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Total trust balance</p>
          <p className="text-3xl font-semibold">{money(summary.totalBalance)}</p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 space-y-3 lg:col-span-1">
          <h2 className="font-semibold">Trust accounts</h2>
          {accounts.map((a) => (
            <button key={a.id} type="button" onClick={() => setSelectedId(a.id)} className={`w-full text-left rounded-lg border p-3 ${selectedId === a.id ? "border-primary" : ""}`}>
              <p className="font-medium">{a.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{a.account_type.replace(/_/g, " ")}</p>
              <p className="text-sm font-semibold">{money(a.balance_minor, a.currency)}</p>
            </button>
          ))}
          <form onSubmit={handleCreateAccount} className="space-y-2 pt-2 border-t">
            <Input placeholder="Account name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <NativeSelectControl className="w-full rounded-lg border px-3 py-2" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>
              <option value="tenant_security">Tenant security</option>
              <option value="owner_reserve">Owner reserve</option>
              <option value="operating_segregated">Operating segregated</option>
              <option value="escrow">Escrow</option>
            </NativeSelectControl>
            <Button type="submit" size="sm"><Plus className="h-4 w-4 mr-1" /> Add account</Button>
          </form>
        </Card>

        <Card className="p-6 lg:col-span-2 space-y-4">
          <h2 className="font-semibold">Ledger {selected ? `— ${selected.name}` : ""}</h2>
          {selected && (
            <form onSubmit={handlePostEntry} className="flex flex-wrap gap-2 items-end">
              <NativeSelectControl className="rounded-lg border px-3 py-2" value={entryForm.type} onChange={(e) => setEntryForm({ ...entryForm, type: e.target.value as typeof entryForm.type })}>
                <option value="deposit">Deposit</option>
                <option value="disbursement">Disbursement</option>
                <option value="adjustment">Adjustment</option>
              </NativeSelectControl>
              <Input type="number" step="0.01" placeholder="Amount" className="w-32" value={entryForm.amount} onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })} required />
              <Input placeholder="Memo" className="flex-1 min-w-[120px]" value={entryForm.memo} onChange={(e) => setEntryForm({ ...entryForm, memo: e.target.value })} />
              <Button type="submit" size="sm">Post</Button>
            </form>
          )}
          {ledger.length === 0 ? <p className="text-sm text-muted-foreground">No ledger entries.</p> : ledger.map((e) => (
            <div key={e.id} className="flex justify-between rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-2">
                {e.amount_minor >= 0 ? <ArrowDownLeft className="h-4 w-4 text-green-600" /> : <ArrowUpRight className="h-4 w-4 text-red-600" />}
                <div>
                  <p className="font-medium capitalize">{e.entry_type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{e.memo || "—"} · {new Date(e.posted_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{money(Math.abs(e.amount_minor), selected?.currency)}</p>
                <p className="text-xs text-muted-foreground">Bal: {money(e.balance_after_minor, selected?.currency)}</p>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Landmark,
  CheckCircle2,
  Clock,
  Send,
  Building,
  Smartphone,
  CreditCard,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import {
  ownerDisbursementService,
  type OwnerProfile,
  type OwnerStatementRecord,
} from "../../../lib/owner-disbursement.service";
import { useAuth } from "../../context/AuthContext";

const money = (ghs: number = 0) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(ghs);

export function OwnerDisbursements({
  organizationId,
}: {
  organizationId?: string;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"pending" | "disbursed" | "owners">("pending");
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [owners, setOwners] = useState<OwnerProfile[]>([]);
  const [statements, setStatements] = useState<OwnerStatementRecord[]>([]);

  const loadData = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const [ownerList, statementList] = await Promise.all([
        ownerDisbursementService.getLiveOwners(organizationId),
        ownerDisbursementService.getLiveMappedStatements(organizationId),
      ]);
      setOwners(ownerList);
      setStatements(statementList);
    } catch (err: any) {
      toast.error(err.message || "Failed to load owner disbursements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organizationId]);

  const handleDisburse = async (statementId: string) => {
    if (!organizationId || !user?.id) {
      toast.error("Sign in is required to approve owner payouts.");
      return;
    }
    try {
      setExecuting(statementId);
      const res = await ownerDisbursementService.executeLiveDisbursement({
        organizationId,
        statementId,
        requestedBy: user.id,
      });
      toast.success(
        res.payoutReference
          ? `Disbursement submitted. Ref: ${res.payoutReference}`
          : "Payout approved. Add an owner phone number to send Mobile Money."
      );
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Disbursement failed");
    } finally {
      setExecuting(null);
    }
  };

  const pending = statements.filter((s) => s.payoutStatus === "pending_approval");
  const disbursed = statements.filter((s) => s.payoutStatus !== "pending_approval");

  const totalPendingPayout = pending.reduce((sum, s) => sum + s.netDisbursableGhs, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Owner Payouts & Rent Waterfall
          </h1>
          <p className="text-sm text-ink-muted">
            Execute net rental income payouts to property owners via Bank Wire or Mobile Money.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={tab === "pending" ? "primary" : "outline"}
            onClick={() => setTab("pending")}
            size="sm"
          >
            <Clock className="w-4 h-4 mr-1.5" />
            Pending Approval ({pending.length})
          </Button>
          <Button
            variant={tab === "disbursed" ? "primary" : "outline"}
            onClick={() => setTab("disbursed")}
            size="sm"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Disbursement History ({disbursed.length})
          </Button>
          <Button
            variant={tab === "owners" ? "primary" : "outline"}
            onClick={() => setTab("owners")}
            size="sm"
          >
            <Building className="w-4 h-4 mr-1.5" />
            Owner Profiles ({owners.length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-surface border-surface-border">
          <div className="text-xs text-ink-muted">Pending Payout Waterfall</div>
          <div className="text-2xl font-bold text-primary font-mono mt-1">
            {money(totalPendingPayout)}
          </div>
        </Card>
        <Card className="p-4 bg-surface border-surface-border">
          <div className="text-xs text-ink-muted">Standard GRA Rent Withholding</div>
          <div className="text-2xl font-bold text-ink font-mono mt-1">
            8.0%
          </div>
        </Card>
        <Card className="p-4 bg-surface border-surface-border">
          <div className="text-xs text-ink-muted">Active Payout Channels</div>
          <div className="text-sm font-semibold text-ink mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-600">
              <Smartphone className="w-4 h-4" /> MTN MoMo / Telecel
            </span>
            <span className="flex items-center gap-1 text-blue-600">
              <Landmark className="w-4 h-4" /> ACH / GhIPSS
            </span>
          </div>
        </Card>
      </div>

      {tab === "pending" && (
        <Card className="p-6 space-y-4">
          <div className="border-b border-surface-border pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-ink">
                Pending distribution run
              </h2>
              <p className="text-xs text-ink-muted">
                Gross Rent Collected − Agency Commission (10%) − Maintenance − GRA Rent Tax (8%) = Net Payout.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-ink-muted">
              Calculating waterfall balances...
            </div>
          ) : pending.length === 0 ? (
            <div className="py-12 text-center text-ink-muted">
              No pending distributions awaiting approval.
            </div>
          ) : (
            <div className="overflow-x-auto border border-surface-border rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle border-b border-surface-border text-xs uppercase text-ink-muted font-semibold">
                  <tr>
                    <th className="px-4 py-3">Owner / Beneficiary</th>
                    <th className="px-4 py-3 text-right">Gross Rent</th>
                    <th className="px-4 py-3 text-right">Expenses</th>
                    <th className="px-4 py-3 text-right">Tax (8%)</th>
                    <th className="px-4 py-3 text-right">Net Payout</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {pending.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-hover/50">
                      <td className="px-4 py-3 font-semibold text-ink">
                        {s.ownerName}
                        <div className="text-xs text-ink-muted font-normal">
                          Statement {s.period}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-right text-ink">
                        {money(s.grossRentCollectedGhs)}
                      </td>
                      <td className="px-4 py-3 font-mono text-right text-ink-muted">
                        −{money(s.managementCommissionGhs)}
                      </td>
                      <td className="px-4 py-3 font-mono text-right text-ink-muted">
                        −{money(s.withholdingTaxGhs)}
                      </td>
                      <td className="px-4 py-3 font-mono text-right font-bold text-emerald-600">
                        {money(s.netDisbursableGhs)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={executing === s.id}
                          onClick={() => handleDisburse(s.id)}
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          {executing === s.id ? "Sending..." : "Approve & Disburse"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "disbursed" && (
        <Card className="p-6 space-y-4">
          <div className="overflow-x-auto border border-surface-border rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-subtle border-b border-surface-border text-xs uppercase text-ink-muted font-semibold">
                <tr>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3 text-right">Net Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {disbursed.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium text-ink">{s.ownerName}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{s.period}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {s.payoutReference || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-right font-bold text-ink">
                      {money(s.netDisbursableGhs)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-none">
                        {s.payoutStatus.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "owners" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {owners.map((owner) => (
            <Card key={owner.id} className="p-5 space-y-3">
              <div className="flex justify-between items-start border-b border-surface-border pb-3">
                <div>
                  <h3 className="font-bold text-ink text-base">{owner.fullName}</h3>
                  <div className="text-xs text-ink-muted">{owner.email} | {owner.phone}</div>
                </div>
                <Badge variant="outline">
                  {owner.payoutMethod === "bank_transfer" ? "Bank Wire" : "MoMo Wallet"}
                </Badge>
              </div>

              <div className="text-xs space-y-1">
                <div className="text-ink-muted">
                  Payout Target:{" "}
                  <span className="font-mono text-ink font-semibold">
                    {owner.bankName || owner.momoNetwork} —{" "}
                    {owner.accountNumber || owner.momoNumber}
                  </span>
                </div>
                <div className="text-ink-muted">
                  Fee: <span className="text-ink font-semibold">{owner.managementFeePercent}%</span> | Tax Withholding: <span className="text-ink font-semibold">{owner.withholdingTaxPercent}%</span>
                </div>
              </div>

              <div className="border-t border-surface-border pt-2 text-xs">
                <div className="font-semibold text-ink mb-1">Assigned Units ({owner.ownedUnits.length}):</div>
                <div className="space-y-1">
                  {owner.ownedUnits.map((u) => (
                    <div key={u.unitId} className="flex justify-between text-ink-muted">
                      <span>{u.unitIdentifier}</span>
                      <span className="font-mono text-ink">GH₵ {u.monthlyRentGhs}/mo</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

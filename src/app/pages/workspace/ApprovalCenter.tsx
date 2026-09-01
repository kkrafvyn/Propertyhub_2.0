import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building,
  CreditCard,
  FileText,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import {
  approvalCenterService,
  type PendingApprovalItem,
  type ApprovalDomain,
} from "../../../lib/approval-center.service";
import { useAuth } from "../../context/AuthContext";

const money = (pesewas: number = 0, currency = "GHS") =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(
    pesewas / 100
  );

export function ApprovalCenter({
  organizationId,
}: {
  organizationId?: string;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingApprovalItem[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("ALL");

  const loadApprovals = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const list = await approvalCenterService.getPendingApprovals(organizationId);
      setItems(list);
    } catch (err: any) {
      toast.error(err.message || "Failed to load approval center");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [organizationId]);

  const handleApprove = (id: string, domain: ApprovalDomain) => {
    toast.success(`Action approved successfully (${domain})`);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReject = (id: string, domain: ApprovalDomain) => {
    toast.info(`Action rejected (${domain})`);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const filtered = items.filter((item) => {
    if (selectedDomain === "ALL") return true;
    return item.domain === selectedDomain;
  });

  const getDomainIcon = (domain: ApprovalDomain) => {
    switch (domain) {
      case "procurement_request":
      case "invoice_variance":
        return <CreditCard className="w-4 h-4 text-purple-600" />;
      case "lease_application":
        return <Building className="w-4 h-4 text-emerald-600" />;
      case "owner_disbursement":
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case "journal_entry":
        return <FileText className="w-4 h-4 text-amber-600" />;
      default:
        return <CheckSquare className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Executive Approval Center
          </h1>
          <p className="text-sm text-ink-muted">
            Consolidated governance queue for procurement, leases, owner payouts, and GL postings.
          </p>
        </div>
        <div className="flex gap-2">
          {["ALL", "procurement_request", "lease_application", "journal_entry"].map(
            (d) => (
              <Button
                key={d}
                variant={selectedDomain === d ? "primary" : "ghost"}
                size="sm"
                onClick={() => setSelectedDomain(d)}
                className="text-xs"
              >
                {d.replace("_", " ").toUpperCase()}
              </Button>
            )
          )}
        </div>
      </div>

      <Card className="p-6 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-ink-muted">
            Gathering pending authorizations...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <ShieldCheck className="w-12 h-12 mx-auto text-emerald-500 opacity-60" />
            <p className="text-ink-muted font-medium">
              Zero pending items! All organizational workflows are authorized and up to date.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-surface-border bg-surface hover:bg-surface-hover/30 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-surface-subtle border border-surface-border">
                    {getDomainIcon(item.domain)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink text-sm">
                        {item.title}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {item.domain.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {item.subtitle}
                    </p>
                    <span className="text-[10px] text-ink-muted font-mono mt-1 block">
                      Submitted {item.createdAt?.slice(0, 10)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {item.amountMinor ? (
                    <div className="text-right font-mono font-bold text-ink mr-2">
                      {money(item.amountMinor, item.currency)}
                    </div>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-rose-600 hover:bg-rose-50"
                    onClick={() => handleReject(item.id, item.domain)}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleApprove(item.id, item.domain)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Authorize
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

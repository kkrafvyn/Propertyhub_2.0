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
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [items, setItems] = useState<PendingApprovalItem[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("ALL");

  const loadApprovals = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      setLoadError(null);
      const list = await approvalCenterService.getPendingApprovals(organizationId);
      setItems(list);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load approval center";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [organizationId]);

  const handleApprove = async (id: string, domain: ApprovalDomain) => {
    try {
      setBusyId(id);
      await approvalCenterService.resolveApproval({
        id,
        domain,
        decision: "approved",
        note: user?.id ? `Approved by ${user.id}` : undefined,
      });
      toast.success(`Approved (${domain})`);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Approve failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string, domain: ApprovalDomain) => {
    try {
      setBusyId(id);
      await approvalCenterService.resolveApproval({
        id,
        domain,
        decision: "rejected",
      });
      toast.info(`Rejected (${domain})`);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Reject failed");
    } finally {
      setBusyId(null);
    }
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
      case "owner_expense":
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case "journal_entry":
        return <FileText className="w-4 h-4 text-amber-600" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  const queryPhase = loadError
    ? "error"
    : loading
      ? "loading"
      : filtered.length === 0
        ? "empty"
        : "ready";

  return (
    <WorkspacePageShell
      title="Approval Center"
      description="Multi-domain governance queue including owner spend thresholds and disbursements."
      badge={
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
          <CheckSquare className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          Pending approvals
        </span>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          {["ALL", "owner_expense", "owner_disbursement", "procurement_request", "lease_application", "journal_entry"].map(
            (domain) => (
              <Button
                key={domain}
                size="sm"
                variant={selectedDomain === domain ? "default" : "outline"}
                onClick={() => setSelectedDomain(domain)}
              >
                {domain === "ALL" ? "All" : domain.replace(/_/g, " ")}
              </Button>
            ),
          )}
        </div>
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError ?? undefined}
        onRetry={() => void loadApprovals()}
        emptyIcon={ShieldCheck}
        emptyTitle="No pending approvals"
        emptyDescription="No pending approvals in this filter."
      >
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={`${item.domain}-${item.id}`} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <div className="mt-1">{getDomainIcon(item.domain)}</div>
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.subtitle}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className="capitalize">
                        {item.domain.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        <Clock className="h-3 w-3 mr-1" />
                        {item.urgency}
                      </Badge>
                      {typeof item.amountMinor === "number" ? (
                        <Badge variant="outline">{money(item.amountMinor, item.currency)}</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === item.id}
                    onClick={() => void handleApprove(item.id, item.domain)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === item.id}
                    onClick={() => void handleReject(item.id, item.domain)}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                Requested {new Date(item.createdAt).toLocaleString()}
              </p>
            </Card>
          ))}
        </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}

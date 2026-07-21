import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { leaseService } from "../../../lib/lease.service";
import { leaseWorkflowService } from "../../../lib/lease-workflow.service";
import { walletService } from "../../../lib/wallet.service";

function formatMoney(amountMinor?: number | null, currency = "GHS") {
  return walletService.formatWalletAmount(amountMinor, currency);
}

export function WorkspaceLeases({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(true);
  const [leases, setLeases] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadLeases = async () => {
    try {
      setLoading(true);
      const rows = await leaseService.getOrganizationLeases(organizationId);
      setLeases(rows || []);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load leases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLeases();
  }, [organizationId]);

  const respondRenewal = async (leaseId: string, status: "approved" | "declined") => {
    try {
      setBusyId(`${leaseId}-${status}`);
      await leaseWorkflowService.respondToRenewal(leaseId, status);
      toast.success(`Renewal ${status}.`);
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update renewal.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading leases...</Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Leases</h1>
        <p className="text-muted-foreground">Active tenancies, renewals, and rent schedules.</p>
      </div>

      {leases.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No leases yet.</Card>
      ) : (
        leases.map((lease) => (
          <Card key={lease.id} className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">
                  {lease.listing?.property?.address || "Lease property"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {lease.tenant?.full_name || lease.tenant?.email} · Started {lease.start_date}
                </p>
              </div>
              <div className="text-right space-y-2">
                <Badge className="capitalize">{lease.status}</Badge>
                {lease.renewal_status === "requested" ? (
                  <Badge variant="outline">Renewal requested</Badge>
                ) : null}
                <p className="font-semibold">{formatMoney(lease.rent_minor, lease.currency)}</p>
              </div>
            </div>
            {lease.renewal_status === "requested" ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => void respondRenewal(lease.id, "approved")}
                  disabled={busyId === `${lease.id}-approved`}
                >
                  Approve renewal
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void respondRenewal(lease.id, "declined")}
                  disabled={busyId === `${lease.id}-declined`}
                >
                  Decline
                </Button>
              </div>
            ) : null}
          </Card>
        ))
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ActivityTimeline } from "../../components/ux";
import { buildMaintenanceTimeline } from "../../lib/workflow-timeline";
import { maintenanceService } from "../../../lib/maintenance.service";

export function WorkspaceMaintenance({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const rows = await maintenanceService.getOrganizationRequests(organizationId);
      setRequests(rows || []);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load maintenance queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [organizationId]);

  const updateStatus = async (requestId: string, status: "in_progress" | "resolved") => {
    try {
      setUpdatingId(requestId);
      await maintenanceService.updateRequestStatus(requestId, status);
      toast.success(`Request marked ${status.replace(/_/g, " ")}.`);
      await loadRequests();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update request.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading maintenance queue...</Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Maintenance Queue</h1>
        <p className="text-muted-foreground">Tenant requests across your active leases.</p>
      </div>

      {requests.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No maintenance requests yet.</Card>
      ) : (
        requests.map((request) => (
          <Card key={request.id} className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{request.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {request.tenant?.full_name || request.tenant?.email || "Tenant"} ·{" "}
                  {request.lease?.listing?.property?.address || "Property"}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {request.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {request.status === "open" ? (
                <Button
                  size="sm"
                  onClick={() => void updateStatus(request.id, "in_progress")}
                  disabled={updatingId === request.id}
                >
                  Start work
                </Button>
              ) : null}
              {["open", "in_progress"].includes(request.status) ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void updateStatus(request.id, "resolved")}
                  disabled={updatingId === request.id}
                >
                  Mark resolved
                </Button>
              ) : null}
            </div>
            <ActivityTimeline steps={buildMaintenanceTimeline(request)} />
          </Card>
        ))
      )}
    </div>
  );
}

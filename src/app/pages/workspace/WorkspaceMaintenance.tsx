import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ActivityTimeline } from "../../components/ux";
import { buildMaintenanceTimeline } from "../../lib/workflow-timeline";
import { maintenanceService } from "../../../lib/maintenance.service";
import { vendorService } from "../../../lib/vendor.service";

export function WorkspaceMaintenance({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const [rows, vendorRows] = await Promise.all([
        maintenanceService.getOrganizationRequests(organizationId),
        vendorService.getVerifiedVendors("maintenance", 20),
      ]);
      setRequests(rows || []);
      setVendors(vendorRows || []);
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

  const assignVendor = async (requestId: string, vendorId: string) => {
    try {
      setUpdatingId(requestId);
      await maintenanceService.assignVendor(requestId, vendorId);
      toast.success("Vendor assigned.");
      await loadRequests();
    } catch (error) {
      console.error(error);
      toast.error("Unable to assign vendor.");
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
        <p className="text-muted-foreground">Tenant requests, vendor assignment, and photo evidence.</p>
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
                {request.vendor ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    Vendor: {request.vendor.business_name}
                  </p>
                ) : null}
                {request.tenant_rating ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    Tenant rating: {request.tenant_rating}/5
                    {request.tenant_rating_comment ? ` — ${request.tenant_rating_comment}` : ""}
                  </p>
                ) : null}
              </div>
              <Badge variant="outline" className="capitalize">
                {request.status.replace(/_/g, " ")}
              </Badge>
            </div>

            {Array.isArray(request.photo_urls) && request.photo_urls.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {request.photo_urls.map((url: string) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img
                      src={url}
                      alt="Maintenance evidence"
                      className="h-20 w-20 rounded-lg border border-border object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : null}

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
              {!request.vendor_id && vendors.length > 0 ? (
                <select
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                  defaultValue=""
                  onChange={(event) => {
                    if (event.target.value) {
                      void assignVendor(request.id, event.target.value);
                    }
                  }}
                  disabled={updatingId === request.id}
                >
                  <option value="">Assign vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.business_name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            <ActivityTimeline steps={buildMaintenanceTimeline(request)} />
          </Card>
        ))
      )}
    </div>
  );
}

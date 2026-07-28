import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ActivityTimeline } from "../../components/ux";
import { buildMaintenanceTimeline } from "../../lib/workflow-timeline";
import { inspectionService } from "../../../lib/inspection.service";

export function WorkspaceInspections({
  organizationId,
  currentUserId,
}: {
  organizationId: string;
  currentUserId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<any[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadInspections = async () => {
    try {
      setLoading(true);
      const rows = await inspectionService.getOrganizationInspections(organizationId);
      setInspections(rows || []);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load inspections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInspections();
  }, [organizationId]);

  const toggleItem = async (inspectionId: string, itemKey: string, completed: boolean) => {
    try {
      setUpdatingId(inspectionId);
      await inspectionService.toggleChecklistItem(inspectionId, itemKey, completed);
      await loadInspections();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update checklist.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading inspections...</Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Property Inspections</h1>
        <p className="text-muted-foreground">
          Move-in, move-out, and routine inspection forms with photo evidence.
        </p>
      </div>

      {inspections.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Inspections are created when leases are approved or from the Leads workspace.
        </Card>
      ) : (
        inspections.map((inspection) => {
          const checklist = Array.isArray(inspection.checklist) ? inspection.checklist : [];

          return (
            <Card key={inspection.id} className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold capitalize">
                    {inspection.inspection_type?.replace(/_/g, " ")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {inspection.listing?.property?.address || "Property"}
                    {inspection.scheduled_at
                      ? ` · ${new Date(inspection.scheduled_at).toLocaleString()}`
                      : ""}
                  </p>
                  {inspection.tenant ? (
                    <p className="text-sm text-muted-foreground">
                      Tenant: {inspection.tenant.full_name || inspection.tenant.email}
                    </p>
                  ) : null}
                </div>
                <Badge variant="outline" className="capitalize">
                  {inspection.status}
                </Badge>
              </div>

              {checklist.length > 0 ? (
                <div className="space-y-2">
                  {checklist.map((item: any) => (
                    <label key={item.key} className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(item.completed)}
                        disabled={updatingId === inspection.id || inspection.status === "completed"}
                        onChange={(event) =>
                          void toggleItem(inspection.id, item.key, event.target.checked)
                        }
                      />
                      <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}

              {Array.isArray(inspection.photo_urls) && inspection.photo_urls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {inspection.photo_urls.map((url: string) => (
                    <img
                      key={url}
                      src={url}
                      alt="Inspection"
                      className="h-20 w-20 rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
              ) : null}

              {inspection.status !== "completed" ? (
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await inspectionService.completeInspection(inspection.id);
                      toast.success("Inspection completed.");
                      await loadInspections();
                    } catch (error) {
                      console.error(error);
                      toast.error("Unable to complete inspection.");
                    }
                  }}
                >
                  Complete inspection
                </Button>
              ) : null}
            </Card>
          );
        })
      )}
    </div>
  );
}

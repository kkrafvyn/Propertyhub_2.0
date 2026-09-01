import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ClipboardCheck, Calendar, Sparkles } from "lucide-react";
import { inspectionService } from "../../../lib/inspection.service";
import { FieldInspectionEngine } from "./FieldInspectionEngine";

export function WorkspaceInspections({
  organizationId,
  currentUserId,
}: {
  organizationId: string;
  currentUserId: string;
}) {
  const [activeTab, setActiveTab] = useState<"field_engine" | "scheduled">("field_engine");
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

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-3">
        <button
          onClick={() => setActiveTab("field_engine")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === "field_engine"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-ink-secondary hover:text-ink hover:bg-surface-hover"
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          150-Point Field Inspection Engine
          <span className="text-[10px] bg-white/20 dark:bg-black/30 px-1.5 py-0.5 rounded font-mono">
            OFFLINE
          </span>
        </button>

        <button
          onClick={() => setActiveTab("scheduled")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === "scheduled"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-ink-secondary hover:text-ink hover:bg-surface-hover"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Scheduled Lease Inspections ({inspections.length})
        </button>
      </div>

      {activeTab === "field_engine" ? (
        <FieldInspectionEngine
          organizationId={organizationId}
          currentUserId={currentUserId}
        />
      ) : (
        <div className="space-y-4">
          {loading ? (
            <Card className="p-8 text-center text-ink-muted border-surface-border bg-surface">
              Loading scheduled inspections...
            </Card>
          ) : inspections.length === 0 ? (
            <Card className="p-8 text-center text-ink-muted border-surface-border bg-surface">
              No scheduled lease inspections. New inspections automatically sync from approved leases or field reports.
            </Card>
          ) : (
            inspections.map((inspection) => {
              const checklist = Array.isArray(inspection.checklist) ? inspection.checklist : [];

              return (
                <Card key={inspection.id} className="p-5 space-y-4 border-surface-border bg-surface">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-ink capitalize">
                        {inspection.inspection_type?.replace(/_/g, " ")}
                      </h3>
                      <p className="text-sm text-ink-secondary">
                        {inspection.listing?.property?.address || "Property"}
                        {inspection.scheduled_at
                          ? ` · ${new Date(inspection.scheduled_at).toLocaleString()}`
                          : ""}
                      </p>
                      {inspection.tenant ? (
                        <p className="text-sm text-ink-secondary">
                          Tenant: {inspection.tenant.full_name || inspection.tenant.email}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="capitalize border-surface-border text-ink">
                      {inspection.status}
                    </Badge>
                  </div>

                  {checklist.length > 0 ? (
                    <div className="space-y-2">
                      {checklist.map((item: any) => (
                        <label key={item.key} className="flex items-center gap-3 text-sm text-ink cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(item.completed)}
                            disabled={updatingId === inspection.id || inspection.status === "completed"}
                            onChange={(event) =>
                              void toggleItem(inspection.id, item.key, event.target.checked)
                            }
                            className="w-4 h-4 rounded border-border"
                          />
                          <span className={item.completed ? "line-through text-ink-muted" : "text-ink"}>
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
                          className="h-20 w-20 rounded-lg border border-surface-border object-cover"
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
                      className="bg-primary text-primary-foreground hover:opacity-90"
                    >
                      Complete inspection
                    </Button>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}


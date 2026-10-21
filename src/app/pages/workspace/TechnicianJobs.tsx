import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, ClipboardList, Clock, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";
import {
  estateOperationsService,
  type EstateIssue,
  type EstateWorkOrder,
} from "../../../lib/estate-operations.service";

interface TechnicianJobsProps {
  organizationId: string;
  currentUserId: string;
}

export function TechnicianJobs({ organizationId, currentUserId }: TechnicianJobsProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<EstateWorkOrder[]>([]);
  const [issues, setIssues] = useState<EstateIssue[]>([]);
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("active");

  const load = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const estates = await estateOperationsService.getEstates(organizationId);
      const ids = estates.map((x) => x.id);
      const [o, i] = await Promise.all([
        estateOperationsService.getWorkOrders(ids),
        estateOperationsService.getIssues(ids),
      ]);
      setOrders(o);
      setIssues(i);
    } catch {
      const message = "Unable to load technician jobs.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const assignedJobs = useMemo(
    () =>
      orders.filter(
        (x) =>
          x.assigned_to_user_id === currentUserId ||
          (!x.assigned_to_user_id && x.status !== "completed" && x.status !== "cancelled"),
      ),
    [orders, currentUserId],
  );

  const filteredJobs = useMemo(() => {
    if (statusFilter === "active") {
      return assignedJobs.filter((j) => !["completed", "cancelled"].includes(j.status));
    }
    if (statusFilter === "completed") {
      return assignedJobs.filter((j) => j.status === "completed");
    }
    return assignedJobs;
  }, [assignedJobs, statusFilter]);

  const advance = async (order: EstateWorkOrder) => {
    const next =
      order.status === "open"
        ? "in_progress"
        : order.status === "scheduled"
          ? "in_progress"
          : "completed";
    try {
      setSaving(true);
      await estateOperationsService.updateWorkOrder(order.id, { status: next });
      toast.success(next === "completed" ? "Job completed." : "Job started.");
      await load();
    } catch {
      toast.error("Unable to update job.");
    } finally {
      setSaving(false);
    }
  };

  const addEvidence = async (order: EstateWorkOrder) => {
    const path = evidence[order.id]?.trim();
    if (!path) {
      toast.error("Please enter a photo link or description first.");
      return;
    }
    try {
      setSaving(true);
      await estateOperationsService.addWorkOrderEvidence({
        workOrderId: order.id,
        storagePath: path,
        mediaType: "photo",
        uploadedBy: currentUserId,
      });
      setEvidence((x) => ({ ...x, [order.id]: "" }));
      toast.success("Completion photo attached.");
      await load();
    } catch {
      toast.error("Unable to attach photo.");
    } finally {
      setSaving(false);
    }
  };

  const queryPhase = loadError
    ? "error"
    : loading
      ? "loading"
      : filteredJobs.length === 0
        ? "empty"
        : "ready";

  return (
    <WorkspacePageShell
      tone="emerald"
      title="My Jobs"
      description="View assigned work orders, update repair progress, and attach completion photos."
      actions={
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border w-fit">
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === "active"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active ({assignedJobs.filter((j) => !["completed", "cancelled"].includes(j.status)).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("completed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === "completed"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Completed ({assignedJobs.filter((j) => j.status === "completed").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === "all"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({assignedJobs.length})
          </button>
        </div>
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError ?? undefined}
        onRetry={() => void load()}
        loadingFallback={
          <div className="flex justify-center items-center py-24 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading assignments…</span>
          </div>
        }
        emptyIcon={ClipboardList}
        emptyTitle="No jobs in this view"
        emptyDescription={
          statusFilter === "active"
            ? "You're all caught up! No active work orders currently require your attention."
            : "No work orders matching this filter."
        }
      >
        <div className="space-y-4">
          {filteredJobs.map((order) => {
            const issue = issues.find((x) => x.id === order.issue_id);
            const isDone = order.status === "completed";

            return (
              <Card key={order.id} className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-foreground">{issue?.title || "Work Order"}</h2>
                      <Badge
                        variant={
                          order.status === "completed"
                            ? "default"
                            : order.status === "in_progress"
                              ? "secondary"
                              : "outline"
                        }
                        className="capitalize text-[11px]"
                      >
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                      {issue?.priority === "urgent" && (
                        <Badge variant="destructive" className="text-[10px]">
                          Urgent
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>{issue?.category || "General Maintenance"}</span>
                      {order.scheduled_for && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(order.scheduled_for).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </>
                      )}
                    </div>

                    {order.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border mt-2">
                        {order.notes}
                      </p>
                    )}
                  </div>

                  {/* Advance button */}
                  {!isDone && (
                    <Button
                      size="sm"
                      disabled={saving}
                      onClick={() => void advance(order)}
                      className="shrink-0 gap-1.5"
                    >
                      {order.status === "in_progress" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark Completed
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          Start Job
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Evidence / photo attachment input */}
                {!isDone && (
                  <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-center gap-2">
                    <Input
                      value={evidence[order.id] || ""}
                      onChange={(e) =>
                        setEvidence((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      placeholder="Photo link or completion note…"
                      className="text-xs h-8 flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saving || !evidence[order.id]?.trim()}
                      onClick={() => void addEvidence(order)}
                      className="shrink-0 text-xs h-8 gap-1.5"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Attach Proof
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}

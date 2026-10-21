import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  Check,
  RefreshCw,
  ImageIcon,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { MetricCard } from "../../components/ui/MetricCard";
import { EmptyState, OperationalQueryState, WorkspacePageShell } from "../../components/ux";
import { inspectionService } from "../../../lib/inspection.service";
import { FieldInspectionEngine } from "./FieldInspectionEngine";
import {
  filterByNestedPropertyScope,
  getNestedListingPropertyId,
  type MemberScopeProps,
  withMemberScopeDefaults,
} from "../../../lib/member-scope";

export function WorkspaceInspections({
  organizationId,
  currentUserId,
  scopeMode = "organization",
  scopedPropertyIds = null,
  bypassPropertyScope = false,
}: {
  organizationId: string;
  currentUserId: string;
} & MemberScopeProps) {
  const [activeTab, setActiveTab] = useState<"field_engine" | "scheduled">("field_engine");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadInspections = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const rows = await inspectionService.getOrganizationInspections(organizationId);
      const scope = withMemberScopeDefaults({
        scopeMode,
        scopedPropertyIds,
        bypassPropertyScope,
      });
      setInspections(
        filterByNestedPropertyScope(
          rows || [],
          getNestedListingPropertyId,
          scope.scopeMode,
          scope.scopedPropertyIds,
          scope.bypassPropertyScope,
        ),
      );
    } catch (error) {
      console.error(error);
      setLoadError("Unable to load inspections.");
    } finally {
      setLoading(false);
    }
  };

  const queryPhase = loadError ? "error" : loading ? "loading" : "ready";

  useEffect(() => {
    void loadInspections();
  }, [organizationId, scopeMode, scopedPropertyIds, bypassPropertyScope]);

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

  const metrics = useMemo(() => {
    const total = inspections.length;
    const completed = inspections.filter((i) => i.status === "completed").length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [inspections]);

  return (
    <WorkspacePageShell
      title="Inspections"
      description="Field inspection engine and scheduled lease inspections for your portfolio."
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => void loadInspections()}
      >
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-3">
        <button
          onClick={() => setActiveTab("field_engine")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "field_engine"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-ink-secondary hover:text-ink hover:bg-surface-subtle"
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>150-Point Field Inspection Engine</span>
          <span className="text-[10px] bg-white/20 dark:bg-black/30 px-2 py-0.5 rounded-full font-mono font-bold tracking-wider">
            OFFLINE
          </span>
        </button>

        <button
          onClick={() => setActiveTab("scheduled")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "scheduled"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-ink-secondary hover:text-ink hover:bg-surface-subtle"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Scheduled Lease Inspections</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-subtle text-ink font-mono">
            {inspections.length}
          </span>
        </button>
      </div>

      {activeTab === "field_engine" ? (
        <FieldInspectionEngine
          organizationId={organizationId}
          currentUserId={currentUserId}
        />
      ) : (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              title="Total Scheduled"
              value={metrics.total}
              icon={Calendar}
              iconColor="primary"
              subtitle="Lease turnover and annual reviews"
            />
            <MetricCard
              title="Pending Inspection"
              value={metrics.pending}
              icon={Clock}
              iconColor="amber"
              subtitle="Requires on-site walk-through"
            />
            <MetricCard
              title="Completed & Signed"
              value={metrics.completed}
              icon={CheckCircle2}
              iconColor="emerald"
              subtitle="Digitally verified and filed"
            />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-40 rounded-2xl bg-surface-subtle animate-pulse border border-surface-border" />
              ))}
            </div>
          ) : inspections.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No scheduled inspections"
              description="No lease inspections currently scheduled. New inspections automatically generate when leases are approved or when annual property condition checks are due."
            />
          ) : (
            <div className="space-y-4">
              {inspections.map((inspection) => {
                const checklist = Array.isArray(inspection.checklist) ? inspection.checklist : [];
                const completedItems = checklist.filter((item: any) => Boolean(item.completed)).length;
                const totalItems = checklist.length;
                const percentDone = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
                const isDone = inspection.status === "completed";

                return (
                  <Card
                    key={inspection.id}
                    className="p-5 sm:p-6 space-y-4 border-surface-border bg-surface shadow-card hover:shadow-card-hover transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-ink capitalize">
                            {inspection.inspection_type ? inspection.inspection_type.replace(/_/g, " ") : "Move-in / Move-out Inspection"}
                          </h3>
                          <Badge
                            variant={isDone ? "success" : "warning"}
                            className="capitalize text-xs font-semibold px-2.5 py-0.5"
                          >
                            {inspection.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-ink-secondary flex-wrap pt-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-ink-muted" />
                            <span>{inspection.listing?.property?.address || "Property"}</span>
                          </div>

                          {inspection.scheduled_at && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                              <span>{new Date(inspection.scheduled_at).toLocaleDateString()}</span>
                            </div>
                          )}

                          {inspection.tenant && (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-ink-muted" />
                              <span>Tenant: {inspection.tenant.full_name || inspection.tenant.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress meter */}
                      {totalItems > 0 && (
                        <div className="shrink-0 flex items-center gap-2 rounded-xl bg-surface-subtle px-3 py-1.5 border border-surface-border text-xs">
                          <span className="font-semibold text-ink">{percentDone}% Complete</span>
                          <span className="text-ink-muted">({completedItems}/{totalItems})</span>
                        </div>
                      )}
                    </div>

                    {/* Checklist */}
                    {checklist.length > 0 ? (
                      <div className="space-y-2 pt-2 border-t border-surface-border/60">
                        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                          Inspection Checklist
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {checklist.map((item: any) => (
                            <label
                              key={item.key}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                item.completed
                                  ? "bg-emerald-500/5 border-emerald-500/20 text-ink"
                                  : "bg-surface-subtle/60 border-surface-border hover:border-primary/40 text-ink"
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                                  item.completed
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-surface-border bg-surface"
                                }`}
                              >
                                {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                              <input
                                type="checkbox"
                                checked={Boolean(item.completed)}
                                disabled={updatingId === inspection.id || isDone}
                                onChange={(event) =>
                                  void toggleItem(inspection.id, item.key, event.target.checked)
                                }
                                className="sr-only"
                              />
                              <span
                                className={`text-xs font-medium truncate ${
                                  item.completed ? "line-through text-ink-muted" : "text-ink"
                                }`}
                              >
                                {item.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Photo evidence */}
                    {Array.isArray(inspection.photo_urls) && inspection.photo_urls.length > 0 ? (
                      <div className="space-y-2 pt-2 border-t border-surface-border/60">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Inspection Photos ({inspection.photo_urls.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {inspection.photo_urls.map((url: string, index: number) => (
                            <img
                              key={url}
                              src={url}
                              alt={`Inspection ${index + 1}`}
                              className="h-20 w-20 rounded-xl border border-surface-border object-cover shadow-xs"
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Action */}
                    {!isDone ? (
                      <div className="pt-2 flex justify-end">
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await inspectionService.completeInspection(inspection.id);
                              toast.success("Inspection completed and signed.");
                              await loadInspections();
                            } catch (error) {
                              console.error(error);
                              toast.error("Unable to complete inspection.");
                            }
                          }}
                          className="flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Complete Inspection</span>
                        </Button>
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}

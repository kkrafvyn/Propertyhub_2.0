import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Loader2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { workQueueService, type WorkItem } from "../../../lib/work-queue.service";
import { orgActivityService } from "../../../lib/org-activity.service";
import { useAuth } from "../../context/AuthContext";
import type { MemberRole } from "../../../lib/workspace";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";

export function MyWorkQueue({
  organizationId,
  currentRole,
}: {
  organizationId?: string;
  currentRole?: MemberRole | null;
}) {
  const { user } = useAuth();
  const { organizationSlug } = useParams();
  const navigate = useNavigate();
  const isExecutive = orgActivityService.isExecutiveRole(currentRole);
  const [scope, setScope] = useState<"org" | "mine">(isExecutive ? "org" : "mine");
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setScope(isExecutive ? "org" : "mine");
  }, [isExecutive]);

  const loadQueue = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setLoadError(null);
      const rows =
        scope === "org"
          ? await workQueueService.getOrgWork(organizationId)
          : await workQueueService.getMyWork(organizationId, user?.id);
      setItems(rows);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load work queue.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, [organizationId, user?.id, scope]);

  const open = (item: WorkItem) => {
    if (organizationSlug) navigate(`/workspace/${organizationSlug}/${item.href}`);
  };

  const title = scope === "org" ? "Team work" : "My work";
  const description =
    scope === "org"
      ? "Organization-wide approvals, exceptions, AI decisions, and open tasks."
      : "Unified queue of pending approvals, exceptions, AI decisions, and assigned tasks.";

  const queryPhase = loadError
    ? "error"
    : loading
      ? "loading"
      : items.length === 0
        ? "empty"
        : "ready";

  return (
    <WorkspacePageShell
      title={title}
      description={description}
      actions={
        isExecutive ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={scope === "org" ? "default" : "outline"}
              onClick={() => setScope("org")}
            >
              All team
            </Button>
            <Button
              size="sm"
              variant={scope === "mine" ? "default" : "outline"}
              onClick={() => setScope("mine")}
            >
              Assigned to me
            </Button>
          </div>
        ) : null
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError ?? undefined}
        onRetry={() => void loadQueue()}
        loadingFallback={
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading queue…
          </div>
        }
        emptyIcon={Inbox}
        emptyTitle="Nothing in this queue right now"
        emptyDescription="Pending approvals, exceptions, and assigned tasks will appear here."
      >
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => open(item)}
              className="w-full text-left rounded-xl border border-border bg-card p-4 hover:bg-muted/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{item.title}</span>
                <Badge variant="outline" className="capitalize">
                  {item.kind.replace(/_/g, " ")} · {item.urgency}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.subtitle}</p>
            </button>
          ))}
        </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}

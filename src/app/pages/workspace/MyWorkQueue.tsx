import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Loader2, Inbox } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { workQueueService, type WorkItem } from "../../../lib/work-queue.service";
import { orgActivityService } from "../../../lib/org-activity.service";
import { useAuth } from "../../context/AuthContext";
import type { MemberRole } from "../../../lib/workspace";

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

  useEffect(() => {
    setScope(isExecutive ? "org" : "mine");
  }, [isExecutive]);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    const load =
      scope === "org"
        ? workQueueService.getOrgWork(organizationId)
        : workQueueService.getMyWork(organizationId, user?.id);
    void load
      .then((rows) => {
        if (active) setItems(rows);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organizationId, user?.id, scope]);

  const open = (item: WorkItem) => {
    if (organizationSlug) navigate(`/workspace/${organizationSlug}/${item.href}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {scope === "org" ? "Team work" : "My work"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {scope === "org"
              ? "Organization-wide approvals, exceptions, AI decisions, and open tasks."
              : "Unified queue of pending approvals, exceptions, AI decisions, and assigned tasks."}
          </p>
        </div>
        {isExecutive ? (
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
        ) : null}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading queue…
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Nothing in this queue right now.
        </Card>
      ) : (
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
      )}
    </div>
  );
}

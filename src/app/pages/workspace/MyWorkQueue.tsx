import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Loader2, Inbox } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { workQueueService, type WorkItem } from "../../../lib/work-queue.service";
import { useAuth } from "../../context/AuthContext";

export function MyWorkQueue({ organizationId }: { organizationId?: string }) {
  const { user } = useAuth();
  const { organizationSlug } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    let active = true;
    void workQueueService
      .getMyWork(organizationId, user?.id)
      .then((rows) => {
        if (active) setItems(rows);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organizationId, user?.id]);

  const open = (item: WorkItem) => {
    if (organizationSlug) navigate(`/workspace/${organizationSlug}/${item.href}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Work</h1>
        <p className="text-sm text-muted-foreground">
          Unified queue of pending approvals, exceptions, AI decisions, and assigned tasks.
        </p>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading queue…
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Nothing in your queue right now.
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

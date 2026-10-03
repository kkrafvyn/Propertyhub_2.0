import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import { workspaceSyncService } from "../../../lib/workspace-sync.service";
import type { OfflineConflictRecord } from "../../../lib/offline-db";

interface OfflineStatusBannerProps {
  organizationId?: string;
}

export function OfflineStatusBanner({ organizationId }: OfflineStatusBannerProps) {
  const [online, setOnline] = useState(workspaceSyncService.isOnline());
  const [pending, setPending] = useState(0);
  const [conflicts, setConflicts] = useState<OfflineConflictRecord[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = async () => {
    const [count, conflictRows] = await Promise.all([
      workspaceSyncService.getPendingCount(organizationId),
      workspaceSyncService.listConflicts(organizationId),
    ]);
    setPending(count);
    setConflicts(conflictRows);
  };

  useEffect(() => {
    void refreshPending();
    const unsubscribe = workspaceSyncService.subscribe(() => {
      void refreshPending();
    });

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [organizationId]);

  if (online && pending === 0 && conflicts.length === 0) return null;

  return (
    <div className="space-y-0 border-b">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm ${
          online
            ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100"
            : "border-destructive/30 bg-destructive/10 text-destructive"
        }`}
      >
        <div className="flex items-center gap-2">
          <CloudOff className="h-4 w-4 shrink-0" />
          <span>
            {online
              ? `${pending} change${pending === 1 ? "" : "s"} waiting to sync`
              : "You are offline — changes save locally and sync when reconnected"}
          </span>
        </div>
        {online && pending > 0 ? (
          <Button
            size="sm"
            variant="outline"
            disabled={syncing}
            onClick={() => {
              setSyncing(true);
              void workspaceSyncService
                .syncAll(organizationId)
                .then((result) => {
                  if (result.conflicts > 0) {
                    toast.warning(`${result.conflicts} sync conflict${result.conflicts === 1 ? "" : "s"} need review.`);
                  } else if (result.retryableFailures > 0) {
                    toast.error(`${result.retryableFailures} change${result.retryableFailures === 1 ? "" : "s"} could not sync yet. Will retry when online.`);
                  }
                  return refreshPending();
                })
                .finally(() => setSyncing(false));
            }}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Sync now
          </Button>
        ) : null}
      </div>

      {conflicts.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {conflicts.slice(0, 3).map((conflict) => (
            <div key={conflict.id} className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Sync conflict on {conflict.entityType.replace(/_/g, " ")} — server changed while you were offline.
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void workspaceSyncService
                      .resolveConflict(conflict.id, "keep_server")
                      .then(() => refreshPending());
                  }}
                >
                  Keep server
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void workspaceSyncService
                      .resolveConflict(conflict.id, "retry_local")
                      .then(() =>
                        workspaceSyncService.syncAll(organizationId).then(() => refreshPending()),
                      );
                  }}
                >
                  Replace server (mine wins)
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Database, Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import {
  platformBackupService,
  type PlatformBackupJob,
} from "../../../lib/platform-backup.service";

function formatWhen(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function statusVariant(status: PlatformBackupJob["status"]) {
  switch (status) {
    case "completed":
      return "default";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

export function AdminBackupPanel() {
  const [jobs, setJobs] = useState<PlatformBackupJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      const nextJobs = await platformBackupService.listJobs();
      setJobs(nextJobs);
    } catch (error) {
      console.error("Failed to load backup jobs:", error);
      toast.error("Could not load backup history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!jobs.some((job) => job.status === "running")) return;
    const timer = window.setInterval(() => {
      void loadJobs();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [jobs, loadJobs]);

  const triggerBackup = async (tier: PlatformBackupJob["tier"]) => {
    try {
      setRunning(true);
      await platformBackupService.triggerBackup(tier);
      toast.success(
        tier === "pre-migration"
          ? "Pre-migration backup started."
          : "Platform backup started.",
      );
      await loadJobs();
    } catch (error) {
      console.error("Backup trigger failed:", error);
      toast.error(error instanceof Error ? error.message : "Backup could not be started.");
    } finally {
      setRunning(false);
    }
  };

  const downloadManifest = async (job: PlatformBackupJob) => {
    try {
      const url = await platformBackupService.getBackupDownloadPath(job);
      if (!url) {
        toast.error("Manifest is not available yet.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download manifest.");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Backup & Recovery</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              Create complete snapshots of your property records, tenant leases, and financial ledgers.
              Regular backups safeguard your data and provide instant rollbacks whenever needed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={running} onClick={() => void triggerBackup("manual")}>
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Run platform backup
                </>
              )}
            </Button>
            <Button
              variant="outline"
              disabled={running}
              onClick={() => void triggerBackup("pre-migration")}
            >
              Pre-migration snapshot
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Layer 1 — Complete Snapshot",
              body: "Full capture of all properties, tenants, leases, and system configurations directly from this panel.",
            },
            {
              title: "Layer 2 — Encrypted Archive",
              body: "Encrypted data exports stored securely in isolated archive storage apart from active operational records.",
            },
            {
              title: "Layer 3 — Integrity Verification",
              body: "Automated checks confirm that critical records, account balances, and table structures remain valid.",
            },
          ].map((layer) => (
            <div key={layer.title} className="rounded-xl border border-border p-4 bg-secondary/20">
              <p className="font-medium text-sm">{layer.title}</p>
              <p className="mt-2 text-xs text-muted-foreground">{layer.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Backup history</h3>
            <p className="text-sm text-muted-foreground">Recent admin-triggered platform backups.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadJobs()} disabled={loading}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            Loading backup jobs…
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No platform backups yet. Run your first backup above.
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                      <Badge variant="outline">{job.tier}</Badge>
                      {job.manifest?.integrityCheck?.passed ? (
                        <Badge variant="secondary">
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          Critical tables OK
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Started {formatWhen(job.started_at)}
                      {job.completed_at ? ` · Completed ${formatWhen(job.completed_at)}` : null}
                    </p>
                    <p className="text-sm mt-1">
                      {job.table_count.toLocaleString()} tables · {job.row_count.toLocaleString()} rows
                    </p>
                    {job.error_message ? (
                      <p className="text-sm text-destructive mt-2">{job.error_message}</p>
                    ) : null}
                  </div>
                  {job.status === "completed" ? (
                    <Button variant="outline" size="sm" onClick={() => void downloadManifest(job)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download manifest
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

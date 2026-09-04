import { supabase } from "./supabase";

export type PlatformBackupJob = {
  id: string;
  status: "running" | "completed" | "failed";
  tier: "manual" | "scheduled" | "pre-migration";
  triggered_by: string | null;
  table_count: number;
  row_count: number;
  critical_table_count: number;
  storage_prefix: string | null;
  manifest: {
    integrityCheck?: {
      passed?: boolean;
      missingCritical?: string[];
    };
    tableCount?: number;
    rowCount?: number;
  };
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
};

export const platformBackupService = {
  async listJobs(limit = 20): Promise<PlatformBackupJob[]> {
    const { data, error } = await supabase
      .from("platform_backup_jobs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as PlatformBackupJob[];
  },

  async triggerBackup(tier: PlatformBackupJob["tier"] = "manual") {
    const { data, error } = await supabase.functions.invoke("platform-backup", {
      body: { action: "run", tier },
    });

    if (error) throw error;
    if (data?.error) throw new Error(String(data.error));
    return data?.job as PlatformBackupJob;
  },

  async getBackupDownloadPath(job: PlatformBackupJob, relativePath = "backup-manifest.json") {
    if (!job.storage_prefix) return null;
    const storagePath = `${job.storage_prefix}/${relativePath}`;
    const { data, error } = await supabase.storage
      .from("platform-backups")
      .createSignedUrl(storagePath, 3600);

    if (error) throw error;
    return data.signedUrl;
  },
};

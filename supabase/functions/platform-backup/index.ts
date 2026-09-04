import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

const BACKUP_BUCKET = "platform-backups";

const CRITICAL_TABLES = [
  "users",
  "organizations",
  "organization_members",
  "properties",
  "listings",
  "leases",
  "payment_transactions",
  "transactions",
  "audit_logs",
  "kyc_submissions",
  "trust_verification_requests",
  "fraud_review_cases",
  "messages",
  "organization_documents",
];

type BackupTier = "manual" | "scheduled" | "pre-migration";

async function canManageBackups(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from("users")
    .select("is_platform_admin, platform_console_grants")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (data?.is_platform_admin) return true;
  return Array.isArray(data?.platform_console_grants) &&
    data.platform_console_grants.includes("settings");
}

async function fetchAllRows(admin: ReturnType<typeof createAdminClient>, table: string) {
  const pageSize = 1000;
  let offset = 0;
  const rows: Record<string, unknown>[] = [];

  while (true) {
    const { data, error } = await admin
      .from(table)
      .select("*")
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new HttpError(500, `Failed to export ${table}: ${error.message}`);
    }

    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

async function uploadJson(
  admin: ReturnType<typeof createAdminClient>,
  path: string,
  payload: unknown,
) {
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  const { error } = await admin.storage.from(BACKUP_BUCKET).upload(path, body, {
    contentType: "application/json",
    upsert: true,
  });

  if (error) {
    throw new HttpError(500, `Storage upload failed for ${path}: ${error.message}`);
  }
}

async function runBackup(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  tier: BackupTier,
) {
  const { data: job, error: jobError } = await admin
    .from("platform_backup_jobs")
    .insert({
      status: "running",
      tier,
      triggered_by: userId,
      storage_prefix: null,
      manifest: { startedAt: new Date().toISOString(), tables: [] },
    })
    .select("id")
    .single();

  if (jobError || !job) {
    throw new HttpError(500, jobError?.message || "Could not create backup job");
  }

  const jobId = job.id as string;
  const storagePrefix = `${jobId}`;

  try {
    const { data: tables, error: tablesError } = await admin.rpc("list_public_base_tables");
    if (tablesError) {
      throw new HttpError(500, tablesError.message);
    }

    const tableNames = (tables || []) as string[];
    const manifestTables: Array<{ table: string; rows: number }> = [];
    let totalRows = 0;

    for (const table of tableNames) {
      const rows = await fetchAllRows(admin, table);
      await uploadJson(admin, `${storagePrefix}/database/data/${table}.json`, rows);
      manifestTables.push({ table, rows: rows.length });
      totalRows += rows.length;
    }

    const criticalPresent = CRITICAL_TABLES.filter((table) => tableNames.includes(table));

    const manifest = {
      exportedAt: new Date().toISOString(),
      tier,
      triggeredBy: userId,
      tables: manifestTables,
      tableCount: manifestTables.length,
      rowCount: totalRows,
      criticalTables: CRITICAL_TABLES,
      criticalTablesPresent: criticalPresent,
      integrityCheck: {
        passed: criticalPresent.length === CRITICAL_TABLES.length,
        missingCritical: CRITICAL_TABLES.filter((table) => !tableNames.includes(table)),
      },
    };

    await uploadJson(admin, `${storagePrefix}/backup-manifest.json`, manifest);
    await uploadJson(admin, `${storagePrefix}/database/manifest.json`, {
      exportedAt: manifest.exportedAt,
      tables: manifestTables,
    });

    const { data: completedJob, error: completeError } = await admin
      .from("platform_backup_jobs")
      .update({
        status: "completed",
        storage_prefix: storagePrefix,
        table_count: manifestTables.length,
        row_count: totalRows,
        critical_table_count: criticalPresent.length,
        manifest,
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", jobId)
      .select("*")
      .single();

    if (completeError) {
      throw new HttpError(500, completeError.message);
    }

    return completedJob;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed";
    await admin
      .from("platform_backup_jobs")
      .update({
        status: "failed",
        storage_prefix: storagePrefix,
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { user } = await requireAuthenticatedUser(authHeader);
    const admin = createAdminClient();

    if (!(await canManageBackups(admin, user.id))) {
      throw new HttpError(403, "Only platform admins or settings staff can manage backups");
    }

    if (req.method === "GET") {
      const { data, error } = await admin
        .from("platform_backup_jobs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw new HttpError(500, error.message);
      return jsonResponse(200, { jobs: data || [] });
    }

    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "run";
    const tier = (typeof body?.tier === "string" ? body.tier : "manual") as BackupTier;

    if (action === "list") {
      const { data, error } = await admin
        .from("platform_backup_jobs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw new HttpError(500, error.message);
      return jsonResponse(200, { jobs: data || [] });
    }

    if (action !== "run") {
      throw new HttpError(400, "Unsupported action");
    }

    const running = await admin
      .from("platform_backup_jobs")
      .select("id")
      .eq("status", "running")
      .limit(1);

    if (running.data?.length) {
      throw new HttpError(409, "A backup is already running. Wait for it to finish.");
    }

    const job = await runBackup(admin, user.id, tier);
    return jsonResponse(200, { job });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("platform-backup error:", error);
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Backup failed",
    });
  }
});

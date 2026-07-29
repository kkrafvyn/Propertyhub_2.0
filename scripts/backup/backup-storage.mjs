#!/usr/bin/env node
/**
 * Download Supabase Storage objects to local backup folder.
 * Requires SUPABASE_SERVICE_ROLE_KEY in root .env (Settings → API → service_role).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadProjectEnv } from "../load-project-env.mjs";
import { writeJson } from "./lib/paths.mjs";

const DEFAULT_BUCKETS = [
  "property-media",
  "receipts",
  "documents",
  "organization-assets",
];

async function listAllObjects(supabase, bucket, prefix = "") {
  const objects = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      if (error.message?.includes("not found") || error.message?.includes("Bucket")) {
        return objects;
      }
      throw error;
    }

    if (!data?.length) break;

    for (const item of data) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null && !item.metadata) {
        const nested = await listAllObjects(supabase, bucket, itemPath);
        objects.push(...nested);
      } else {
        objects.push({ bucket, path: itemPath, size: item.metadata?.size ?? null });
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return objects;
}

export async function backupStorage(outputDir, bucketNames = DEFAULT_BUCKETS) {
  const env = loadProjectEnv();
  const url = env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.warn(
      "  ○ Storage backup skipped — set SUPABASE_SERVICE_ROLE_KEY in .env (Supabase → Settings → API)",
    );
    return { skipped: true, reason: "missing_service_role_key", buckets: [] };
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const storageRoot = path.join(outputDir, "storage");
  fs.mkdirSync(storageRoot, { recursive: true });

  const manifest = {
    exportedAt: new Date().toISOString(),
    buckets: [],
  };

  for (const bucket of bucketNames) {
    console.log(`  → ${bucket}`);
    const objects = await listAllObjects(supabase, bucket);
    let downloaded = 0;
    let failed = 0;

    for (const object of objects) {
      const { data, error } = await supabase.storage.from(bucket).download(object.path);
      if (error || !data) {
        failed += 1;
        continue;
      }

      const dest = path.join(storageRoot, bucket, object.path);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const buffer = Buffer.from(await data.arrayBuffer());
      fs.writeFileSync(dest, buffer);
      downloaded += 1;
    }

    manifest.buckets.push({
      bucket,
      objects: objects.length,
      downloaded,
      failed,
    });
    console.log(`    ✓ ${downloaded}/${objects.length} files`);
  }

  writeJson(path.join(storageRoot, "manifest.json"), manifest);
  return manifest;
}

async function main() {
  const outputDir = process.argv[2];
  if (!outputDir) {
    console.error("Usage: node scripts/backup/backup-storage.mjs <output-dir>");
    process.exit(1);
  }

  console.log("Downloading storage buckets...");
  await backupStorage(outputDir);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  void main();
}

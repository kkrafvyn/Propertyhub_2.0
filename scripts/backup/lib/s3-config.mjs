import { loadProjectEnv } from "../../load-project-env.mjs";
import { getProjectRef } from "./db-config.mjs";

export function getS3Config(env = loadProjectEnv()) {
  const bucket = env.BACKUP_S3_BUCKET?.trim();
  const region = env.AWS_REGION || env.BACKUP_AWS_REGION || "eu-west-1";
  const prefix = (env.BACKUP_S3_PREFIX || "baytmiftah").replace(/\/+$/, "");

  if (!bucket) {
    throw new Error(
      "Set BACKUP_S3_BUCKET in .env (dedicated S3 bucket for offsite backups — not production Supabase storage).",
    );
  }

  return {
    bucket,
    region,
    prefix,
    projectRef: getProjectRef(env),
    kmsKeyId: env.BACKUP_KMS_KEY_ID?.trim() || null,
    accessKeyId: env.AWS_ACCESS_KEY_ID?.trim(),
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY?.trim(),
  };
}

export function getS3BackupPrefix(tier, config = getS3Config()) {
  return `${config.prefix}/${config.projectRef}/${tier}`;
}

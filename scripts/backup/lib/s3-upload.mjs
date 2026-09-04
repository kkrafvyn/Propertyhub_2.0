import fs from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getS3Config, getS3BackupPrefix } from "./s3-config.mjs";

function walkFiles(dir, baseDir = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, baseDir));
    } else {
      files.push({
        absolutePath: fullPath,
        relativePath: path.relative(baseDir, fullPath).replace(/\\/g, "/"),
      });
    }
  }

  return files;
}

function createS3Client(config) {
  const clientConfig = { region: config.region };
  if (config.accessKeyId && config.secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    };
  }
  return new S3Client(clientConfig);
}

function encryptionParams(config) {
  if (config.kmsKeyId) {
    return {
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: config.kmsKeyId,
    };
  }
  return { ServerSideEncryption: "AES256" };
}

export async function uploadBackupDirectory(backupDir, tier, options = {}) {
  const config = options.config || getS3Config();
  const client = createS3Client(config);
  const backupId = path.basename(backupDir);
  const s3Prefix = `${getS3BackupPrefix(tier, config)}/${backupId}`;

  const files = walkFiles(backupDir);
  const uploaded = [];

  for (const file of files) {
    const key = `${s3Prefix}/${file.relativePath}`;
    const body = fs.readFileSync(file.absolutePath);

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: guessContentType(file.relativePath),
        Metadata: {
          "backup-tier": tier,
          "backup-id": backupId,
          "project-ref": config.projectRef,
        },
        ...encryptionParams(config),
      }),
    );

    uploaded.push({ key, bytes: body.length });
  }

  const manifest = {
    uploadedAt: new Date().toISOString(),
    tier,
    backupId,
    bucket: config.bucket,
    prefix: s3Prefix,
    files: uploaded.length,
    totalBytes: uploaded.reduce((sum, item) => sum + item.bytes, 0),
    encryption: config.kmsKeyId ? "aws:kms" : "AES256",
  };

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: `${s3Prefix}/offsite-upload-manifest.json`,
      Body: `${JSON.stringify(manifest, null, 2)}\n`,
      ContentType: "application/json",
      ...encryptionParams(config),
    }),
  );

  return manifest;
}

export async function listBackupPrefixes(tier, config = getS3Config()) {
  const client = createS3Client(config);
  const prefix = `${getS3BackupPrefix(tier, config)}/`;
  const backupIds = new Set();
  let continuationToken;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of response.Contents || []) {
      const remainder = object.Key.slice(prefix.length);
      const backupId = remainder.split("/")[0];
      if (backupId) backupIds.add(backupId);
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return [...backupIds].sort();
}

export async function deleteBackupPrefix(tier, backupId, config = getS3Config()) {
  const client = createS3Client(config);
  const prefix = `${getS3BackupPrefix(tier, config)}/${backupId}/`;
  let continuationToken;
  let deleted = 0;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const objects = (response.Contents || []).map((item) => ({ Key: item.Key }));
    if (objects.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: config.bucket,
          Delete: { Objects: objects },
        }),
      );
      deleted += objects.length;
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return deleted;
}

function guessContentType(relativePath) {
  if (relativePath.endsWith(".json")) return "application/json";
  if (relativePath.endsWith(".sql")) return "application/sql";
  if (relativePath.endsWith(".png")) return "image/png";
  if (relativePath.endsWith(".jpg") || relativePath.endsWith(".jpeg")) return "image/jpeg";
  if (relativePath.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

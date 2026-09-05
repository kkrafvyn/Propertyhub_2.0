import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/** @typedef {'PASS' | 'FAIL' | 'UNVERIFIED' | 'NOT_APPLICABLE' | 'SKIPPED' | 'DELEGATED'} SecurityStatus */

/**
 * @param {string} outputDir
 * @param {string} job
 * @param {SecurityStatus} status
 * @param {Record<string, unknown>} [details]
 */
export function writeSecurityResult(outputDir, job, status, details = {}) {
  mkdirSync(outputDir, { recursive: true });
  const payload = {
    job,
    status,
    timestamp: new Date().toISOString(),
    ...details,
  };
  writeFileSync(path.join(outputDir, `${job}.json`), JSON.stringify(payload, null, 2));
  return payload;
}

/**
 * @param {SecurityStatus} status
 */
export function isBlockingStatus(status) {
  return status === "FAIL";
}

/**
 * @param {SecurityStatus} status
 */
export function isUnverifiedStatus(status) {
  return status === "UNVERIFIED" || status === "SKIPPED" || status === "DELEGATED";
}

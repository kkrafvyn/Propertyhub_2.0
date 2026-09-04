/**
 * Offsite backup retention (S3 object prefixes by tier).
 *
 * Daily     → 30 days
 * Weekly    → 12 weeks
 * Monthly   → 12 months
 * pre-migration → retain until manually removed
 */
export const RETENTION_POLICY = {
  daily: { days: 30 },
  weekly: { days: 12 * 7 },
  monthly: { days: 365 },
  "pre-migration": { retainForever: true },
};

export function parseBackupTimestamp(backupId) {
  const isoLike = backupId.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})(?:-(\d+))?Z/);
  if (isoLike) {
    const [, date, hh, mm, ss, ms] = isoLike;
    const fractional = ms ? `.${ms.padEnd(3, "0").slice(0, 3)}` : "";
    return new Date(`${date}T${hh}:${mm}:${ss}${fractional}Z`);
  }

  const parsed = new Date(backupId);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isBackupExpired(tier, backupId, now = new Date()) {
  const policy = RETENTION_POLICY[tier];
  if (!policy || policy.retainForever) return false;

  const createdAt = parseBackupTimestamp(backupId);
  if (!createdAt) return false;

  const ageMs = now.getTime() - createdAt.getTime();
  const maxAgeMs = policy.days * 24 * 60 * 60 * 1000;
  return ageMs > maxAgeMs;
}

export function resolveAutoTier(now = new Date()) {
  const isFirstOfMonth = now.getUTCDate() === 1;
  const isSunday = now.getUTCDay() === 0;

  if (isFirstOfMonth) return "monthly";
  if (isSunday) return "weekly";
  return "daily";
}

export function assessBackupEvidence(evidence, { now = Date.now(), maxAgeHours = 30, requireRestore = true } = {}) {
  if (!evidence || evidence.status !== 'completed') return { ok: false, reason: `Backup is ${evidence?.status || 'missing'}` };
  const age = now - Date.parse(evidence.completedAt);
  if (!Number.isFinite(age) || age < -300000 || age > maxAgeHours * 3600000) return { ok: false, reason: 'Backup evidence is stale or invalid' };
  if (!evidence.database || !evidence.storage || !evidence.offsite || !evidence.integrityVerified) return { ok: false, reason: 'Full offsite backup and integrity verification are required' };
  if (requireRestore && evidence.databaseRestored !== true) return { ok: false, reason: 'An isolated database restore has not been verified' };
  return { ok: true, reason: 'Fresh verified backup evidence' };
}

export function backupConfiguration(env) {
  if (env.BACKUP_ENABLED === 'false') return { status: 'disabled', missing: [] };
  const missing = [];
  if (!env.SUPABASE_DB_URL && !env.SUPABASE_DB_PASSWORD) missing.push('SUPABASE_DB_URL or SUPABASE_DB_PASSWORD');
  for (const key of ['BACKUP_S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!env[key]) missing.push(key);
  }
  return { status: missing.length ? 'failed' : 'ready', missing };
}

import fs from 'node:fs';
import { assessBackupEvidence, backupConfiguration } from './lib/backup-evidence.mjs';

const evidencePath = process.env.BACKUP_EVIDENCE_PATH || 'backups/latest-run.json';
if (process.argv.includes('--preflight')) {
  const config = backupConfiguration(process.env);
  if (config.status !== 'ready') {
    fs.mkdirSync('backups', { recursive: true });
    fs.writeFileSync(evidencePath, JSON.stringify({ ...config, checkedAt: new Date().toISOString() }, null, 2));
  }
  console.log(JSON.stringify(config));
  // Disabled is explicit; it must never satisfy a production backup gate.
  process.exit(config.status === 'ready' ? 0 : 1);
}
let evidence;
try { evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8')); } catch { /* Missing evidence fails closed. */ }
const result = assessBackupEvidence(evidence, { requireRestore: !process.argv.includes('--integrity-only') });
console.log(JSON.stringify(result));
process.exit(result.ok ? 0 : 1);

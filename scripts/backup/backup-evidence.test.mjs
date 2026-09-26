import { describe, it, expect } from 'vitest';
import { assessBackupEvidence, backupConfiguration } from './lib/backup-evidence.mjs';
describe('backup readiness evidence', () => {
  const now = Date.now();
  const good = { status:'completed', completedAt:new Date(now).toISOString(), database:true, storage:true, offsite:true, integrityVerified:true, databaseRestored:true };
  it('requires fresh complete backup and actual restore evidence', () => {
    expect(assessBackupEvidence(good,{now}).ok).toBe(true);
    expect(assessBackupEvidence({...good,databaseRestored:false},{now}).ok).toBe(false);
    expect(assessBackupEvidence({...good,completedAt:new Date(now-31*3600000).toISOString()},{now}).ok).toBe(false);
    expect(assessBackupEvidence({...good,offsite:false},{now}).ok).toBe(false);
  });
  it('never treats missing, skipped, disabled or failed as a backup', () => {
    for(const status of ['skipped','disabled','failed']) expect(assessBackupEvidence({...good,status},{now}).ok).toBe(false);
    expect(assessBackupEvidence(null,{now}).ok).toBe(false);
    expect(backupConfiguration({}).status).toBe('failed');
    expect(backupConfiguration({BACKUP_ENABLED:'false'}).status).toBe('disabled');
  });
});

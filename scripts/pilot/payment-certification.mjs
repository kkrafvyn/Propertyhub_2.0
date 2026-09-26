export const CERTIFICATION_KEYS = ['PILOT_TEST_USER_EMAIL','PILOT_TEST_USER_PASSWORD','PILOT_TEST_LISTING_ID','PAYANGELS_SANDBOX_TEST_REFERENCE','PILOT_TEST_TRANSACTION_ID','PILOT_TEST_ORG_ID','PILOT_TEST_APPROVAL_ID','PILOT_TEST_DISBURSE_PHONE','PAYANGELS_SANDBOX_AMOUNT_MINOR'];
export function requireCertificationConfig(env, dryRun) {
  if(dryRun)throw new Error('Certification cannot be a dry run');
  if(env.PILOT_ENVIRONMENT!=='sandbox')throw new Error('Certification requires PILOT_ENVIRONMENT=sandbox and disposable sandbox fixtures');
  const missing=CERTIFICATION_KEYS.filter(key=>!env[key]?.trim());
  if(missing.length)throw new Error(`Certification is incomplete: configure ${missing.join(', ')}`);
}
export function requireAccepted(name,status) {
  if(status!==200&&status!==201)throw new Error(`${name} failed with HTTP ${status}; certification cannot skip this step`);
}
export function assertStableLedger(before,after) {
  if(before.length!==1 || after.length!==1 || JSON.stringify(before)!==JSON.stringify(after))throw new Error('Webhook replay changed or duplicated the payment ledger');
}

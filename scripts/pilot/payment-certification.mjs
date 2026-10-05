export const CERTIFICATION_KEYS = ['PAYANGELS_SECRET_KEY','PAYANGELS_WEBHOOK_SECRET','PAYANGELS_API_BASE','PAYANGELS_DISBURSEMENT_URL','PILOT_TEST_USER_EMAIL','PILOT_TEST_USER_PASSWORD','PILOT_TEST_LISTING_ID','PAYANGELS_SANDBOX_TEST_REFERENCE','PILOT_TEST_TRANSACTION_ID','PILOT_TEST_ORG_ID','PILOT_TEST_APPROVAL_ID','PILOT_TEST_DISBURSE_PHONE','PAYANGELS_SANDBOX_AMOUNT_MINOR'];
export function requireCertificationConfig(env, dryRun) {
  if(dryRun)throw new Error('Certification cannot be a dry run');
  if(env.PILOT_ENVIRONMENT!=='sandbox')throw new Error('Certification requires PILOT_ENVIRONMENT=sandbox and disposable sandbox fixtures');
  if(!/^(1|true|yes)$/i.test(env.PAYANGELS_API_CONTRACT_VERIFIED?.trim()||''))throw new Error('Certification requires a reviewed PayAngel API contract');
  const missing=CERTIFICATION_KEYS.filter(key=>!env[key]?.trim());
  if(missing.length)throw new Error(`Certification is incomplete: configure ${missing.join(', ')}`);
  for(const key of ['PAYANGELS_API_BASE','PAYANGELS_DISBURSEMENT_URL']) {
    let url;
    try { url=new URL(env[key]); } catch { throw new Error(`${key} must be a valid HTTPS URL`); }
    if(url.protocol!=='https:' || /(^|\.)paystack\.co$/i.test(url.hostname))throw new Error(`${key} must be a verified PayAngel endpoint, not Paystack`);
  }
}
export function requireAccepted(name,status) {
  if(status!==200&&status!==201)throw new Error(`${name} failed with HTTP ${status}; certification cannot skip this step`);
}
export function assertStableLedger(before,after) {
  if(before.length!==1 || after.length!==1 || JSON.stringify(before)!==JSON.stringify(after))throw new Error('Webhook replay changed or duplicated the payment ledger');
}

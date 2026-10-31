import { expect,it } from 'vitest';
import { assertStableLedger,requireAccepted,requireCertificationConfig,CERTIFICATION_KEYS } from './payment-certification.mjs';
it('certification rejects skipped fixtures, dry runs and non-sandbox execution',()=>{
 const env=Object.fromEntries(CERTIFICATION_KEYS.map(key=>[key,'fixture']));
 env.PAYANGELS_API_BASE='https://sandbox.payangels.example/api';
 env.PAYANGELS_DISBURSEMENT_URL='https://sandbox.payangels.example/disburse';
 expect(()=>requireCertificationConfig(env,false)).toThrow('sandbox');
 env.PILOT_ENVIRONMENT='sandbox';
 env.PAYANGELS_API_CONTRACT_VERIFIED='true';
 expect(()=>requireCertificationConfig(env,false)).not.toThrow();
 expect(()=>requireCertificationConfig(env,true)).toThrow('dry run');
 delete env.PILOT_TEST_APPROVAL_ID;expect(()=>requireCertificationConfig(env,false)).toThrow('PILOT_TEST_APPROVAL_ID');
});
it('rejects partial provider responses and changed or missing ledger records',()=>{
 expect(()=>requireAccepted('refund',503)).toThrow();
 expect(()=>assertStableLedger([],[])).toThrow();
 expect(()=>assertStableLedger([{id:'1'}],[{id:'1'},{id:'2'}])).toThrow();
 expect(()=>assertStableLedger([{id:'1'}],[{id:'1'}])).not.toThrow();
});

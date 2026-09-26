import { expect,it } from 'vitest';
import { assertStableLedger,requireAccepted,requireCertificationConfig,CERTIFICATION_KEYS } from './payment-certification.mjs';
it('certification rejects skipped fixtures, dry runs and non-sandbox execution',()=>{
 const env=Object.fromEntries(CERTIFICATION_KEYS.map(key=>[key,'fixture']));
 expect(()=>requireCertificationConfig(env,false)).toThrow('sandbox');
 env.PILOT_ENVIRONMENT='sandbox';expect(()=>requireCertificationConfig(env,false)).not.toThrow();
 expect(()=>requireCertificationConfig(env,true)).toThrow('dry run');
 delete env.PILOT_TEST_APPROVAL_ID;expect(()=>requireCertificationConfig(env,false)).toThrow('PILOT_TEST_APPROVAL_ID');
});
it('rejects partial provider responses and changed or missing ledger records',()=>{
 expect(()=>requireAccepted('refund',503)).toThrow();
 expect(()=>assertStableLedger([],[])).toThrow();
 expect(()=>assertStableLedger([{id:'1'}],[{id:'1'},{id:'2'}])).toThrow();
 expect(()=>assertStableLedger([{id:'1'}],[{id:'1'}])).not.toThrow();
});

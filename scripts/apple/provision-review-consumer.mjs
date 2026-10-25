/** Isolated consumer reviewer login; credentials are never committed. */
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {loadProjectEnv} from '../load-project-env.mjs';
import {resolveServiceRoleKey} from '../supabase/resolve-service-role-key.mjs';
const env=loadProjectEnv();
const key=await resolveServiceRoleKey(env);
if(!key)throw Error('Supabase admin access unavailable');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(env.VITE_SUPABASE_URL,key,options);
const checked=({data,error})=>{if(error)throw error;return data;};
const file='secrets/app-review/consumer.json';
let fixture;
try{fixture=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(!fixture){
 const email='app-review-consumer@baytmiftah.com';
 if(checked(await admin.from('users').select('id').eq('email',email).maybeSingle()))throw Error('Existing review email has no saved credentials; refusing password reset');
 const password='Review!'+crypto.randomBytes(18).toString('base64url');
 const {user}=checked(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Consumer Review Demo',role:'consumer',account_type:'consumer',purpose:'Isolated App Review account'}}));
 fixture={email,password,userId:user.id};
 await fs.mkdir('secrets/app-review',{recursive:true});
 await fs.writeFile(file,JSON.stringify(fixture,null,2),{mode:0o600});
}
const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,options);
checked(await client.auth.signInWithPassword({email:fixture.email,password:fixture.password}));
const memberships=checked(await client.from('organization_members').select('organization_id').eq('user_id',fixture.userId));
if(memberships.length)throw Error('Consumer review account must not have business organization access');
console.log(JSON.stringify({email:fixture.email,loginVerified:true,organizationMemberships:0,credentialsFile:file}));

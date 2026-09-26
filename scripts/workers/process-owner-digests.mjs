import { createClient } from '@supabase/supabase-js';
const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
if(!url||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Supabase worker configuration required');
const client=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await client.rpc('deliver_owner_digests');
if(error)throw new Error(error.message);
console.log(JSON.stringify({job:'owner-digests',delivered:data,channel:'in_app'}));

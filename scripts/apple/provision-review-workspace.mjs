/** Create an isolated, private App Review fixture. Credentials stay gitignored. */
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {loadProjectEnv} from '../load-project-env.mjs';
import {resolveServiceRoleKey} from '../supabase/resolve-service-role-key.mjs';
const env=loadProjectEnv();
const key=await resolveServiceRoleKey(env);
if(!key) throw Error('Supabase admin access is unavailable');
const admin=createClient(env.VITE_SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
const file='secrets/app-review/workspace.json';
let fixture;
try { fixture=JSON.parse(await fs.readFile(file,'utf8')); } catch(e) { if(e.code!=='ENOENT')throw e; }
const checked=({data,error})=>{if(error)throw error;return data;};
if(!fixture){
 const email='app-review-workspace@baytmiftah.com';
 const existing=checked(await admin.from('users').select('id').eq('email',email).maybeSingle());
 if(existing)throw Error('Review email already exists without locally saved credentials; refusing to reset it');
 const password='Review!'+crypto.randomBytes(18).toString('base64url');
 const {user}=checked(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'App Review Demo',purpose:'Isolated fictional App Review data'}}));
 fixture={email,password,userId:user.id,organizationId:crypto.randomUUID(),slug:'app-review-demo',properties:Array.from({length:3},()=>crypto.randomUUID()),listings:Array.from({length:3},()=>crypto.randomUUID()),leads:Array.from({length:4},()=>crypto.randomUUID())};
 await fs.mkdir('secrets/app-review',{recursive:true});
 await fs.writeFile(file,JSON.stringify(fixture,null,2),{mode:0o600});
}
checked(await admin.auth.admin.updateUserById(fixture.userId,{user_metadata:{full_name:'App Review Demo',role:'agent',account_type:'business',purpose:'Isolated fictional App Review data'}}));
const profile=checked(await admin.from('users').select('id').eq('id',fixture.userId).single());
const existingOrg=checked(await admin.from('organizations').select('id,owner_id').eq('slug',fixture.slug).maybeSingle());
if(existingOrg && existingOrg.id!==fixture.organizationId)throw Error('Review organization slug belongs to another organization');
checked(await admin.from('organizations').upsert({id:fixture.organizationId,name:'BaytMiftah Review Demo',slug:fixture.slug,owner_id:fixture.userId,description:'Private fictional sample workspace for App Review. No real customers or transactions.',business_types:['agency_brokerage'],enabled_capabilities:['sales','leasing'],company_setup_completed:true,workspace_kind:'company',default_home_slug:'leads',enabled_workspace_modules:['sales','crm','leasing','communications','analytics'],setup_metadata:{purpose:'app_review',fictional:true}}));
const member=checked(await admin.from('organization_members').select('id').eq('organization_id',fixture.organizationId).eq('user_id',fixture.userId).maybeSingle());
if(!member)checked(await admin.from('organization_members').insert({organization_id:fixture.organizationId,user_id:fixture.userId,role:'agent'}));
else checked(await admin.from('organization_members').update({role:'agent'}).eq('id',member.id));
const homes=[['Demo Cantonments Apartment','apartment','Cantonments',2,2,110,4500,'rental'],['Demo East Legon Family Home','house','East Legon',4,3,240,1850000,'sale'],['Demo Osu Studio','apartment','Osu',1,1,55,650,'short_stay']];
checked(await admin.from('properties').upsert(homes.map(([name,category,neighborhood,bedrooms,bathrooms,square_meters],i)=>({id:fixture.properties[i],organization_id:fixture.organizationId,address:name+' — fictional sample',city:'Accra',region:'Greater Accra',country:'Ghana',category,neighborhood,bedrooms,bathrooms,square_meters,description:'FICTIONAL APP REVIEW SAMPLE. This property is not available for rent or purchase. Used to demonstrate listing management.',amenities:['Parking','Security','Air conditioning']}))));
checked(await admin.from('listings').upsert(homes.map((h,i)=>({id:fixture.listings[i],organization_id:fixture.organizationId,property_id:fixture.properties[i],listing_type:h[7],price:h[6],currency:'GHS',status:'draft',visibility:'private',whatsapp_enabled:false}))));
checked(await admin.from('aggregated_leads').upsert(['Ama Demo','Kojo Demo','Akua Demo','Kofi Demo'].map((lead_name,i)=>({id:fixture.leads[i],organization_id:fixture.organizationId,listing_id:fixture.listings[i%3],source:'internal',lead_name,lead_phone:`+1202555010${i+1}`,lead_email:`review-sample-${i+1}@example.invalid`,message:'Fictional review enquiry. Demonstrates the property enquiry workflow; no real customer.',status:['new','contacted','qualified','viewing_scheduled'][i],assigned_to:fixture.userId,tags:['App Review','Fictional']}))));
// The main lead board reads deal cases rather than imported lead records.
checked(await admin.from('deal_cases').upsert(fixture.listings.map((listing_id,i)=>({id:fixture.leads[i],organization_id:fixture.organizationId,listing_id,user_id:fixture.userId,assigned_to:fixture.userId,case_type:'property_inquiry',status:'pending',pipeline_stage:['new_inquiry','contacted','qualified'][i],priority:['medium','high','low'][i],message:'FICTIONAL APP REVIEW ENQUIRY: '+homes[i][0]+'. Demonstration only; no real transaction or customer.'}))));
// Use existing project marketing photography only inside private sample listings.
for(let i=0;i<3;i++){
 const photo=['interior-1280.webp','residences-1280.webp','architecture-1280.webp'][i];
 const storage_path=`${fixture.organizationId}/${fixture.properties[i]}/app-review-sample.webp`;
 checked(await admin.storage.from('property-media').upload(storage_path,await fs.readFile(`public/marketing/hero/${photo}`),{contentType:'image/webp',upsert:true}));
 const {signedUrl}=checked(await admin.storage.from('property-media').createSignedUrl(storage_path,3600));
 const existing=checked(await admin.from('property_media').select('id').eq('property_id',fixture.properties[i]).eq('storage_path',storage_path).maybeSingle());
 const media={organization_id:fixture.organizationId,property_id:fixture.properties[i],created_by:fixture.userId,storage_path,public_url:signedUrl,alt_text:'Illustrative photo for a fictional App Review sample property',is_primary:true,sort_order:0};
 if(existing)checked(await admin.from('property_media').update(media).eq('id',existing.id));else checked(await admin.from('property_media').insert(media));
}
const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
checked(await client.auth.signInWithPassword({email:fixture.email,password:fixture.password}));
const orgs=checked(await client.from('organization_members').select('organization_id').eq('user_id',fixture.userId));
if(orgs.length!==1||orgs[0].organization_id!==fixture.organizationId)throw Error('Review account organization isolation verification failed');
const listings=checked(await client.from('listings').select('id,status,visibility').eq('organization_id',fixture.organizationId));
if(listings.length!==3||listings.some(x=>x.status!=='draft'||x.visibility!=='private'))throw Error('Review listings must remain private drafts');
console.log(JSON.stringify({email:fixture.email,workspace:fixture.slug,properties:3,privateDraftListings:3,fictionalLeads:4,loginVerified:true,credentialsFile:file}));

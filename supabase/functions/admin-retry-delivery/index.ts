import { createAdminClient,requireAuthenticatedUser } from '../_shared/supabase.ts';
import { getCorsHeaders,HttpError,jsonResponse,safeErrorMessage } from '../_shared/http.ts';
import { resolveWhatsAppCredentialsForOrg,sendWhatsAppTextMessage } from '../_shared/whatsapp-cloud.ts';
import { sendSms } from '../_shared/arkesel.ts';
import { enforceRateLimit,rateLimitKey } from '../_shared/rate-limit.ts';
import { isPlatformFeatureEnabled,PLATFORM_FEATURE_KEYS } from '../_shared/platform-feature-flags.ts';
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:getCorsHeaders(req)});
 let retryId:string|null=null;
 try{
  if(req.method!=='POST')throw new HttpError(405,'Method not allowed');
  const {user,userClient}=await requireAuthenticatedUser(req.headers.get('Authorization'));
  const {error:denied}=await userClient.rpc('admin_require_communication_access');
  if(denied)throw new HttpError(403,'Communications access and MFA required');
  const {attemptId,reason}=await req.json();
  await enforceRateLimit({bucket:rateLimitKey('admin-delivery-retry',user.id),maxHits:10,windowSeconds:3600});
  const admin=createAdminClient();
  const {data:attempt,error}=await admin.from('communication_delivery_attempts').select('*').eq('id',attemptId).maybeSingle();
  if(error||!attempt||attempt.status!=='failed'||!['sms','whatsapp'].includes(attempt.channel))throw new HttpError(400,'Failed SMS or WhatsApp delivery required');
  const [{data:recipient,error:recipientError},{data:message,error:messageError}]=await Promise.all([
   admin.from('users').select('phone,banned,account_deletion_requested_at').eq('id',attempt.recipient_user_id).maybeSingle(),
   admin.from('messages').select('content').eq('id',attempt.message_id).maybeSingle(),
  ]);
  if(recipientError||messageError||!recipient?.phone||recipient.banned||recipient.account_deletion_requested_at||!message?.content||message.content.length>4000)throw new HttpError(400,'Stored recipient or message is unavailable');
  const {data:preferences,error:preferencesError}=await admin.from('notification_preferences').select('sms_enabled,whatsapp_enabled,notification_frequency,quiet_hours_enabled').eq('user_id',attempt.recipient_user_id).maybeSingle();
  if(preferencesError||!preferences||preferences.notification_frequency!=='immediate'||preferences.quiet_hours_enabled||!(attempt.channel==='sms'?preferences.sms_enabled:preferences.whatsapp_enabled))throw new HttpError(409,'Recipient preferences do not currently permit an immediate retry');
  const credentials=attempt.channel==='whatsapp'?await resolveWhatsAppCredentialsForOrg(admin,attempt.organization_id):null;
  if(attempt.channel==='whatsapp'&&(!(await isPlatformFeatureEnabled(admin,PLATFORM_FEATURE_KEYS.whatsapp))||!credentials?.accessToken||!credentials.phoneNumberId))throw new HttpError(503,'WhatsApp is not enabled and configured for this organization');
  if(attempt.channel==='sms'&&!Deno.env.get('ARKESEL_API_KEY'))throw new HttpError(503,'SMS gateway is not configured');
  const {data:claimed,error:claimError}=await userClient.rpc('admin_claim_delivery_retry',{p_attempt:attemptId,p_reason:reason});
  if(claimError)throw new HttpError(409,'Retry already started, a newer delivery exists, or the reason is invalid');
  retryId=claimed;
  const reference=attempt.channel==='whatsapp'?(await sendWhatsAppTextMessage({to:recipient.phone.replace(/\D/g,''),text:message.content,phoneNumberId:credentials!.phoneNumberId,accessToken:credentials!.accessToken})).messageId:(await sendSms({to:recipient.phone,message:message.content})).reference;
  if(!reference)throw new Error('Provider acceptance was not confirmed');
  const {error:saveError}=await admin.from('communication_delivery_attempts').update({status:'sent',provider_reference:reference}).eq('id',retryId);
  if(saveError)throw saveError;
  const {error:logError}=await admin.from('platform_delivery_retries').update({state:'sent'}).eq('retry_attempt_id',retryId);
  if(logError)throw logError;
  return jsonResponse(200,{success:true,retryAttemptId:retryId},req);
 }catch(error){
  if(retryId){await createAdminClient().from('platform_delivery_retries').update({state:'unknown'}).eq('retry_attempt_id',retryId);}
  return jsonResponse(error instanceof HttpError?error.status:500,{error:safeErrorMessage(error,'Provider outcome is uncertain. Review delivery history before retrying.')},req);
 }
});

import { createAdminClient,requireAuthenticatedUser } from '../_shared/supabase.ts';
import { getCorsHeaders,HttpError,jsonResponse,safeErrorMessage } from '../_shared/http.ts';
import { sendBrandedTransactionalEmail } from '../_shared/resend-mail.ts';
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:getCorsHeaders(req)});
 let claimedCase:string|null=null;
 try{
  if(req.method!=='POST')throw new HttpError(405,'Method not allowed');
  const {userClient}=await requireAuthenticatedUser(req.headers.get('Authorization'));
  const {caseId,action,evidence}=await req.json();
  if(!/^[0-9a-f-]{36}$/i.test(caseId||'')||!['approve','execute'].includes(action))throw new HttpError(400,'Valid case and recovery action required');
  const admin=createAdminClient();
  const {data:account,error}=await userClient.rpc(action==='approve'?'admin_approve_account_recovery':'admin_claim_account_recovery',action==='approve'?{p_case:caseId,p_evidence:evidence}:{p_case:caseId});
  if(error)throw new HttpError(403,'Recovery is not eligible, needs independent owner approval, or is still in its waiting period');
  if(action==='execute'){
   claimedCase=caseId;
   const {data:review,error:reviewError}=await admin.from('platform_account_recoveries').select('factor_ids').eq('case_id',caseId).single();
   if(reviewError)throw new Error('Recovery review unavailable');
   const {data:factors,error:listError}=await admin.auth.admin.mfa.listFactors({userId:account});
   if(listError||!factors)throw new Error('Authenticators unavailable');
   if(factors.factors.some(factor=>!review.factor_ids.includes(factor.id)))throw new Error('Authenticator changed during recovery');
   for(const factor of factors.factors){const {error}=await admin.auth.admin.mfa.deleteFactor({userId:account,id:factor.id});if(error)throw error;}
   const {error:completionError}=await admin.rpc('complete_admin_account_recovery',{p_case:caseId});
   if(completionError)throw completionError;
   claimedCase=null;
  }
  let emailDelivered=false;
  try{
   const {data}=await admin.auth.admin.getUserById(account);
   if(data.user?.email&&data.user.email_confirmed_at){
    const result=await sendBrandedTransactionalEmail({to:data.user.email,subject:action==='approve'?'Account recovery requested':'Account recovery completed',title:'BaytMiftah account security',body:action==='approve'?'An independent owner approved a request to reset your authenticator after identity verification. It cannot proceed for 24 hours. If you did not request this, open Security settings and cancel the request or contact support immediately.':'Your approved authenticator recovery was completed and existing sessions were signed out. Sign in and set up a new authenticator. Contact support immediately if you did not request this.',actionUrl:'/app/security'});
    emailDelivered=result.success;
   }
  }catch{/* In-app security notice was recorded atomically by the RPC. */}
  const {error:notificationError}=await admin.from('platform_account_recoveries').update({notification_error:!emailDelivered}).eq('case_id',caseId);
  if(notificationError)throw new Error('Recovery notification status could not be recorded');
  return jsonResponse(200,{success:true,emailDelivered},req,{'Cache-Control':'no-store'});
 }catch(error){
  if(claimedCase){await createAdminClient().from('platform_account_recoveries').update({state:'manual_review'}).eq('case_id',claimedCase).eq('state','processing');}
  return jsonResponse(error instanceof HttpError?error.status:500,{error:safeErrorMessage(error,'Recovery requires manual review before retrying')},req);
 }
});

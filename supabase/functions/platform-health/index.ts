import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";
import { getCorsHeaders, HttpError, jsonResponse, safeErrorMessage } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null,{headers:getCorsHeaders(req)});
  try {
    if (req.method !== "POST") throw new HttpError(405,"Method not allowed");
    const {userClient}=await requireAuthenticatedUser(req.headers.get("Authorization"));
    const {error:denied}=await userClient.rpc("require_platform_operations_access");
    if(denied) throw new HttpError(403,"Platform admin access and completed MFA are required");
    const admin=createAdminClient();
    const checks: Array<{name:string;status:string;latencyMs?:number;detail:string}>=[];
    async function probe(name:string,run:()=>Promise<string>) {
      const start=performance.now();
      try { const detail=await run(); checks.push({name,status:"ok",latencyMs:Math.round(performance.now()-start),detail}); }
      catch { checks.push({name,status:"failed",latencyMs:Math.round(performance.now()-start),detail:"Probe failed or timed out. Check service logs."}); }
    }
    const base=Deno.env.get("SUPABASE_URL")!;
    const appUrl=Deno.env.get("APP_HEALTH_URL");
    async function http(url:string,expectedType:string) {
      const response=await fetch(url,{signal:AbortSignal.timeout(5000),redirect:"error",
        headers:url.startsWith(`${base}/`)?{apikey:Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||""}:undefined});
      if(!response.ok || !response.headers.get("content-type")?.includes(expectedType)) throw new Error("Unexpected response");
      await response.body?.cancel();
      return `HTTP ${response.status}`;
    }
    await Promise.all([
      probe("Database / REST API",async()=>{
        const {error}=await admin.from("organizations").select("id",{head:true,count:"exact"}).abortSignal(AbortSignal.timeout(5000));
        if(error) throw error; return "Authenticated database query succeeded";
      }),
      probe("Authentication API",()=>http(`${base}/auth/v1/health`,"json")),
      probe("App version API",()=>http(`${base}/functions/v1/app-version`,"json")),
      ...(appUrl ? [probe("Web application",()=>http(appUrl,"text/html"))] : []),
    ]);
    if(!appUrl) checks.push({name:"Web application",status:"unconfigured",detail:"Set APP_HEALTH_URL to the deployed app URL; no app probe has run."});
    const since=new Date(Date.now()-86400000).toISOString();
    for(const [name,table,column,value] of [
      ["Failed automations","estate_automation_events","status","failed"],
      ["Queued owner statements","estate_owner_statement_deliveries","status","queued"],
    ]) {
      const {count,error}=await admin.from(table).select("id",{head:true,count:"exact"}).eq(column,value).abortSignal(AbortSignal.timeout(5000));
      checks.push({name,status:error?"unknown":count?"warning":"ok",detail:error?"Queue could not be queried":`${count||0} records`});
    }
    const {count:errors,error:eventsError}=await admin.from("operational_events").select("id",{head:true,count:"exact"})
      .in("severity",["error","critical"]).gte("created_at",since).abortSignal(AbortSignal.timeout(5000));
    checks.push({name:"Recorded application errors (24h)",status:eventsError?"unknown":errors?"warning":"ok",
      detail:eventsError?"Telemetry unavailable":`${errors||0} recorded errors; coverage depends on instrumented services`});
    const snapshot={checkedAt:new Date().toISOString(),checks,
      integrations:[
        {name:"PayAngels",configured:Boolean(Deno.env.get("PAYANGELS_API_KEY")||Deno.env.get("PAYANGELS_SECRET_KEY"))},
        {name:"Email",configured:Boolean(Deno.env.get("RESEND_API_KEY"))},
        {name:"AI",configured:Boolean(Deno.env.get("OPENAI_API_KEY")||Deno.env.get("QWEN_API_KEY"))},
      ]};
    const {error:saveError}=await admin.from("operational_events").insert({service:"platform-health",event_type:"health_snapshot",
      severity:checks.some(c=>c.status==="failed")?"error":"info",message:"Platform health probe completed",metadata:snapshot});
    return jsonResponse(200,{...snapshot,recorded:!saveError},req);
  } catch(error) {
    return jsonResponse(error instanceof HttpError?error.status:500,{error:safeErrorMessage(error,"Unable to check platform health")},req);
  }
});

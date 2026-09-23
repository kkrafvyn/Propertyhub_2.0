import { supabase } from "./supabase";
export type HealthSnapshot = {
  checkedAt: string; recorded: boolean;
  checks: Array<{ name: string; status: string; latencyMs?: number; detail: string }>;
  integrations: Array<{ name: string; configured: boolean }>;
};
export const platformOperationsService = {
  async checkHealth(): Promise<HealthSnapshot> {
    const {data,error}=await supabase.functions.invoke("platform-health",{body:{}});
    if(error) {
      const detail=await error.context?.json?.().catch(()=>null);
      throw new Error(detail?.error||error.message);
    }
    return data;
  },
  async activity(input: {organizationId?:string; department?:string; entity?:string; before?:number}={}) {
    let query=supabase.from("platform_activity").select("*").order("id",{ascending:false}).limit(50);
    if(input.organizationId) query=query.eq("organization_id",input.organizationId);
    if(input.department) query=query.eq("department_key",input.department);
    if(input.entity) query=query.eq("entity_type",input.entity);
    if(input.before) query=query.lt("id",input.before);
    const {data,error}=await query; if(error) throw error; return data||[];
  },
  async events() {
    const {data,error}=await supabase.from("operational_events").select("id,service,event_type,severity,message,created_at,organization_id")
      .neq("event_type","health_snapshot").order("created_at",{ascending:false}).limit(50);
    if(error) throw error; return data||[];
  },
  async sections(organizationId:string) {
    const {data,error}=await supabase.rpc("organization_admin_sections",{p_org:organizationId});
    if(error) throw error;
    return data as {organizationAdmin:boolean;departments:Array<{key:string;name:string}>};
  },
};

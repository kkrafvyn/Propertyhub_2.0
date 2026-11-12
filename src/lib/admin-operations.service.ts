import { supabase } from "./supabase";

export type AdminDataset =
  | "payments"
  | "propertyPayments"
  | "communications"
  | "ai"
  | "support"
  | "accounts";
export type AdminRecord = Record<string, unknown> & { id: string };
export type AdminFilters = {
  search: string;
  status: string;
  organization: string;
  page: number;
};
export const ADMIN_PAGE_SIZE = 25;
const datasets = {
  propertyPayments: {
    table:'property_transactions', columns:'id,organization_id,payer_user_id,provider_reference,amount_minor,currency,purpose,status,refund_status,refunded_amount_minor,paid_at,created_at',
    date:'created_at',status:'status',search:['provider_reference','purpose'],uuid:['id','organization_id','payer_user_id'],
  },
  payments: {
    table: "payment_transactions",
    columns:
      "id,user_id,amount,currency,status,payment_provider,payment_method,external_transaction_id,created_at,completed_at",
    date: "created_at",
    status: "status",
    search: ["external_transaction_id", "payment_provider"],
    uuid: ["id", "user_id"],
  },
  communications: {
    table: "communication_delivery_attempts",
    columns:
      "id,organization_id,conversation_id,message_id,recipient_user_id,channel,attempt_number,status,provider_reference,error_message,attempted_at",
    date: "attempted_at",
    status: "status",
    search: ["error_message", "provider_reference", "channel"],
    uuid: ["id", "organization_id", "recipient_user_id"],
  },
  ai: {
    table: "estate_ai_action_logs",
    columns:
      "id,organization_id,agent_type,trigger_type,action_status,created_at,risk_level,recommendation,target_type,target_id,requested_by,approved_by,decided_at",
    date: "created_at",
    status: "action_status",
    search: ["agent_type", "trigger_type", "recommendation"],
    uuid: ["id", "organization_id"],
  },
  support: {
    table: "platform_support_cases",
    columns: "*",
    date: "updated_at",
    status: "status",
    search: ["subject", "category"],
    uuid: ["id", "organization_id", "account_id", "assigned_to"],
  },
  accounts: {
    table: "users",
    columns: "id,email,full_name,phone,created_at",
    date: "created_at",
    status: "",
    search: ["email", "full_name", "phone"],
    uuid: ["id"],
  },
} as const;
export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Use allowlisted columns and strip PostgREST filter syntax from free text. */
export function adminSearchFilter(kind: AdminDataset, value: string) {
  const text = value
    .trim()
    .replace(/[^\p{L}\p{N}@ +_.:-]/gu, " ")
    .slice(0, 120);
  if (!text) return "";
  const definition = datasets[kind];
  return [
    ...definition.search.map((column) => `${column}.ilike.%${text}%`),
    ...(isUuid(text)
      ? definition.uuid.map((column) => `${column}.eq.${text}`)
      : []),
  ].join(",");
}

export async function fetchAdminRecords(
  kind: AdminDataset,
  filters: AdminFilters,
) {
  const definition = datasets[kind];
  let query = supabase
    .from(definition.table)
    .select(definition.columns, { count: "exact" });
  const search = adminSearchFilter(kind, filters.search);
  if (search) query = query.or(search);
  if (filters.status && definition.status)
    query = query.eq(definition.status, filters.status);
  if (
    filters.organization &&
    ["communications", "ai", "support", "propertyPayments"].includes(kind)
  ) {
    if (!isUuid(filters.organization))
      throw new Error("Enter a valid organization ID.");
    query = query.eq("organization_id", filters.organization);
  }
  const page = Math.max(0, Math.floor(filters.page));
  const { data, error, count } = await query
    .order(definition.date, { ascending: false })
    .order("id", { ascending: false })
    .range(page * ADMIN_PAGE_SIZE, (page + 1) * ADMIN_PAGE_SIZE - 1);
  if (error)
    throw new Error(
      error.code === "42P01" || error.code === "PGRST205"
        ? "This upgrade needs its database migration applied before it can be used."
        : error.message,
    );
  return { rows: (data || []) as unknown as AdminRecord[], count: count ?? 0 };
}

async function invoke(name: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}
export const adminOperationsService = {
  createPropertyPaymentCase(transaction:string,subject:string,note:string) {
    return invoke('admin_create_property_payment_case',{p_transaction:transaction,p_subject:subject,p_note:note});
  },
  async supportStaff(id:string) { return await invoke('admin_support_staff',{p_case:id}) as Array<{id:string;full_name:string|null;email:string|null}>; },
  setPriority(id:string,revision:number,priority:string){return invoke('admin_set_case_priority',{p_case:id,p_revision:revision,p_priority:priority});},
  remindOverdue(){return invoke('admin_remind_overdue_support',{});},
  async thread(id:string){
    const {data,error}=await supabase.from('platform_support_messages').select('id,author_id,content,created_at').eq('case_id',id).order('created_at').order('id');
    if(error)throw new Error(error.message);return(data||[]) as Array<{id:string;author_id:string;content:string;created_at:string}>;
  },
  sendReply(id:string,content:string){return invoke('support_send_message',{p_case:id,p_content:content});},
  createCustomerCase(subject:string,content:string){return invoke('customer_create_support_case',{p_subject:subject,p_message:content});},
  async attachments(id:string){
    const {data,error}=await supabase.from('platform_support_attachments').select('id,filename,storage_path,created_at').eq('case_id',id).order('created_at');
    if(error)throw new Error(error.message);return(data||[]) as Array<{id:string;filename:string;storage_path:string;created_at:string}>;
  },
  async uploadAttachment(id:string,file:File){
    if(!['application/pdf','image/png','image/jpeg'].includes(file.type)||file.size>10485760)throw new Error('Choose a PDF, PNG or JPEG up to 10 MB.');
    const extension=file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':'jpg';
    const path=`${id}/${crypto.randomUUID()}.${extension}`;
    const {error}=await supabase.storage.from('support-attachments').upload(path,file,{contentType:file.type,upsert:false});
    if(error)throw new Error(error.message);
    try{return await invoke('support_attach_file',{p_case:id,p_path:path,p_filename:file.name.slice(0,200)});}
    catch(error){await supabase.storage.from('support-attachments').remove([path]);throw error;}
  },
  async attachmentUrl(path:string){
    const {data,error}=await supabase.storage.from('support-attachments').createSignedUrl(path,60);
    if(error)throw new Error(error.message);return data.signedUrl;
  },
  async retryDelivery(attempt:string,reason:string){
    const {data,error}=await supabase.functions.invoke('admin-retry-delivery',{body:{attemptId:attempt,reason}});
    if(error)throw new Error('Retry could not be completed. Refresh the delivery history before trying again.');
    return data;
  },
  async recovery(id:string){
    const {data,error}=await supabase.from('platform_account_recoveries').select('state,ready_at,approved_by,notification_error').eq('case_id',id).maybeSingle();
    if(error)throw new Error(error.message);return data as {state:string;ready_at:string;approved_by:string;notification_error:boolean}|null;
  },
  async runRecovery(id:string,action:'approve'|'execute',evidence:string){
    const {data,error}=await supabase.functions.invoke('admin-account-recovery',{body:{caseId:id,action,evidence}});
    if(error)throw new Error('Recovery did not complete. Refresh the review status before retrying.');return data;
  },
  createCase(input: {
    subject: string;
    category: string;
    accountId?: string;
    organizationId?: string;
    sourceId?: string;
    note: string;
  }) {
    if (input.subject.trim().length < 3 || input.note.trim().length < 10)
      throw new Error("Add a subject and at least ten characters of context.");
    for (const id of [input.accountId, input.organizationId, input.sourceId])
      if (id && !isUuid(id)) throw new Error("Enter valid IDs.");
    return invoke("admin_create_support_case", {
      p_subject: input.subject.trim(),
      p_category: input.category,
      p_account: input.accountId || null,
      p_organization: input.organizationId || null,
      p_source: input.sourceId || null,
      p_note: input.note.trim(),
    });
  },
  async caseHistory(id: string) {
    const { data, error } = await supabase
      .from("platform_support_case_events")
      .select("id,actor_id,note,created_at")
      .eq("case_id", id)
      .order("created_at")
      .order("id");
    if (error) throw new Error(error.message);
    return (data || []) as Array<{
      id: string;
      actor_id: string;
      note: string;
      created_at: string;
    }>;
  },
  updateCase(
    id: string,
    revision: number,
    status: string,
    assignee: string | null,
    note: string,
  ) {
    return invoke("admin_update_support_case", {
      p_id: id,
      p_revision: revision,
      p_status: status,
      p_assignee: assignee,
      p_note: note.trim(),
    });
  },
  decideAi(id: string, decision: "approved" | "rejected", note: string) {
    return invoke("admin_decide_ai_action", {
      p_id: id,
      p_decision: decision,
      p_note: note.trim(),
    });
  },
  async aiControls(organization: string) {
    const { data, error } = await supabase
      .from("ai_agent_controls")
      .select("agent_name,enabled,daily_action_budget,updated_at")
      .eq("organization_id", organization)
      .order("agent_name");
    if (error) throw new Error(error.message);
    return (data || []) as Array<{
      agent_name: string;
      enabled: boolean;
      daily_action_budget: number;
      updated_at: string;
    }>;
  },
  setAiControl(
    organization: string,
    agent: string,
    enabled: boolean,
    budget: number,
  ) {
    if (
      !isUuid(organization) ||
      !Number.isInteger(budget) ||
      budget < 0 ||
      budget > 100000
    )
      throw new Error(
        "Enter a valid organization and a whole-number daily budget from 0 to 100000.",
      );
    return invoke("admin_set_ai_control", {
      p_organization: organization,
      p_agent: agent,
      p_enabled: enabled,
      p_budget: budget,
    });
  },
  async communicationHealth(organization: string) {
    if (organization && !isUuid(organization))
      throw new Error("Enter a valid organization ID.");
    const { data, error } = await supabase.functions.invoke(
      "admin-communication-health",
      { body: { organizationId: organization || null } },
    );
    if (error)
      throw new Error(
        "Connection checks failed. Confirm the diagnostics function is deployed and your communications access is active.",
      );
    return data as {
      checks: Array<{ name: string; ready: boolean; detail: string }>;
      checkedAt: string;
    };
  },
};

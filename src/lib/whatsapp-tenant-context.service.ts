import { supabase } from "./supabase";
import { mapBotContextFromRpc, type GroupBotContext } from "./whatsapp-group-bot-core";

/** Client-safe wrapper: production RPC is service_role-only (webhook). Returns empty context on denial. */
export const whatsappTenantContextService = {
  async getBotContext(organizationId: string, phone: string): Promise<GroupBotContext> {
    const { data, error } = await supabase.rpc("get_whatsapp_bot_context_for_org_member", {
      p_organization_id: organizationId,
      p_phone: phone,
    });
    if (error) {
      if (import.meta.env.DEV) {
        console.warn("[whatsapp] get_whatsapp_bot_context_for_org_member unavailable", error.message);
      }
      return {};
    }
    return mapBotContextFromRpc(data as Record<string, unknown> | null);
  },
};

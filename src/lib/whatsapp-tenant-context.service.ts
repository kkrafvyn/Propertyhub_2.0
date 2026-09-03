import { supabase } from "./supabase";
import { mapBotContextFromRpc, type GroupBotContext } from "./whatsapp-group-bot-core";

export const whatsappTenantContextService = {
  async getBotContext(organizationId: string, phone: string): Promise<GroupBotContext> {
    const { data, error } = await supabase.rpc("get_whatsapp_bot_context", {
      p_organization_id: organizationId,
      p_phone: phone,
    });
    if (error) throw error;
    return mapBotContextFromRpc(data as Record<string, unknown> | null);
  },
};

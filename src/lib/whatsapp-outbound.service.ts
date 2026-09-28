import { supabase } from "./supabase";

export const whatsappOutboundService = {
  async sendMessage(input: { to: string; message: string; organizationId: string }) {
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: input,
    });
    if (error) throw error;
    return data as { success: boolean; messageId?: string; simulated?: boolean };
  },
};

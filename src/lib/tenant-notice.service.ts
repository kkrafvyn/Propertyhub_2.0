import { supabase } from "./supabase";
import { notificationService } from "./notification.service";

export const tenantNoticeService = {
  async getTenantNotices(userId: string) {
    const { data, error } = await supabase
      .from("tenant_notices")
      .select(`
        *,
        organization:organizations(name, slug),
        lease:leases(
          listing:listings(property:properties(address, city))
        )
      `)
      .eq("tenant_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getOrganizationNotices(organizationId: string) {
    const { data, error } = await supabase
      .from("tenant_notices")
      .select(`
        *,
        tenant:users(full_name, email)
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async sendNotice(input: {
    organizationId: string;
    tenantUserId: string;
    leaseId?: string | null;
    createdBy: string;
    noticeType?: string;
    title: string;
    body: string;
  }) {
    const { data, error } = await supabase
      .from("tenant_notices")
      .insert({
        organization_id: input.organizationId,
        tenant_user_id: input.tenantUserId,
        lease_id: input.leaseId || null,
        created_by: input.createdBy,
        notice_type: input.noticeType || "general",
        title: input.title,
        body: input.body,
        status: "sent",
      })
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyUser({
      userId: input.tenantUserId,
      notificationType: "tenant_notice",
      subject: input.title,
      content: input.body.slice(0, 280),
      category: "System",
      actionUrl: "/app/leases",
      metadata: { noticeId: data.id },
    });

    return data;
  },

  async acknowledgeNotice(noticeId: string, userId: string) {
    const { data, error } = await supabase
      .from("tenant_notices")
      .update({
        status: "acknowledged",
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", noticeId)
      .eq("tenant_user_id", userId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },
};

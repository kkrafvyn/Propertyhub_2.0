import { supabase } from "./supabase";
import { notificationService } from "./notification.service";
import { ownerOversightService } from "./owner-oversight.service";

const db = supabase as any;

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
        tenant:users!tenant_notices_tenant_user_id_fkey(full_name, email)
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
      organizationId: input.organizationId,
      metadata: { noticeId: data.id, organization_id: input.organizationId },
    });

    const noticeType = String(input.noticeType || "").toLowerCase();
    if (noticeType.includes("terminat") || noticeType.includes("evict") || noticeType.includes("end_lease")) {
      void (async () => {
        try {
          let propertyId: string | null = null;
          if (input.leaseId) {
            const { data: lease } = await db
              .from("leases")
              .select("property_id, listing:listings(property_id, organization:organizations(slug))")
              .eq("id", input.leaseId)
              .maybeSingle();
            propertyId = lease?.property_id || lease?.listing?.property_id || null;
          }
          if (!propertyId) return;
          const { data: agreement } = await db
            .from("property_management_agreements")
            .select("*")
            .eq("property_id", propertyId)
            .eq("managing_organization_id", input.organizationId)
            .eq("status", "active")
            .limit(1)
            .maybeSingle();
          if (!agreement) return;
          const { data: org } = await db
            .from("organizations")
            .select("slug")
            .eq("id", input.organizationId)
            .maybeSingle();
          await ownerOversightService.notifyOwnerCritical({
            ownerUserId: agreement.owner_user_id,
            organizationId: input.organizationId,
            organizationSlug: org?.slug || null,
            kind: "lease_termination",
            subject: "Lease termination notice sent",
            content: input.title,
            tab: "activity",
          });
        } catch (error) {
          console.error("Owner lease termination notify failed:", error);
        }
      })();
    }

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

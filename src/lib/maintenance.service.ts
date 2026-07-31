import { supabase } from "./supabase";
import { notificationService } from "./notification.service";
import { validateClientUpload } from "./security/upload-validation";

const MAINTENANCE_MEDIA_BUCKET = "maintenance-media";

export const maintenanceService = {
  async getTenantRequests(userId: string) {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .select(`
        *,
        lease:leases(
          id,
          listing:listings(property:properties(address, city))
        )
      `)
      .eq("tenant_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createRequest(input: {
    tenantUserId: string;
    organizationId: string;
    leaseId?: string | null;
    listingId?: string | null;
    title: string;
    description: string;
    priority?: "low" | "normal" | "high" | "urgent";
    photoUrls?: string[];
  }) {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .insert({
        tenant_user_id: input.tenantUserId,
        organization_id: input.organizationId,
        lease_id: input.leaseId || null,
        listing_id: input.listingId || null,
        title: input.title,
        description: input.description,
        priority: input.priority || "normal",
        photo_urls: input.photoUrls || [],
      })
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyMaintenanceEvent(data.id, "created", {
      actorUserId: input.tenantUserId,
    });

    return data;
  },

  async uploadRequestPhotos(input: {
    organizationId: string;
    requestId: string;
    files: File[];
  }) {
    const uploadedUrls: string[] = [];

    for (const file of input.files) {
      validateClientUpload({ file, maxBytes: 10 * 1024 * 1024 });
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${input.organizationId}/${input.requestId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(MAINTENANCE_MEDIA_BUCKET)
        .upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;
      uploadedUrls.push(path);
    }

    if (uploadedUrls.length === 0) return [];

    const { data: existing } = await supabase
      .from("maintenance_requests")
      .select("photo_urls")
      .eq("id", input.requestId)
      .single();

    const nextUrls = [...(existing?.photo_urls || []), ...uploadedUrls];
    const { data, error } = await supabase
      .from("maintenance_requests")
      .update({ photo_urls: nextUrls, updated_at: new Date().toISOString() })
      .eq("id", input.requestId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async getPhotoSignedUrl(path: string, expiresIn = 300) {
    const { data, error } = await supabase.storage
      .from(MAINTENANCE_MEDIA_BUCKET)
      .createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data?.signedUrl || null;
  },

  async submitTenantRating(
    requestId: string,
    userId: string,
    rating: number,
    comment?: string
  ) {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .update({
        tenant_rating: rating,
        tenant_rating_comment: comment || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("tenant_user_id", userId)
      .eq("status", "resolved")
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async assignVendor(requestId: string, vendorId: string) {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .update({ vendor_id: vendorId, status: "in_progress" })
      .eq("id", requestId)
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyMaintenanceEvent(requestId, "status_updated", {
      status: "in_progress",
    });

    return data;
  },

  async updateRequestStatus(
    requestId: string,
    status: "open" | "in_progress" | "resolved" | "cancelled"
  ) {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .update({
        status,
        resolved_at: status === "resolved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyMaintenanceEvent(requestId, "status_updated", {
      status,
    });

    return data;
  },

  async getOrganizationRequests(organizationId: string) {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .select(`
        *,
        tenant:users(full_name, email, phone),
        vendor:vendors(id, business_name, phone),
        lease:leases(
          listing:listings(property:properties(address, city))
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

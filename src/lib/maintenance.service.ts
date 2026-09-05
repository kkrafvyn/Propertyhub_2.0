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

  async assignToUser(requestId: string, userId: string) {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .update({
        assigned_to_user_id: userId,
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async createContractorAccessLink(input: {
    organizationId: string;
    requestId: string;
    recipientEmail?: string;
    label?: string;
  }) {
    const { externalAccessService } = await import("./external-access.service");
    const grant = await externalAccessService.createGrant({
      organizationId: input.organizationId,
      resourceType: "maintenance_request",
      resourceId: input.requestId,
      recipientEmail: input.recipientEmail,
      label: input.label || "Maintenance assignment",
    });
    return externalAccessService.buildAccessUrl(grant.access_token);
  },

  async assignVendor(
    requestId: string,
    vendorId: string,
    organizationId?: string,
    baseUpdatedAt?: string | null,
  ) {
    let serverUpdatedAt = baseUpdatedAt ?? null;
    if (typeof navigator !== "undefined" && navigator.onLine && serverUpdatedAt == null) {
      const { data: existing } = await supabase
        .from("maintenance_requests")
        .select("updated_at")
        .eq("id", requestId)
        .maybeSingle();
      serverUpdatedAt = existing?.updated_at ?? null;
    }

    const payload = {
      vendor_id: vendorId,
      status: "in_progress" as const,
      updated_at: new Date().toISOString(),
    };

    if (typeof navigator !== "undefined" && !navigator.onLine && organizationId) {
      const { workspaceSyncService } = await import("./workspace-sync.service");
      await workspaceSyncService.queueMaintenanceAssign({
        organizationId,
        requestId,
        vendorId,
        baseUpdatedAt: serverUpdatedAt,
      });
      return { id: requestId, ...payload, offlineQueued: true };
    }

    const { data, error } = await supabase
      .from("maintenance_requests")
      .update(payload)
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
    status: "open" | "in_progress" | "resolved" | "cancelled",
    organizationId?: string,
    baseUpdatedAt?: string | null,
  ) {
    let serverUpdatedAt = baseUpdatedAt ?? null;
    if (typeof navigator !== "undefined" && navigator.onLine && serverUpdatedAt == null) {
      const { data: existing } = await supabase
        .from("maintenance_requests")
        .select("updated_at")
        .eq("id", requestId)
        .maybeSingle();
      serverUpdatedAt = existing?.updated_at ?? null;
    }

    const payload = {
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (typeof navigator !== "undefined" && !navigator.onLine && organizationId) {
      const { workspaceSyncService } = await import("./workspace-sync.service");
      await workspaceSyncService.queueMaintenanceUpdate({
        organizationId,
        requestId,
        payload,
        baseUpdatedAt: serverUpdatedAt,
      });
      return { id: requestId, ...payload, offlineQueued: true };
    }

    const { data, error } = await supabase
      .from("maintenance_requests")
      .update(payload)
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
          listing:listings(property:properties(id, address, city))
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

import { supabase } from "./supabase";
import { validateStoragePath } from "./security/upload-validation";
import { notificationService } from "./notification.service";
import { validateClientUpload, validateFileSignature } from "./security/upload-validation";

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
    onProgress?: (completed: number, total: number) => void;
  }) {
    if (input.files.length > 10) throw new Error('Upload at most ten photos at once');
    for (const file of input.files) {
      validateClientUpload({ file, maxBytes: 10 * 1024 * 1024 });
      await validateFileSignature(file);
    }
    const paths: string[] = [];
    const newlyUploaded: string[] = [];
    const bucket = supabase.storage.from(MAINTENANCE_MEDIA_BUCKET);
    try {
      for (const file of input.files) {
        const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
        const digest = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2,'0')).join('');
        const mimeType = file.type.toLowerCase();
        const extension = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'} as Record<string,string>)[mimeType];
        const path = `${input.organizationId}/${input.requestId}/${digest}.${extension}`;
        const { error } = await bucket.upload(path, file, { contentType: mimeType, upsert: false });
        // Storage versions expose conflicts as either 409 or the Duplicate code.
        // The append RPC verifies that the exact object exists and is authorized.
        if (error && String(error.statusCode) !== '409' && error.name !== 'Duplicate') throw error;
        if (!error) newlyUploaded.push(path);
        paths.push(path); input.onProgress?.(paths.length, input.files.length);
      }
      if (!paths.length) return [];
      const {data,error}=await supabase.rpc('append_maintenance_photos',{p_request_id:input.requestId,p_paths:paths});
      if(error)throw error;
      return data;
    } catch (error) {
      // Server policy protects linked files if an append succeeded but its response was lost.
      if (newlyUploaded.length) {
        let cleanupFailed = false;
        try { cleanupFailed = Boolean((await bucket.remove(newlyUploaded)).error); }
        catch { cleanupFailed = true; }
        if (cleanupFailed) {
          throw new Error('Photos could not be attached and temporary files could not be removed. Retry the upload to reuse those files.', { cause: error });
        }
      }
      throw error;
    }
  },

  async getPhotoSignedUrl(path: string, expiresIn = 300) {
    const safePath = validateStoragePath(path);
    const { data, error } = await supabase.storage
      .from(MAINTENANCE_MEDIA_BUCKET)
      .createSignedUrl(safePath, expiresIn);
    if (error) throw error;
    return data?.signedUrl || null;
  },

  async submitTenantRating(
    requestId: string,
    userId: string,
    rating: number,
    comment?: string
  ) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("Rating must be an integer between 1 and 5");
    }
    if (comment && comment.trim().length > 2000) {
      throw new Error("Rating comment must be 2,000 characters or fewer");
    }
    const { data: session, error: sessionError } = await supabase.auth.getUser();
    if (sessionError || !session.user || session.user.id !== userId) {
      throw new Error("Sign in as the tenant who submitted this request");
    }
    const { data, error } = await supabase.rpc("submit_maintenance_rating", {
      p_request_id: requestId,
      p_rating: rating,
      p_comment: comment?.trim() || null,
    });

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
        tenant:users!maintenance_requests_tenant_user_id_fkey(full_name, email, phone),
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

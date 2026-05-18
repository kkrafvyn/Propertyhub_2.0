import { supabase } from "./supabase";

const db = supabase as any;

type SmartAccessProvider = "ttlock" | "yale" | "tuya" | "manual";
type SmartDeviceType =
  | "smart_lock"
  | "gate_access"
  | "smart_meter"
  | "door_sensor"
  | "motion_sensor"
  | "energy_monitor";

async function sha256Hex(payload: Record<string, unknown>) {
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function viewingWindow(viewing: any) {
  const scheduled = new Date(viewing.confirmed_datetime || viewing.requested_datetime);
  const durationMinutes = Number(viewing.duration_minutes || 45);
  const startsAt = new Date(scheduled.getTime() - 15 * 60 * 1000);
  const endsAt = new Date(scheduled.getTime() + (durationMinutes + 15) * 60 * 1000);

  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

async function appendAccessEvent(input: {
  organizationId: string;
  propertyId: string;
  grantId?: string | null;
  actorUserId?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
}) {
  const eventHash = await sha256Hex({
    eventType: input.eventType,
    payload: input.payload,
    createdAt: new Date().toISOString(),
  });

  const { error } = await db.from("property_iot_access_events").insert({
    organization_id: input.organizationId,
    property_id: input.propertyId,
    grant_id: input.grantId || null,
    actor_user_id: input.actorUserId || null,
    event_type: input.eventType,
    event_payload: input.payload,
    event_hash: eventHash,
  });

  if (error) throw error;
}

async function manageSmartAccess<T = any>(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("manage-smart-access", {
    body,
  });

  if (error) throw error;
  return data as T;
}

export const smartAccessService = {
  async getOrganizationDevices(organizationId: string) {
    const { data, error } = await db
      .from("property_iot_devices")
      .select(
        `
        *,
        property:properties(id, address, city, region),
        listing:listings(id, price, currency, listing_type)
      `
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async registerDevice(input: {
    organizationId: string;
    propertyId: string;
    listingId?: string | null;
    provider: SmartAccessProvider;
    deviceType: SmartDeviceType;
    displayName: string;
    roomLabel?: string | null;
    providerDeviceId?: string | null;
    status?: "online" | "offline" | "needs_attention" | "disabled";
    createdBy?: string | null;
  }) {
    const { data, error } = await db
      .from("property_iot_devices")
      .insert({
        organization_id: input.organizationId,
        property_id: input.propertyId,
        listing_id: input.listingId || null,
        provider: input.provider,
        device_type: input.deviceType,
        display_name: input.displayName,
        room_label: input.roomLabel || null,
        provider_device_id: input.providerDeviceId || null,
        status: input.status || "offline",
        created_by: input.createdBy || null,
        metadata: {
          source: "workspace_smart_access",
        },
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async getOrganizationAccessGrants(organizationId: string) {
    const { data, error } = await db
      .from("property_iot_access_grants")
      .select(
        `
        *,
        property:properties(id, address, city, region),
        listing:listings(id, price, currency, listing_type),
        viewing:property_viewings(id, status, requested_datetime, confirmed_datetime),
        granted_to:users!property_iot_access_grants_granted_to_user_id_fkey(id, full_name, email)
      `
      )
      .eq("organization_id", organizationId)
      .order("starts_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getUserAccessGrants(userId: string) {
    const { data, error } = await db
      .from("property_iot_access_grants")
      .select(
        `
        *,
        property:properties(id, address, city, region),
        listing:listings(id, price, currency, listing_type),
        organization:organizations(id, name, slug)
      `
      )
      .eq("granted_to_user_id", userId)
      .order("starts_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createAccessGrant(input: {
    organizationId: string;
    propertyId: string;
    listingId?: string | null;
    viewingId?: string | null;
    escrowId?: string | null;
    dealCaseId?: string | null;
    grantedToUserId: string;
    grantedByUserId?: string | null;
    accessReason: "viewing" | "tenancy" | "maintenance" | "owner" | "admin" | "emergency";
    accessScope?: "temporary_code" | "digital_key" | "read_only_meter" | "entry_log_only";
    deviceIds?: string[];
    startsAt: string;
    endsAt: string;
    status?: "pending" | "active" | "expired" | "revoked" | "failed" | "frozen";
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("property_iot_access_grants")
      .insert({
        organization_id: input.organizationId,
        property_id: input.propertyId,
        listing_id: input.listingId || null,
        viewing_id: input.viewingId || null,
        escrow_id: input.escrowId || null,
        deal_case_id: input.dealCaseId || null,
        granted_to_user_id: input.grantedToUserId,
        granted_by_user_id: input.grantedByUserId || null,
        access_reason: input.accessReason,
        access_scope: input.accessScope || "temporary_code",
        device_ids: input.deviceIds || [],
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        status: input.status || "pending",
        access_code_hint: "Generated by provider after sync",
        metadata: input.metadata || {},
      })
      .select("*")
      .single();

    if (error) throw error;

    await appendAccessEvent({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      grantId: data.id,
      actorUserId: input.grantedByUserId || null,
      eventType: "grant_created",
      payload: {
        grantId: data.id,
        accessReason: input.accessReason,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      },
    });

    return data;
  },

  async generateViewingCode(grantId: string) {
    const result = await manageSmartAccess<{ grant: any }>({
      action: "generate_viewing_code",
      grantId,
    });
    return result.grant;
  },

  async sendAccessGrant(grantId: string) {
    const result = await manageSmartAccess<{ grant: any }>({
      action: "send_access_grant",
      grantId,
    });
    return result.grant;
  },

  async revokeAccessGrant(grantId: string, _actorUserId?: string | null) {
    const result = await manageSmartAccess<{ grant: any }>({
      action: "revoke_access_grant",
      grantId,
    });
    return result.grant;
  },

  async syncDeviceHealth(deviceId: string) {
    const result = await manageSmartAccess<{ device: any }>({
      action: "sync_device_health",
      deviceId,
    });
    return result.device;
  },

  async queueViewingAccessHook(viewing: any) {
    if (!["confirmed", "rescheduled"].includes(String(viewing.status || ""))) {
      return null;
    }

    const { data: devices, error: deviceError } = await db
      .from("property_iot_devices")
      .select("id, device_type, status")
      .eq("organization_id", viewing.organization_id)
      .eq("property_id", viewing.property_id)
      .in("device_type", ["smart_lock", "gate_access"])
      .neq("status", "disabled");

    if (deviceError) throw deviceError;

    if (!devices?.length) {
      await db
        .from("property_viewings")
        .update({
          smart_access_status: "not_enabled",
          smart_access_metadata: {
            checkedAt: new Date().toISOString(),
            reason: "No access devices registered for this property.",
          },
        })
        .eq("id", viewing.id);
      return null;
    }

    const window = viewingWindow(viewing);
    const grant = await this.createAccessGrant({
      organizationId: viewing.organization_id,
      propertyId: viewing.property_id,
      listingId: viewing.listing_id,
      viewingId: viewing.id,
      dealCaseId: viewing.deal_case_id || null,
      grantedToUserId: viewing.user_id,
      grantedByUserId: viewing.assigned_to || null,
      accessReason: "viewing",
      accessScope: "temporary_code",
      deviceIds: devices.map((device: any) => device.id),
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      metadata: {
        source: "viewing_confirmation",
        deviceCount: devices.length,
      },
    });

    await db
      .from("property_viewings")
      .update({
        smart_access_status: "queued",
        smart_access_grant_id: grant.id,
        smart_access_metadata: {
          grantId: grant.id,
          queuedAt: new Date().toISOString(),
          deviceCount: devices.length,
          startsAt: window.startsAt,
          endsAt: window.endsAt,
        },
      })
      .eq("id", viewing.id);

    return grant;
  },
};

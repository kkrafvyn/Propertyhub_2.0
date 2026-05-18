import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { sha256Hex } from "../_shared/cryptographic-audit.ts";
import {
  buildSmartAccessCode,
  publicCodeHint,
  safeSmartAccessRequest,
  sendSmartAccessProviderCommand,
} from "../_shared/iot-provider-service.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

type SmartAccessAction =
  | "generate_viewing_code"
  | "send_access_grant"
  | "revoke_access_grant"
  | "sync_device_health";

async function requireOrganizationManager(admin: any, userId: string, organizationId: string) {
  const { data: adminRow, error: adminError } = await admin
    .from("platform_admins")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (adminError) throw new HttpError(500, adminError.message);
  if (adminRow) return;

  const { data, error } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data || !["owner", "manager", "agent"].includes(data.role)) {
    throw new HttpError(403, "You are not allowed to manage Smart Property Access");
  }
}

async function getGrant(admin: any, grantId: string) {
  const { data, error } = await admin
    .from("property_iot_access_grants")
    .select("*")
    .eq("id", grantId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, "Access grant not found");
  return data;
}

async function getDevice(admin: any, deviceId: string) {
  const { data, error } = await admin
    .from("property_iot_devices")
    .select("*")
    .eq("id", deviceId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, "Smart access device not found");
  return data;
}

async function getGrantDevices(admin: any, grant: any) {
  const deviceIds = Array.isArray(grant.device_ids) ? grant.device_ids : [];
  if (deviceIds.length === 0) return [];

  const { data, error } = await admin
    .from("property_iot_devices")
    .select("*")
    .in("id", deviceIds);

  if (error) throw new HttpError(500, error.message);
  return data || [];
}

async function appendCommandEvent(input: {
  admin: any;
  organizationId: string;
  propertyId?: string | null;
  listingId?: string | null;
  deviceId?: string | null;
  grantId?: string | null;
  actorUserId: string;
  provider: string;
  commandType: SmartAccessAction;
  commandStatus: string;
  providerReference?: string | null;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  errorMessage?: string | null;
}) {
  const { error } = await input.admin.from("property_iot_command_events").insert({
    organization_id: input.organizationId,
    property_id: input.propertyId || null,
    listing_id: input.listingId || null,
    device_id: input.deviceId || null,
    grant_id: input.grantId || null,
    actor_user_id: input.actorUserId,
    provider: input.provider,
    command_type: input.commandType,
    command_status: input.commandStatus,
    provider_reference: input.providerReference || null,
    request_payload: input.requestPayload || {},
    response_payload: input.responsePayload || {},
    error_message: input.errorMessage || null,
  });

  if (error) throw new HttpError(500, error.message);
}

async function appendAccessEvent(input: {
  admin: any;
  organizationId: string;
  propertyId: string;
  deviceId?: string | null;
  grantId?: string | null;
  actorUserId: string;
  eventType:
    | "code_generated"
    | "grant_sent"
    | "grant_revoked"
    | "provider_error";
  payload: Record<string, unknown>;
}) {
  const eventHash = await sha256Hex(JSON.stringify(input.payload));
  const { error } = await input.admin.from("property_iot_access_events").insert({
    organization_id: input.organizationId,
    property_id: input.propertyId,
    device_id: input.deviceId || null,
    grant_id: input.grantId || null,
    actor_user_id: input.actorUserId,
    event_type: input.eventType,
    event_payload: input.payload,
    event_hash: eventHash,
  });

  if (error) throw new HttpError(500, error.message);
}

async function runGrantCommand(input: {
  admin: any;
  action: Exclude<SmartAccessAction, "sync_device_health">;
  userId: string;
  grant: any;
}) {
  await requireOrganizationManager(input.admin, input.userId, input.grant.organization_id);

  const devices = await getGrantDevices(input.admin, input.grant);
  if (devices.length === 0) {
    throw new HttpError(400, "Add at least one smart access device to this grant first");
  }

  const generatedCode =
    input.action === "generate_viewing_code" ? buildSmartAccessCode() : undefined;
  const providerResults: Record<string, unknown>[] = [];
  const providerErrors: Record<string, unknown>[] = [];

  for (const device of devices) {
    const providerPayload = {
      command: input.action,
      deviceId: device.provider_device_id || device.id,
      deviceType: device.device_type,
      grantId: input.grant.id,
      accessReason: input.grant.access_reason,
      startsAt: input.grant.starts_at,
      endsAt: input.grant.ends_at,
      ...(generatedCode ? { code: generatedCode } : {}),
    };

    try {
      const providerResult = await sendSmartAccessProviderCommand({
        provider: device.provider,
        command: input.action,
        payload: providerPayload,
      });

      providerResults.push({
        deviceId: device.id,
        provider: device.provider,
        providerReference: providerResult.providerReference,
        commandStatus: providerResult.commandStatus,
      });

      await appendCommandEvent({
        admin: input.admin,
        organizationId: input.grant.organization_id,
        propertyId: input.grant.property_id,
        listingId: input.grant.listing_id,
        deviceId: device.id,
        grantId: input.grant.id,
        actorUserId: input.userId,
        provider: device.provider,
        commandType: input.action,
        commandStatus: providerResult.commandStatus,
        providerReference: providerResult.providerReference,
        requestPayload: safeSmartAccessRequest(providerPayload),
        responsePayload: safeSmartAccessRequest(providerResult.responsePayload),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Provider command failed";
      providerErrors.push({
        deviceId: device.id,
        provider: device.provider,
        error: message,
      });

      await appendCommandEvent({
        admin: input.admin,
        organizationId: input.grant.organization_id,
        propertyId: input.grant.property_id,
        listingId: input.grant.listing_id,
        deviceId: device.id,
        grantId: input.grant.id,
        actorUserId: input.userId,
        provider: device.provider,
        commandType: input.action,
        commandStatus: "failed",
        requestPayload: safeSmartAccessRequest(providerPayload),
        errorMessage: message,
      });

      await appendAccessEvent({
        admin: input.admin,
        organizationId: input.grant.organization_id,
        propertyId: input.grant.property_id,
        deviceId: device.id,
        grantId: input.grant.id,
        actorUserId: input.userId,
        eventType: "provider_error",
        payload: {
          action: input.action,
          provider: device.provider,
          error: message,
        },
      });
    }
  }

  if (providerResults.length === 0) {
    await input.admin
      .from("property_iot_access_grants")
      .update({
        status: "failed",
        metadata: {
          ...(input.grant.metadata || {}),
          providerErrors,
        },
      })
      .eq("id", input.grant.id);

    throw new HttpError(502, "No smart access provider command succeeded");
  }

  const nextStatus = input.action === "revoke_access_grant" ? "revoked" : "active";
  const accessCodeHint = generatedCode ? publicCodeHint(generatedCode) : input.grant.access_code_hint;
  const { data: updatedGrant, error: updateError } = await input.admin
    .from("property_iot_access_grants")
    .update({
      status: nextStatus,
      access_code_hint: accessCodeHint || null,
      provider_reference:
        providerResults
          .map((result) => result.providerReference)
          .filter(Boolean)
          .join(",") || input.grant.provider_reference,
      metadata: {
        ...(input.grant.metadata || {}),
        lastCommand: input.action,
        providerResults,
        providerErrors,
      },
    })
    .eq("id", input.grant.id)
    .select("*")
    .single();

  if (updateError) throw new HttpError(500, updateError.message);

  await appendAccessEvent({
    admin: input.admin,
    organizationId: input.grant.organization_id,
    propertyId: input.grant.property_id,
    grantId: input.grant.id,
    actorUserId: input.userId,
    eventType:
      input.action === "revoke_access_grant"
        ? "grant_revoked"
        : input.action === "send_access_grant"
          ? "grant_sent"
          : "code_generated",
    payload: {
      action: input.action,
      accessCodeHint,
      providerResults,
      providerErrors,
    },
  });

  return updatedGrant;
}

async function syncDeviceHealth(input: { admin: any; userId: string; deviceId: string }) {
  const device = await getDevice(input.admin, input.deviceId);
  await requireOrganizationManager(input.admin, input.userId, device.organization_id);

  const payload = {
    command: "sync_device_health",
    deviceId: device.provider_device_id || device.id,
    deviceType: device.device_type,
  };
  const providerResult = await sendSmartAccessProviderCommand({
    provider: device.provider,
    command: "sync_device_health",
    payload,
  });
  const responsePayload = providerResult.responsePayload || {};
  const nextStatus =
    typeof responsePayload.status === "string" ? responsePayload.status : "online";
  const nextBattery =
    typeof responsePayload.batteryPercent === "number"
      ? responsePayload.batteryPercent
      : typeof responsePayload.battery_percent === "number"
        ? responsePayload.battery_percent
        : device.battery_percent;

  const { data: updatedDevice, error: updateError } = await input.admin
    .from("property_iot_devices")
    .update({
      status: ["online", "offline", "needs_attention", "disabled"].includes(nextStatus)
        ? nextStatus
        : device.status,
      battery_percent: nextBattery,
      last_seen_at: new Date().toISOString(),
      metadata: {
        ...(device.metadata || {}),
        lastHealthResponse: safeSmartAccessRequest(responsePayload),
      },
    })
    .eq("id", device.id)
    .select("*")
    .single();

  if (updateError) throw new HttpError(500, updateError.message);

  await appendCommandEvent({
    admin: input.admin,
    organizationId: device.organization_id,
    propertyId: device.property_id,
    listingId: device.listing_id,
    deviceId: device.id,
    actorUserId: input.userId,
    provider: device.provider,
    commandType: "sync_device_health",
    commandStatus: providerResult.commandStatus,
    providerReference: providerResult.providerReference,
    requestPayload: safeSmartAccessRequest(payload),
    responsePayload: safeSmartAccessRequest(responsePayload),
  });

  return updatedDevice;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(req.headers.get("Authorization"));
    await enforceRateLimit({
      admin,
      req,
      route: "manage-smart-access",
      userId: user.id,
      limit: 20,
      windowSeconds: 60,
    });

    const body = await req.json().catch(() => ({}));
    const action = body?.action as SmartAccessAction | undefined;

    if (!action) {
      throw new HttpError(400, "action is required");
    }

    if (action === "sync_device_health") {
      const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
      if (!deviceId) throw new HttpError(400, "deviceId is required");
      const device = await syncDeviceHealth({ admin, userId: user.id, deviceId });
      return jsonResponse(200, { device });
    }

    const grantId = typeof body?.grantId === "string" ? body.grantId : "";
    if (!grantId) throw new HttpError(400, "grantId is required");
    const grant = await getGrant(admin, grantId);
    const updatedGrant = await runGrantCommand({
      admin,
      action,
      userId: user.id,
      grant,
    });

    return jsonResponse(200, { grant: updatedGrant });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("manage-smart-access error:", error);
    return jsonResponse(500, { error: "Unable to manage Smart Property Access" });
  }
});

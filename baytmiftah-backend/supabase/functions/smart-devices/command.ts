import {
  getSupabaseClient,
  verifyToken,
} from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const user = await verifyToken(authHeader);

    const url = new URL(req.url);
    const deviceId = url.searchParams.get("deviceId");
    const { action, parameters } = await req.json();

    if (!deviceId || !action) {
      return errorResponse("Missing required fields", 400);
    }

    const supabase = getSupabaseClient();

    // Verify device ownership
    const { data: device } = await supabase
      .from("smart_devices")
      .select("user_id")
      .eq("id", deviceId)
      .single();

    if (device?.user_id !== user.sub) {
      return errorResponse("Unauthorized", 403);
    }

    // Log the command
    const { error: logError } = await supabase
      .from("smart_device_logs")
      .insert([
        {
          device_id: deviceId,
          event_type: "command",
          event_data: {
            action,
            parameters,
            timestamp: new Date().toISOString(),
          },
        },
      ]);

    if (logError) throw logError;

    // Update device status
    const statusMap: Record<string, string> = {
      lock: "locked",
      unlock: "unlocked",
      turn_on: "on",
      turn_off: "off",
    };

    if (statusMap[action]) {
      await supabase
        .from("smart_devices")
        .update({ status: statusMap[action], updated_at: new Date().toISOString() })
        .eq("id", deviceId);
    }

    return jsonResponse({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error.message || "Internal server error", 500);
  }
});

import {
  getSupabaseClient,
  verifyToken,
} from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("Authorization");
    const user = await verifyToken(authHeader);

    const url = new URL(req.url);
    const deviceId = url.pathname.split("/")[3];

    const supabase = getSupabaseClient();

    if (req.method === "GET") {
      // Get device by ID
      const { data, error } = await supabase
        .from("smart_devices")
        .select("*")
        .eq("id", deviceId)
        .eq("user_id", user.sub)
        .single();

      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === "PUT") {
      // Update device
      const { data: device } = await supabase
        .from("smart_devices")
        .select("user_id")
        .eq("id", deviceId)
        .single();

      if (device?.user_id !== user.sub) {
        return errorResponse("Unauthorized", 403);
      }

      const updateData = await req.json();
      const { data, error } = await supabase
        .from("smart_devices")
        .update(updateData)
        .eq("id", deviceId)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === "DELETE") {
      // Delete device
      const { data: device } = await supabase
        .from("smart_devices")
        .select("user_id")
        .eq("id", deviceId)
        .single();

      if (device?.user_id !== user.sub) {
        return errorResponse("Unauthorized", 403);
      }

      const { error } = await supabase
        .from("smart_devices")
        .delete()
        .eq("id", deviceId);

      if (error) throw error;
      return jsonResponse({ success: true });
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Internal server error", 500);
  }
});

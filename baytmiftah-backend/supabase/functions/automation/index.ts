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
    const propertyId = url.searchParams.get("propertyId");

    const supabase = getSupabaseClient();

    if (req.method === "GET") {
      // Get all automation rules
      let query = supabase
        .from("smart_automation_rules")
        .select("*")
        .eq("user_id", user.sub);

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      // Create automation rule
      const { propertyId, name, description, trigger, action, triggerDeviceId, actionDeviceId } =
        await req.json();

      if (!name || !trigger || !action) {
        return errorResponse("Missing required fields", 400);
      }

      const { data, error } = await supabase
        .from("smart_automation_rules")
        .insert([
          {
            user_id: user.sub,
            property_id: propertyId,
            name,
            description,
            trigger,
            action,
            trigger_device_id: triggerDeviceId,
            action_device_id: actionDeviceId,
            enabled: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return jsonResponse(data, 201);
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Internal server error", 500);
  }
});

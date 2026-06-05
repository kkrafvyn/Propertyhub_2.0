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
      // Get all devices
      let query = supabase
        .from("smart_devices")
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
      // Create device
      const { propertyId, name, type, brand, model, serialNumber } =
        await req.json();

      if (!name || !type) {
        return errorResponse("Missing required fields", 400);
      }

      const pairingCode = Math.random().toString(36).substring(2, 8);

      const { data, error } = await supabase
        .from("smart_devices")
        .insert([
          {
            user_id: user.sub,
            property_id: propertyId,
            name,
            type,
            brand,
            model,
            serial_number: serialNumber,
            pairing_code: pairingCode,
            status: "pairing",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return jsonResponse({
        ...data,
        pairingCode,
      }, 201);
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Internal server error", 500);
  }
});

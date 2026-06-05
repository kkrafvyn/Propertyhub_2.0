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
    const agencyId = url.pathname.split("/").pop();

    const supabase = getSupabaseClient();

    if (req.method === "GET") {
      // Get agency by ID
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", agencyId)
        .single();

      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === "PUT") {
      // Update agency (verify ownership)
      const { data: agency } = await supabase
        .from("agencies")
        .select("user_id")
        .eq("id", agencyId)
        .single();

      if (agency?.user_id !== user.sub && user.role !== "admin") {
        return errorResponse("Unauthorized", 403);
      }

      const updateData = await req.json();
      const { data, error } = await supabase
        .from("agencies")
        .update(updateData)
        .eq("id", agencyId)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === "DELETE") {
      // Delete agency (verify ownership)
      const { data: agency } = await supabase
        .from("agencies")
        .select("user_id")
        .eq("id", agencyId)
        .single();

      if (agency?.user_id !== user.sub && user.role !== "admin") {
        return errorResponse("Unauthorized", 403);
      }

      const { error } = await supabase
        .from("agencies")
        .delete()
        .eq("id", agencyId);

      if (error) throw error;
      return jsonResponse({ success: true });
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Internal server error", 500);
  }
});

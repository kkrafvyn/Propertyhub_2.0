import {
  getSupabaseClient,
  verifyToken,
} from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("Authorization") || undefined;
    const user = await verifyToken(authHeader);
    const url = new URL(req.url);
    const organizationId = url.searchParams.get("organizationId") ||
      url.pathname.split("/").filter(Boolean).pop();

    if (!organizationId) {
      return errorResponse("Missing organizationId", 400);
    }

    const supabase = getSupabaseClient();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", organizationId)
        .single();

      if (error) throw error;
      return jsonResponse(data);
    }

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", organizationId)
      .single();

    if (organizationError) throw organizationError;

    if (organization?.owner_id !== user.id && user.role !== "admin") {
      return errorResponse("Unauthorized", 403);
    }

    if (req.method === "PUT") {
      const updateData = await req.json();
      const { data, error } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", organizationId)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === "DELETE") {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", organizationId);

      if (error) throw error;
      return jsonResponse({ success: true });
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Internal server error", 500);
  }
});

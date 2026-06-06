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
      url.searchParams.get("agencyId");

    if (!organizationId) {
      return errorResponse("Missing organizationId", 400);
    }

    const supabase = getSupabaseClient();
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id,owner_id")
      .eq("id", organizationId)
      .single();

    if (organizationError) throw organizationError;

    if (user.role !== "admin" && organization.owner_id !== user.id) {
      return errorResponse("Unauthorized", 403);
    }

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return jsonResponse(data || []);
    }

    if (req.method === "POST") {
      const { email, role, userId } = await req.json();

      if (!email || !role) {
        return errorResponse("Missing required fields", 400);
      }

      const { data, error } = await supabase
        .from("organization_members")
        .insert([
          {
            organization_id: organizationId,
            user_id: userId || null,
            email,
            role,
            status: userId ? "active" : "invited",
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

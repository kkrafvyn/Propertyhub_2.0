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
    const agencyId = url.searchParams.get("agencyId");

    if (!agencyId) {
      return errorResponse("Missing agencyId", 400);
    }

    const supabase = getSupabaseClient();

    if (req.method === "GET") {
      // Get team members
      const { data, error } = await supabase
        .from("agency_members")
        .select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      // Add team member
      const { email, role } = await req.json();

      if (!email || !role) {
        return errorResponse("Missing required fields", 400);
      }

      const { data, error } = await supabase
        .from("agency_members")
        .insert([
          {
            agency_id: agencyId,
            email,
            role,
            status: "invited",
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

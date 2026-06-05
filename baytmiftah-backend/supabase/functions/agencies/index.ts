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

    const supabase = getSupabaseClient();

    if (req.method === "GET") {
      // Get all agencies (admin only)
      if (user.role !== "admin") {
        return errorResponse("Unauthorized", 403);
      }

      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      // Create agency
      const { companyName, licenseNumber, email, phone } = await req.json();

      if (!companyName || !licenseNumber || !email || !phone) {
        return errorResponse("Missing required fields", 400);
      }

      const { data, error } = await supabase
        .from("agencies")
        .insert([
          {
            user_id: user.sub,
            company_name: companyName,
            license_number: licenseNumber,
            email,
            phone,
            verification_status: "pending",
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

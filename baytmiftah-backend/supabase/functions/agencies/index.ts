import {
  getSupabaseClient,
  verifyToken,
} from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("Authorization") || undefined;
    const user = await verifyToken(authHeader);
    const supabase = getSupabaseClient();
    const url = new URL(req.url);

    if (req.method === "GET") {
      let query = supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      const status = url.searchParams.get("verification_status");
      if (status) query = query.eq("verification_status", status);

      if (user.role !== "admin") {
        query = query.eq("owner_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse(data || []);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const name = body.name || body.companyName;
      const registrationNumber = body.ghana_business_registration_number ||
        body.registrationNumber || body.licenseNumber;

      if (!name || !registrationNumber) {
        return errorResponse("Missing required organization fields", 400);
      }

      const { data, error } = await supabase
        .from("organizations")
        .insert([
          {
            owner_id: user.id,
            name,
            slug: body.slug || slugify(name),
            description: body.description || null,
            website: body.website || null,
            email: body.email || user.email || null,
            phone: body.phone || null,
            verified: false,
            suspended: false,
            verification_status: "pending",
            ghana_business_registration_number: registrationNumber,
            ghana_tax_identification_number:
              body.ghana_tax_identification_number || body.taxId || null,
            verification_submitted_at: new Date().toISOString(),
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

import { getSupabaseClient, verifyToken } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function emptyForMissingTable(error: any, fallback: any) {
  if (error?.code === "PGRST205" || error?.code === "42P01") return fallback;
  throw error;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("Authorization") || undefined;
    const user = await verifyToken(authHeader);
    const supabase = getSupabaseClient();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";
    const agencyId = url.searchParams.get("agencyId");

    if (req.method === "GET" && action === "list") {
      let query = supabase.from("organizations").select("*").order("created_at", { ascending: false });
      const verified = url.searchParams.get("verified");
      const slug = url.searchParams.get("slug");
      if (verified !== null) query = query.eq("verified", verified === "true");
      if (slug) query = query.eq("slug", slug);
      if (user.role !== "admin") query = query.eq("owner_id", user.id);

      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse(data || []);
    }

    if (req.method === "GET" && action === "get") {
      const { data, error } = await supabase.from("organizations").select("*").eq("id", agencyId).single();
      if (error) throw error;
      if (user.role !== "admin" && data.owner_id !== user.id) return errorResponse("Forbidden", 403);
      return jsonResponse(data);
    }

    if (req.method === "POST" && action === "create") {
      const body = await req.json();
      const name = body.name || body.companyName;
      const registrationNumber = body.ghana_business_registration_number ||
        body.registrationNumber || body.licenseNumber;

      if (!name || !registrationNumber) return errorResponse("Missing required organization fields", 400);

      const { data, error } = await supabase.from("organizations").insert([{
        owner_id: user.id,
        name,
        slug: body.slug || slugify(name),
        description: body.description || null,
        website: body.website || null,
        email: body.email || user.email || null,
        phone: body.phone || null,
        logo_url: body.logo_url || null,
        banner_url: body.banner_url || null,
        verified: false,
        suspended: false,
        verification_status: "pending",
        ghana_business_registration_number: registrationNumber,
        ghana_tax_identification_number: body.ghana_tax_identification_number || body.taxId || null,
        verification_submitted_at: new Date().toISOString(),
      }]).select().single();

      if (error) throw error;
      return jsonResponse(data, 201);
    }

    if (req.method === "PUT" && action === "update") {
      const body = await req.json();
      const { data, error } = await supabase
        .from("organizations")
        .update(body)
        .eq("id", agencyId)
        .eq(user.role === "admin" ? "id" : "owner_id", user.role === "admin" ? agencyId : user.id)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === "DELETE" && action === "delete") {
      let query = supabase.from("organizations").delete().eq("id", agencyId);
      if (user.role !== "admin") query = query.eq("owner_id", user.id);
      const { error } = await query;
      if (error) throw error;
      return jsonResponse({ ok: true });
    }

    if (req.method === "GET" && action === "pending-verification") {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("verification_status", "pending")
        .order("verification_submitted_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return jsonResponse(data || []);
    }

    if (req.method === "POST" && action === "approve") {
      const body = await req.json().catch(() => ({}));
      const { data, error } = await supabase.from("organizations").update({
        verified: true,
        suspended: false,
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: body.reviewerId || user.id,
      }).eq("id", agencyId).select().single();
      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === "POST" && action === "reject") {
      const { data, error } = await supabase.from("organizations").update({
        verified: false,
        verification_status: "rejected",
      }).eq("id", agencyId).select().single();
      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === "GET" && action === "team") {
      const { data, error } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", agencyId);
      if (error) return jsonResponse(emptyForMissingTable(error, []));
      return jsonResponse(data || []);
    }

    if (req.method === "POST" && action === "add-team-member") {
      const body = await req.json();
      const { data, error } = await supabase
        .from("organization_members")
        .insert([{ organization_id: agencyId, ...body }])
        .select()
        .single();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data, 201);
    }

    if (req.method === "PUT" && action === "update-team-member") {
      const memberId = url.searchParams.get("memberId");
      const body = await req.json();
      const { data, error } = await supabase.from("organization_members").update(body).eq("id", memberId).select().single();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "DELETE" && action === "remove-team-member") {
      const memberId = url.searchParams.get("memberId");
      const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
      if (error) return jsonResponse(emptyForMissingTable(error, { ok: true }));
      return jsonResponse({ ok: true });
    }

    if (req.method === "GET" && action === "properties") {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("organization_id", agencyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return jsonResponse(data || []);
    }

    if (req.method === "POST" && action === "assign-property") {
      const propertyId = url.searchParams.get("propertyId");
      const targetAgencyId = url.searchParams.get("agencyId");
      const { data, error } = await supabase
        .from("properties")
        .update({ organization_id: targetAgencyId })
        .eq("id", propertyId)
        .select()
        .single();
      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === "GET" && action === "leads") {
      let query = supabase.from("leads").select("*").eq("agency_id", agencyId);
      const status = url.searchParams.get("status");
      const assignedTo = url.searchParams.get("assigned_to");
      if (status) query = query.eq("status", status);
      if (assignedTo) query = query.eq("assigned_to", assignedTo);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) return jsonResponse(emptyForMissingTable(error, []));
      return jsonResponse(data || []);
    }

    if (req.method === "POST" && action === "assign-lead") {
      const leadId = url.searchParams.get("leadId");
      const body = await req.json();
      const { data, error } = await supabase.from("leads").update({
        assigned_to: body.agentId,
        status: "assigned",
      }).eq("id", leadId).select().single();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "PUT" && action === "update-lead") {
      const leadId = url.searchParams.get("leadId");
      const body = await req.json();
      const { data, error } = await supabase.from("leads").update(body).eq("id", leadId).select().single();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "GET" && action === "analytics") {
      const { data, error } = await supabase.from("agency_analytics").select("*").eq("agency_id", agencyId).maybeSingle();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data || null);
    }

    if (req.method === "POST" && action === "generate-analytics") return jsonResponse(null);

    if (req.method === "POST" && action === "invite") {
      const body = await req.json();
      const { data, error } = await supabase.from("agency_invitations").insert([{
        email: body.email,
        agency_id: agencyId,
        role: body.role,
      }]).select().single();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data, 201);
    }

    if (req.method === "POST" && action === "accept-invitation") {
      const invitationId = url.searchParams.get("invitationId");
      const { data, error } = await supabase.from("agency_invitations").update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      }).eq("id", invitationId).select().single();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "POST" && action === "request-verification") {
      const body = await req.json();
      const { data, error } = await supabase.from("agency_verification_requests").insert([{
        agency_id: agencyId,
        documents: body.documents,
        status: "pending",
      }]).select().single();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data, 201);
    }

    if (req.method === "GET" && action === "verification-status") {
      const { data, error } = await supabase
        .from("agency_verification_requests")
        .select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data || null);
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Internal server error", 500);
  }
});

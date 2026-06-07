import {
  getSupabaseClient,
  isAdmin,
  maybeVerifyToken,
  requireAdmin,
  requireOrganizationAccess,
  requireOrganizationManager,
  verifyToken,
} from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function emptyForMissingTable(error: any, fallback: any) {
  if (error?.code === "PGRST205" || error?.code === "42P01") return fallback;
  throw error;
}

const allowedAgencyMemberRoles = new Set([
  "agency_manager",
  "agency_agent",
  "agency_support",
]);

function normalizeAgencyMemberRole(role?: string) {
  const legacy: Record<string, string> = {
    admin: "agency_manager",
    agent: "agency_agent",
    viewer: "agency_support",
  };
  const normalized = role ? legacy[role] || role : "agency_agent";
  return allowedAgencyMemberRoles.has(normalized) ? normalized : "agency_agent";
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("Authorization") || undefined;
    const user = await maybeVerifyToken(authHeader);
    const supabase = getSupabaseClient();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";
    const agencyId = url.searchParams.get("agencyId");

    if (req.method === "GET" && action === "list") {
      if (!user) return errorResponse("Authentication required", 401);
      let query = supabase.from("organizations").select("*").order("created_at", { ascending: false });
      const verified = url.searchParams.get("verified");
      const slug = url.searchParams.get("slug");
      if (verified !== null) query = query.eq("verified", verified === "true");
      if (slug) query = query.eq("slug", slug);
      if (!isAdmin(user)) query = query.eq("owner_id", user.id);

      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse(data || []);
    }

    if (req.method === "GET" && action === "get") {
      const { data, error } = await supabase.from("organizations").select("*").eq("id", agencyId).single();
      if (error) throw error;
      if (!user) {
        const publicAgency = {
          id: data.id,
          name: data.name,
          slug: data.slug,
          description: data.description,
          logo_url: data.logo_url,
          banner_url: data.banner_url,
          website: data.website,
          email: data.email,
          phone: data.phone,
          verified: data.verified,
          verification_status: data.verification_status,
        };
        return jsonResponse(publicAgency);
      }

      const access = await requireOrganizationAccess(supabase, user, agencyId);
      if (!access.allowed) return errorResponse("Forbidden", 403);
      return jsonResponse(data);
    }

    if (req.method === "POST" && action === "create") {
      const creator = user || await verifyToken(authHeader);
      const body = await req.json();
      const name = body.name || body.companyName;
      const registrationNumber = body.ghana_business_registration_number ||
        body.registrationNumber || body.licenseNumber;

      if (!name || !registrationNumber) return errorResponse("Missing required organization fields", 400);

      const { data, error } = await supabase.from("organizations").insert([{
        owner_id: creator.id,
        name,
        slug: body.slug || slugify(name),
        description: body.description || null,
        website: body.website || null,
        email: body.email || creator.email || null,
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

      await supabase.from("user_roles").upsert({
        user_id: creator.id,
        role: "agency_owner",
        agency_id: data.id,
        status: "active",
      });

      return jsonResponse(data, 201);
    }

    if (req.method === "PUT" && action === "update") {
      const editor = user || await verifyToken(authHeader);
      await requireOrganizationManager(supabase, editor, agencyId);
      const body = await req.json();
      const { data, error } = await supabase
        .from("organizations")
        .update(body)
        .eq("id", agencyId)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === "DELETE" && action === "delete") {
      const editor = user || await verifyToken(authHeader);
      let query = supabase.from("organizations").delete().eq("id", agencyId);
      if (!isAdmin(editor)) {
        await requireOrganizationManager(supabase, editor, agencyId);
        query = query.eq("owner_id", editor.id);
      }
      const { error } = await query;
      if (error) throw error;
      return jsonResponse({ ok: true });
    }

    if (req.method === "GET" && action === "pending-verification") {
      requireAdmin(user);
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
      requireAdmin(user);
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
      requireAdmin(user);
      const { data, error } = await supabase.from("organizations").update({
        verified: false,
        verification_status: "rejected",
      }).eq("id", agencyId).select().single();
      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === "GET" && action === "team") {
      await requireOrganizationAccess(supabase, user, agencyId);
      const { data, error } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", agencyId);
      if (error) return jsonResponse(emptyForMissingTable(error, []));
      return jsonResponse(data || []);
    }

    if (req.method === "POST" && action === "add-team-member") {
      await requireOrganizationManager(supabase, user, agencyId);
      const body = await req.json();
      const { data, error } = await supabase
        .from("organization_members")
        .insert([{
          organization_id: agencyId,
          ...body,
          role: normalizeAgencyMemberRole(body.role),
        }])
        .select()
        .single();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data, 201);
    }

    if (req.method === "PUT" && action === "update-team-member") {
      if (!user) return errorResponse("Authentication required", 401);
      const memberId = url.searchParams.get("memberId");
      const body = await req.json();
      const { data: member } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("id", memberId)
        .maybeSingle();
      await requireOrganizationManager(supabase, user, member?.organization_id);
      const memberPayload = { ...body };
      if (body.role) memberPayload.role = normalizeAgencyMemberRole(body.role);
      const { data, error } = await supabase
        .from("organization_members")
        .update(memberPayload)
        .eq("id", memberId)
        .select()
        .single();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "DELETE" && action === "remove-team-member") {
      if (!user) return errorResponse("Authentication required", 401);
      const memberId = url.searchParams.get("memberId");
      const { data: member } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("id", memberId)
        .maybeSingle();
      await requireOrganizationManager(supabase, user, member?.organization_id);
      const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
      if (error) return jsonResponse(emptyForMissingTable(error, { ok: true }));
      return jsonResponse({ ok: true });
    }

    if (req.method === "GET" && action === "properties") {
      await requireOrganizationAccess(supabase, user, agencyId);
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
      await requireOrganizationManager(supabase, user, targetAgencyId);
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
      await requireOrganizationAccess(supabase, user, agencyId);
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
      if (!user) return errorResponse("Authentication required", 401);
      const leadId = url.searchParams.get("leadId");
      const body = await req.json();
      const { data: lead } = await supabase.from("leads").select("agency_id").eq("id", leadId).maybeSingle();
      await requireOrganizationAccess(supabase, user, lead?.agency_id);
      const { data, error } = await supabase.from("leads").update({
        assigned_to: body.agentId,
        status: "assigned",
      }).eq("id", leadId).select().single();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "PUT" && action === "update-lead") {
      if (!user) return errorResponse("Authentication required", 401);
      const leadId = url.searchParams.get("leadId");
      const body = await req.json();
      const { data: lead } = await supabase.from("leads").select("agency_id").eq("id", leadId).maybeSingle();
      await requireOrganizationAccess(supabase, user, lead?.agency_id);
      const { data, error } = await supabase.from("leads").update(body).eq("id", leadId).select().single();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "GET" && action === "analytics") {
      await requireOrganizationAccess(supabase, user, agencyId);
      const { data, error } = await supabase.from("agency_analytics").select("*").eq("agency_id", agencyId).maybeSingle();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data || null);
    }

    if (req.method === "POST" && action === "generate-analytics") {
      await requireOrganizationAccess(supabase, user, agencyId);
      return jsonResponse(null);
    }

    if (req.method === "POST" && action === "invite") {
      await requireOrganizationAccess(supabase, user, agencyId);
      const body = await req.json();
      const { data, error } = await supabase.from("agency_invitations").insert([{
        email: body.email,
        agency_id: agencyId,
        role: normalizeAgencyMemberRole(body.role),
      }]).select().single();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data, 201);
    }

    if (req.method === "POST" && action === "accept-invitation") {
      if (!user) return errorResponse("Authentication required", 401);
      const invitationId = url.searchParams.get("invitationId");
      const { data, error } = await supabase.from("agency_invitations").update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      }).eq("id", invitationId).select().single();
      if (error) return jsonResponse(emptyForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "POST" && action === "request-verification") {
      await requireOrganizationAccess(supabase, user, agencyId);
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
      await requireOrganizationAccess(supabase, user, agencyId);
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
    const message = error.message || "Internal server error";
    const status = message.includes("Authentication") || message.includes("Authorization")
      ? 401
      : message.includes("access required") || message.includes("Admin")
      ? 403
      : 500;
    return errorResponse(message, status);
  }
});

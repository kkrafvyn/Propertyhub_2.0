import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InviteRole = "manager" | "agent" | "analyst";

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isInviteRole(value: string): value is InviteRole {
  return value === "manager" || value === "agent" || value === "analyst";
}

function getAppUrl(req: Request, explicitAppUrl?: string) {
  if (explicitAppUrl) {
    return explicitAppUrl.replace(/\/+$/, "");
  }

  const configuredAppUrl =
    Deno.env.get("PUBLIC_APP_URL") ||
    Deno.env.get("SITE_URL") ||
    Deno.env.get("SUPABASE_AUTH_EXTERNAL_URL");

  if (configuredAppUrl) {
    return configuredAppUrl.replace(/\/+$/, "");
  }

  const requestUrl = new URL(req.url);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing Supabase environment configuration" });
  }

  if (!authHeader) {
    return jsonResponse(401, { error: "Missing authorization header" });
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse(401, { error: "You must be signed in to send invites" });
  }

  const requestBody = await req.json().catch(() => null);
  const organizationId =
    typeof requestBody?.organizationId === "string" ? requestBody.organizationId : "";
  const rawEmail = typeof requestBody?.email === "string" ? requestBody.email : "";
  const role = typeof requestBody?.role === "string" ? requestBody.role : "";
  const appUrl = typeof requestBody?.appUrl === "string" ? requestBody.appUrl : undefined;

  if (!organizationId || !rawEmail || !role) {
    return jsonResponse(400, { error: "organizationId, email, and role are required" });
  }

  if (!isInviteRole(role)) {
    return jsonResponse(400, { error: "Invalid invite role" });
  }

  const email = normalizeEmail(rawEmail);

  const { data: membership, error: membershipError } = await userClient
    .from("organization_members")
    .select(
      `
      role,
      organization:organizations(id, name, slug)
    `
    )
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return jsonResponse(500, { error: membershipError.message });
  }

  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return jsonResponse(403, { error: "Only owners and managers can send invites" });
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invitation, error: invitationError } = await userClient
    .from("organization_invitations")
    .upsert(
      {
        organization_id: organizationId,
        email,
        role,
        invited_by: user.id,
        accepted_user_id: null,
        accepted_at: null,
        expires_at: expiresAt,
        status: "pending",
      },
      {
        onConflict: "organization_id,email",
      }
    )
    .select(
      `
      id,
      email,
      role,
      expires_at,
      organization:organizations(id, name, slug)
    `
    )
    .single();

  if (invitationError || !invitation) {
    return jsonResponse(500, {
      error: invitationError?.message || "Unable to create invitation",
    });
  }

  const baseAppUrl = getAppUrl(req, appUrl);
  const redirectTo = `${baseAppUrl}/workspace/accept?invitation=${invitation.id}`;

  const { error: authInviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      organization_id: organizationId,
      organization_slug: invitation.organization.slug,
      organization_name: invitation.organization.name,
      invited_role: role,
      invitation_id: invitation.id,
    },
  });

  const manualSignInRequired =
    authInviteError &&
    /registered|exists|already/i.test(authInviteError.message || "");

  if (authInviteError && !manualSignInRequired) {
    return jsonResponse(500, { error: authInviteError.message });
  }

  return jsonResponse(200, {
    invitation,
    delivery: manualSignInRequired ? "manual_sign_in_required" : "sent",
    redirectTo,
  });
});

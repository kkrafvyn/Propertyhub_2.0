import { getSupabaseClient, getUserSupabaseClient, verifyToken } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

const ALLOWED_SELF_SERVE_ROLES = new Set(["buyer", "owner", "agent"]);

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== "POST") return errorResponse("Method not allowed", 405);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = await req.json();
    const supabase = getUserSupabaseClient();

    if (action === "me") {
      const user = await verifyToken(req.headers.get("Authorization") || undefined);
      return jsonResponse({
        user: {
          id: user.id,
          email: user.email,
          app_metadata: {
            role: user.role,
            agency_id: user.agencyId,
          },
          user_metadata: {},
        },
      });
    }

    if (action === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });

      if (error) return errorResponse(error.message, 401);
      const user = await verifyToken(`Bearer ${data.session?.access_token}`);
      const enrichedUser = data.user
        ? {
            ...data.user,
            app_metadata: {
              ...(data.user.app_metadata || {}),
              role: user.role,
              agency_id: user.agencyId,
            },
          }
        : data.user;

      return jsonResponse({
        ...data,
        user: enrichedUser,
      });
    }

    if (action === "signup") {
      const requestedRole = ALLOWED_SELF_SERVE_ROLES.has(body.role) ? body.role : "buyer";
      const metadata = {
        first_name: body.firstName,
        last_name: body.lastName,
        phone: body.phone,
        requested_role: requestedRole,
      };

      const { data, error } = await supabase.auth.signUp({
        email: body.email,
        password: body.password,
        options: { data: metadata },
      });

      if (error) return errorResponse(error.message, 400);

      if (data.user?.id) {
        const service = getSupabaseClient();
        await service.from("user_roles").upsert({
          user_id: data.user.id,
          role: requestedRole,
          status: "active",
        });
      }

      return jsonResponse({
        ...data,
        user: data.user
          ? {
              ...data.user,
              app_metadata: {
                ...(data.user.app_metadata || {}),
                role: requestedRole,
                agency_id: null,
              },
            }
          : data.user,
      }, 201);
    }

    return errorResponse("Unknown auth action", 400);
  } catch (error) {
    return errorResponse(error.message || "Internal server error", 500);
  }
});

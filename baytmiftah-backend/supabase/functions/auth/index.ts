import { getUserSupabaseClient } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== "POST") return errorResponse("Method not allowed", 405);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = await req.json();
    const supabase = getUserSupabaseClient();

    if (action === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });

      if (error) return errorResponse(error.message, 401);
      return jsonResponse(data);
    }

    if (action === "signup") {
      const metadata = {
        first_name: body.firstName,
        last_name: body.lastName,
        phone: body.phone,
        role: body.role || "buyer",
      };

      const { data, error } = await supabase.auth.signUp({
        email: body.email,
        password: body.password,
        options: { data: metadata },
      });

      if (error) return errorResponse(error.message, 400);
      return jsonResponse(data, 201);
    }

    return errorResponse("Unknown auth action", 400);
  } catch (error) {
    return errorResponse(error.message || "Internal server error", 500);
  }
});

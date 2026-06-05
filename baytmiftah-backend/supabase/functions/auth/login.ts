import { getSupabaseClient, generateToken } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return errorResponse("Missing email or password", 400);
    }

    const supabase = getSupabaseClient();

    // Sign in user
    const { data, error } = await supabase.auth.admin.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return errorResponse(error.message, 401);
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    // Generate JWT token
    const token = await generateToken({
      sub: data.user.id,
      email,
      role: profile?.role || "user",
    });

    return jsonResponse({
      user: profile,
      token,
      session: data.session,
    });
  } catch (error) {
    return errorResponse(error.message || "Internal server error", 500);
  }
});

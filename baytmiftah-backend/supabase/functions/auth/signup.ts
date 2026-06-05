import { getSupabaseClient, generateToken } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const { email, password, displayName } = await req.json();

    if (!email || !password || !displayName) {
      return errorResponse("Missing required fields", 400);
    }

    const supabase = getSupabaseClient();

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin
      .createUser({
        email,
        password,
        email_confirm: false,
      });

    if (authError) {
      return errorResponse(authError.message, 400);
    }

    // Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .insert([
        {
          id: authData.user.id,
          email,
          display_name: displayName,
          role: "user",
        },
      ])
      .select()
      .single();

    if (profileError) {
      return errorResponse(profileError.message, 400);
    }

    // Generate JWT token
    const token = await generateToken({
      sub: authData.user.id,
      email,
      role: "user",
    });

    return jsonResponse({
      user: profileData,
      token,
    }, 201);
  } catch (error) {
    return errorResponse(error.message || "Internal server error", 500);
  }
});

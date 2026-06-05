import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.11.2/index.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "dev-secret";

export async function verifyToken(authHeader?: string) {
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const verified = await jose.jwtVerify(token, secret);
    return verified.payload as Record<string, any>;
  } catch (error) {
    throw new Error("Invalid token");
  }
}

export function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl!, supabaseServiceRoleKey!);
}

export function getUserSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  return createClient(supabaseUrl!, supabaseAnonKey!);
}

export function generateToken(payload: Record<string, any>) {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return jose.SignJWT.new(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

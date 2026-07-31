import { createAdminClient } from "./supabase.ts";
import { HttpError } from "./http.ts";

export async function enforceRateLimit(input: {
  bucket: string;
  maxHits?: number;
  windowSeconds?: number;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_bucket_key: input.bucket,
    p_max_hits: input.maxHits ?? 30,
    p_window_seconds: input.windowSeconds ?? 60,
  });

  if (error) {
    console.error("rate limit check failed:", error.message);
    return;
  }

  if (data === false) {
    throw new HttpError(429, "Too many requests. Please try again later.");
  }
}

export function rateLimitKey(prefix: string, identifier: string) {
  return `${prefix}:${identifier}`;
}

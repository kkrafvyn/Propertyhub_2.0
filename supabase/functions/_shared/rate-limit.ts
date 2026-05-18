import { HttpError } from "./http.ts";
import { sha256Hex } from "./cryptographic-audit.ts";

function getClientIp(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function getWindowStart(windowSeconds: number) {
  const now = Date.now();
  return new Date(Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000).toISOString();
}

export async function enforceRateLimit(input: {
  admin: any;
  req: Request;
  route: string;
  userId?: string | null;
  limit?: number;
  windowSeconds?: number;
}) {
  const limit = input.limit || Number(Deno.env.get("EDGE_RATE_LIMIT_MAX_REQUESTS") || 30);
  const windowSeconds =
    input.windowSeconds || Number(Deno.env.get("EDGE_RATE_LIMIT_WINDOW_SECONDS") || 60);
  const rawSubject = `${input.userId || "anonymous"}:${getClientIp(input.req)}`;
  const subjectKey = await sha256Hex(rawSubject);
  const windowStartedAt = getWindowStart(windowSeconds);

  const { data: current, error: currentError } = await input.admin
    .from("edge_rate_limit_events")
    .select("*")
    .eq("route", input.route)
    .eq("subject_key", subjectKey)
    .eq("window_started_at", windowStartedAt)
    .maybeSingle();

  if (currentError) {
    throw new HttpError(500, currentError.message);
  }

  if (current?.blocked_until && new Date(current.blocked_until).getTime() > Date.now()) {
    throw new HttpError(429, "Too many attempts. Please try again shortly.");
  }

  if (!current) {
    const { error } = await input.admin.from("edge_rate_limit_events").insert({
      route: input.route,
      subject_key: subjectKey,
      window_started_at: windowStartedAt,
      window_seconds: windowSeconds,
      request_count: 1,
      metadata: {
        hasUser: Boolean(input.userId),
      },
    });

    if (error) {
      throw new HttpError(500, error.message);
    }

    return;
  }

  const nextCount = Number(current.request_count || 0) + 1;
  const shouldBlock = nextCount > limit;
  const blockedUntil = shouldBlock
    ? new Date(Date.now() + windowSeconds * 1000).toISOString()
    : current.blocked_until || null;

  const { error } = await input.admin
    .from("edge_rate_limit_events")
    .update({
      request_count: nextCount,
      blocked_until: blockedUntil,
      last_request_at: new Date().toISOString(),
    })
    .eq("id", current.id);

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (shouldBlock) {
    throw new HttpError(429, "Too many attempts. Please try again shortly.");
  }
}

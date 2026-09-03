function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

function isDevOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function isVercelAppOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function isBaytMiftahOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "baytmiftah.com" || hostname.endsWith(".baytmiftah.com");
  } catch {
    return false;
  }
}

export function isOriginAllowed(origin: string, allowed: string[]): boolean {
  if (!origin) return false;
  const normalized = normalizeOrigin(origin);
  if (allowed.includes(normalized)) return true;
  if (isDevOrigin(normalized)) return true;
  if (isVercelAppOrigin(normalized)) return true;
  if (isBaytMiftahOrigin(normalized)) return true;
  return false;
}

const DEFAULT_ALLOWED_ORIGINS = [
  "https://app.baytmiftah.com",
  "https://baytmiftah.com",
  "https://www.baytmiftah.com",
  "https://propertyhub-2-0-ecru.vercel.app",
];

export function getAllowedOrigins(): string[] {
  const configured =
    Deno.env.get("ALLOWED_ORIGINS") ||
    Deno.env.get("PUBLIC_APP_URL") ||
    Deno.env.get("SITE_URL") ||
    "";

  const origins = configured
    .split(",")
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  if (origins.length === 0) {
    return [...DEFAULT_ALLOWED_ORIGINS];
  }

  return [...new Set([...origins, ...DEFAULT_ALLOWED_ORIGINS])];
}

export function buildCorsHeaders(req: Request) {
  const origin = normalizeOrigin(req.headers.get("Origin") || "");
  const allowed = getAllowedOrigins();
  const allowOrigin =
    origin && isOriginAllowed(origin, allowed)
      ? origin
      : allowed[0] || "https://app.baytmiftah.com";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}

export const corsHeaders = buildCorsHeaders(
  new Request("https://baytmiftah.com"),
);

export function corsResponse(req: Request, status = 200, body = "ok") {
  return new Response(body, {
    status,
    headers: buildCorsHeaders(req),
  });
}

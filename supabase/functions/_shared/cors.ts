function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

function isProductionEnvironment(): boolean {
  const environment = (Deno.env.get("DENO_ENV") || Deno.env.get("ENVIRONMENT") || "production").toLowerCase();
  return ["production", "prod"].includes(environment);
}

function parseOrigin(value: string): string | null {
  try {
    const parsed = new URL(normalizeOrigin(value));
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    if (parsed.pathname !== '/' || parsed.search || parsed.hash) return null;
    if (isProductionEnvironment() && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function isOriginAllowed(origin: string, allowed: string[]): boolean {
  if (!origin) return false;
  const normalized = parseOrigin(origin);
  if (!normalized) return false;
  return allowed.some((allowedOrigin) => parseOrigin(allowedOrigin) === normalized);
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
    .map((value) => parseOrigin(value))
    .filter((value): value is string => Boolean(value))
    .filter(Boolean);

  if (origins.length === 0) {
    return isProductionEnvironment()
      ? [...DEFAULT_ALLOWED_ORIGINS]
      : [
          ...DEFAULT_ALLOWED_ORIGINS,
          "http://localhost:5173",
          "http://127.0.0.1:5173",
        ];
  }

  return [...new Set(origins)];
}

export function buildCorsHeaders(req: Request) {
  const origin = normalizeOrigin(req.headers.get("Origin") || "");
  const allowed = getAllowedOrigins();
  const allowOrigin = origin && isOriginAllowed(origin, allowed)
    ? parseOrigin(origin)!
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

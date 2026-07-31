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
    return ["https://baytmiftah.com", "https://www.baytmiftah.com"];
  }

  return origins;
}

export function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin")?.replace(/\/+$/, "") || "";
  const allowed = getAllowedOrigins();
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
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

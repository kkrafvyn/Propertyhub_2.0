function allowedOrigin(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const isLocalDev = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!origin) return "*";
  if (isLocalDev) return origin;
  if (!configured.length) return "*";
  if (origin && configured.includes(origin)) return origin;
  return configured[0];
}

function baseHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req),
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Client-Info, apikey",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

export function handleCors(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: baseHeaders(req),
    });
  }
}

export function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...baseHeaders(new Request("https://baytmiftah.local")),
      "Content-Type": "application/json",
    },
  });
}

export function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...baseHeaders(new Request("https://baytmiftah.local")),
      "Content-Type": "application/json",
    },
  });
}

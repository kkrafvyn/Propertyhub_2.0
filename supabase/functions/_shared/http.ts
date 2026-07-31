import { buildCorsHeaders } from "./cors.ts";

export function getCorsHeaders(req?: Request) {
  if (req) {
    return buildCorsHeaders(req);
  }
  return buildCorsHeaders(new Request("https://baytmiftah.com"));
}

/** @deprecated Prefer getCorsHeaders(req) per request */
export const corsHeaders = buildCorsHeaders(new Request("https://baytmiftah.com"));

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  req?: Request,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

export function safeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return error.message;
  }
  return fallback;
}

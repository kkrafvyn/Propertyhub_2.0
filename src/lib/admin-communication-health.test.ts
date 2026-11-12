import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  admin: vi.fn(),
  getEnv: vi.fn(),
}));
vi.mock("../../supabase/functions/_shared/supabase.ts", () => ({
  requireAuthenticatedUser: async () => ({ userClient: { rpc: mocks.rpc } }),
  createAdminClient: mocks.admin,
}));
vi.mock("../../supabase/functions/_shared/http.ts", () => ({
  HttpError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
  getCorsHeaders: () => ({}),
  safeErrorMessage: (_error: unknown, fallback: string) => fallback,
  jsonResponse: (
    status: number,
    body: unknown,
    _req: Request,
    headers: HeadersInit = {},
  ) => new Response(JSON.stringify(body), { status, headers }),
}));
let handler: (req: Request) => Promise<Response>;
beforeAll(async () => {
  vi.stubGlobal("Deno", {
    serve: (fn: typeof handler) => {
      handler = fn;
    },
    env: { get: mocks.getEnv },
  });
  const endpointPath =
    "../../supabase/functions/admin-communication-health/index.ts";
  await import(endpointPath);
});
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.getEnv.mockReturnValue(undefined);
});
const request = (body: unknown) =>
  new Request("https://example.test/diagnostics", {
    method: "POST",
    headers: {
      Authorization: "Bearer test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
it("does not inspect credentials when staff authorization fails", async () => {
  mocks.rpc.mockResolvedValue({ error: { message: "denied" } });
  expect((await handler(request({}))).status).toBe(403);
  expect(mocks.getEnv).not.toHaveBeenCalled();
  expect(mocks.admin).not.toHaveBeenCalled();
});
it("reports absent webhook configuration and does not cache the result", async () => {
  const response = await handler(request({}));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const result = await response.json();
  expect(result.checks.every((check: { ready: boolean }) => !check.ready)).toBe(
    true,
  );
});
it("returns credential presence without returning any secret or organization config", async () => {
  mocks.getEnv.mockReturnValue("PRIVATE-ENV-VALUE");
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({
        data: {
          status: "connected",
          config: {
            phone_number_id: "PRIVATE-PHONE-ID",
            access_token: "PRIVATE-ACCESS-TOKEN",
          },
        },
        error: null,
      }),
  };
  mocks.admin.mockReturnValue({ from: () => chain });
  const response = await handler(
    request({ organizationId: "10000000-0000-0000-0000-000000000001" }),
  );
  const text = await response.text();
  expect(text).not.toContain("PRIVATE-");
  expect(
    JSON.parse(text).checks.every((check: { ready: boolean }) => check.ready),
  ).toBe(true);
});
it("rejects invalid organization IDs before reading integration rows", async () => {
  expect((await handler(request({ organizationId: "bad" }))).status).toBe(400);
  expect(mocks.admin).not.toHaveBeenCalled();
});

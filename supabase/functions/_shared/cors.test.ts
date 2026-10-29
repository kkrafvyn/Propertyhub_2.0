import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const env = new Map<string, string>();
let cors: typeof import("./cors.ts");

beforeAll(async () => {
  vi.stubGlobal("Deno", { env: { get: (name: string) => env.get(name) } });
  cors = await import("./cors.ts");
});

beforeEach(() => env.clear());

describe("Edge Function CORS origin policy", () => {
  it("does not allow arbitrary Vercel preview origins", () => {
    env.set("ENVIRONMENT", "production");
    const allowed = ["https://app.baytmiftah.com"];
    expect(cors.isOriginAllowed("https://attacker.vercel.app", allowed)).toBe(false);
    expect(cors.isOriginAllowed("https://app.baytmiftah.com", allowed)).toBe(true);
  });

  it("requires exact scheme and port matches", () => {
    const allowed = ["https://app.baytmiftah.com"];
    expect(cors.isOriginAllowed("http://app.baytmiftah.com", allowed)).toBe(false);
    expect(cors.isOriginAllowed("https://app.baytmiftah.com:444", allowed)).toBe(false);
  });

  it("lets configured origins replace defaults and excludes localhost in production", () => {
    env.set("ENVIRONMENT", "production");
    env.set("ALLOWED_ORIGINS", "https://tenant.example, http://localhost:5173");
    expect(cors.getAllowedOrigins()).toEqual(["https://tenant.example"]);
    expect(cors.isOriginAllowed("http://localhost:5173", cors.getAllowedOrigins())).toBe(false);
  });

  it("rejects URLs with paths or credentials instead of treating them as origins", () => {
    expect(cors.isOriginAllowed("https://user:pass@app.baytmiftah.com", ["https://app.baytmiftah.com"])).toBe(false);
    expect(cors.isOriginAllowed("https://app.baytmiftah.com/path", ["https://app.baytmiftah.com"])).toBe(false);
  });
});
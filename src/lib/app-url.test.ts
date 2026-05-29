import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPublicAppUrl, getPublicAppBaseUrl, PRODUCTION_APP_URL } from "./app-url";

describe("app-url", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back to the production URL when the current origin is localhost", () => {
    vi.stubEnv("VITE_PUBLIC_APP_URL", "");

    expect(getPublicAppBaseUrl()).toBe(PRODUCTION_APP_URL);
    expect(buildPublicAppUrl("/login?next=%2Fapp")).toBe(
      "https://baytmiftah-krafvyn.vercel.app/login?next=%2Fapp"
    );
  });

  it("uses a configured public URL when it is not local", () => {
    vi.stubEnv("VITE_PUBLIC_APP_URL", "https://example.baytmiftah.com/");

    expect(getPublicAppBaseUrl()).toBe("https://example.baytmiftah.com");
  });
});

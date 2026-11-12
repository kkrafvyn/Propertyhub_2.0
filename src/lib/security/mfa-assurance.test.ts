import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../supabase", () => ({
  supabase: {
    auth: {
      mfa: { listFactors: vi.fn(), getAuthenticatorAssuranceLevel: vi.fn() },
    },
  },
}));
import { supabase } from "../supabase";
import { hasMfaAssurance } from "./mfa";
beforeEach(() => {
  vi.mocked(supabase.auth.mfa.listFactors).mockResolvedValue({
    data: { totp: [{ status: "verified" }] },
    error: null,
  } as never);
});
it("fails closed when enrolled factors exist but the session has not reached AAL2", async () => {
  vi.mocked(supabase.auth.mfa.getAuthenticatorAssuranceLevel).mockResolvedValue(
    { data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null } as never,
  );
  expect(await hasMfaAssurance()).toBe(false);
});
it("allows an enrolled authenticator with current AAL2", async () => {
  vi.mocked(supabase.auth.mfa.getAuthenticatorAssuranceLevel).mockResolvedValue(
    { data: { currentLevel: "aal2" }, error: null } as never,
  );
  expect(await hasMfaAssurance()).toBe(true);
});
it("fails closed when the authentication provider is unreachable", async () => {
  vi.mocked(supabase.auth.mfa.getAuthenticatorAssuranceLevel).mockRejectedValue(
    new Error("Network unavailable"),
  );
  expect(await hasMfaAssurance()).toBe(false);
});

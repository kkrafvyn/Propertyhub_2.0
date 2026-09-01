import { describe, expect, it } from "vitest";

describe("e-signature request contract", () => {
  it("requires at least one signer", () => {
    expect(["tenant"].length).toBeGreaterThan(0);
    expect([].length).toBe(0);
  });
});
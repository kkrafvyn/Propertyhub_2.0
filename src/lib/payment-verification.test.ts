import { describe, expect, it } from "vitest";
import { verifyPayangelsSignature } from "./payment-verification";

describe("payment webhook verification", () => {
  it("accepts a valid SHA-512 HMAC signature", async () => {
    const payload = JSON.stringify({ event: "payment_received", amount: 250 });
    const secret = "payangels-prod-secret";
    const signature = await createTestSignature(secret, payload, "sha512");

    await expect(
      verifyPayangelsSignature({ payload, secret, signature })
    ).resolves.toBe(true);
  });

  it("accepts a valid SHA-256 HMAC signature with prefix", async () => {
    const payload = JSON.stringify({ event: "payment_received", amount: 250 });
    const secret = "payangels-prod-secret";
    const signature = `sha256=${await createTestSignature(secret, payload, "sha256")}`;

    await expect(
      verifyPayangelsSignature({ payload, secret, signature })
    ).resolves.toBe(true);
  });

  it("rejects a mismatched signature", async () => {
    await expect(
      verifyPayangelsSignature({
        payload: JSON.stringify({ event: "payment_received", amount: 250 }),
        secret: "payangels-prod-secret",
        signature: "badvalue",
      })
    ).resolves.toBe(false);
  });

  it("rejects a missing secret for production verification", async () => {
    await expect(
      verifyPayangelsSignature({
        payload: JSON.stringify({ event: "payment_received", amount: 250 }),
        secret: "",
        signature: "abc",
      })
    ).rejects.toThrow("Missing payment webhook secret");
  });
});

async function createTestSignature(secret: string, payload: string, algorithm: "sha256" | "sha512") {
  const crypto = await import("node:crypto");
  return crypto.createHmac(algorithm, secret).update(payload, "utf8").digest("hex");
}

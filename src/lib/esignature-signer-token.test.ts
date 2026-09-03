import { describe, expect, it } from "vitest";
import {
  buildPublicSigningUrl,
  buildSigningActionPath,
  findNextPendingSigner,
  findSignerByToken,
  withSignerTokens,
} from "./esignature-signer-token";
import type { EsigSigner } from "./esignature.service";

describe("esignature-signer-token", () => {
  it("assigns stable signer tokens", () => {
    const signers = withSignerTokens([
      { name: "A", email: "a@test.com", routing_order: 1 },
      { name: "B", email: "b@test.com", routing_order: 2 },
    ]);
    expect(signers[0].signer_token).toBeTruthy();
    expect(signers[1].signer_token).toBeTruthy();
    expect(signers[0].signer_token).not.toBe(signers[1].signer_token);
  });

  it("preserves existing signer tokens", () => {
    const signers = withSignerTokens([{ name: "A", email: "a@test.com", signer_token: "keep-me" }]);
    expect(signers[0].signer_token).toBe("keep-me");
  });

  it("builds public signing URL with st query", () => {
    const url = buildPublicSigningUrl("pub-tok", "signer-tok");
    expect(url).toContain("/sign/pub-tok");
    expect(url).toContain("st=signer-tok");
  });

  it("builds signing action path with signer token", () => {
    expect(buildSigningActionPath("https://app.baytmiftah.com/sign/tok?st=abc")).toBe(
      "/sign/tok?st=abc",
    );
  });

  it("finds signer by token and next pending signer", () => {
    const signers: EsigSigner[] = [
      { name: "Tenant", email: "t@test.com", routing_order: 1, status: "signed", signer_token: "t1" },
      { name: "Landlord", email: "l@test.com", routing_order: 2, status: "pending", signer_token: "l1" },
    ];
    expect(findSignerByToken(signers, "l1")?.email).toBe("l@test.com");
    expect(findNextPendingSigner(signers)?.email).toBe("l@test.com");
  });
});

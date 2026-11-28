import { describe, expect, it } from "vitest";
import { KYC_PROVIDER_ENGINES, getKycProviderLabel } from "./kyc-provider-engines";

describe("KYC provider engines", () => {
  it("only offers the internal AI and human-review route", () => {
    expect(KYC_PROVIDER_ENGINES).toEqual([
      { slug: "internal-kyc", label: "Internal (AI + human review)" },
    ]);
  });

  it("does not present legacy external providers as configured options", () => {
    expect(getKycProviderLabel("prembly")).toBe("prembly");
    expect(getKycProviderLabel("smile-identity")).toBe("smile-identity");
  });
});

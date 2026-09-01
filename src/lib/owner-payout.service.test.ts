import { describe, expect, it } from "vitest";
import { mapPayoutProviderStatus, validateOwnerPayoutAmount } from "./estate-reporting.service";

describe("owner payout guard", () => {
  it("requires a positive payout amount", () => {
    expect(validateOwnerPayoutAmount(1250)).toBeNull();
    expect(validateOwnerPayoutAmount(0)).toContain("greater than zero");
    expect(validateOwnerPayoutAmount(-1)).toContain("greater than zero");
    expect(mapPayoutProviderStatus("PENDING")).toBe("submitted");
    expect(mapPayoutProviderStatus("SUCCESSFUL")).toBe("paid");
    expect(mapPayoutProviderStatus("FAILED")).toBe("failed");
  });
});
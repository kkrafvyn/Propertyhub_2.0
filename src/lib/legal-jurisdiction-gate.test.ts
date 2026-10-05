import { describe, expect, it } from "vitest";
import {
  isLegalJurisdictionTransactionalAllowed,
  validateLegalJurisdictionForTransactionalAction,
} from "./legal-jurisdiction-gate";

describe("legal-jurisdiction-gate", () => {
  it("allows Ghana transactional workflows", () => {
    expect(isLegalJurisdictionTransactionalAllowed("GH")).toBe(true);
    const gate = validateLegalJurisdictionForTransactionalAction({
      country: "Ghana",
      region: "Greater Accra",
      city: "Accra",
      action: "listing_publish",
    });
    expect(gate.allowed).toBe(true);
    expect(gate.jurisdictionCode).toBe("GH");
  });

  it("blocks US and Nigeria until counsel sign-off", () => {
    expect(isLegalJurisdictionTransactionalAllowed("US")).toBe(false);
    expect(isLegalJurisdictionTransactionalAllowed("NG")).toBe(false);
    const gate = validateLegalJurisdictionForTransactionalAction({
      country: "United States",
      region: "California",
      city: "Los Angeles",
      action: "payment_checkout",
    });
    expect(gate.allowed).toBe(false);
    expect(gate.message).toMatch(/not enabled/i);
  });
});

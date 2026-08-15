import { describe, expect, it } from "vitest";
import {
  FOOTER_LEGAL_LINKS,
  LEGAL_CATEGORIES,
  LEGAL_DOCUMENTS,
  LEGAL_SLUG_ALIASES,
  REQUIRED_LEGAL_SLUGS,
  ALL_PAGES,
  getAdjacentPolicies,
  getLegalDocument,
  getLegalPath,
  getRelatedDocuments,
} from "./index";

const REQUIRED_ROUTES = [
  "terms",
  "privacy",
  "cookies",
  "marketplace-rules",
  "payments",
  "refunds",
  "fees",
  "e-signatures",
  "host-terms",
  "property-owner-terms",
  "agency-agent-terms",
  "tenant-guest-rules",
  "vendor-terms",
  "acceptable-use",
  "trust-verification",
  "kyc",
  "aml-sanctions",
  "disputes",
  "safety",
  "non-discrimination",
  "liability",
  "copyright",
  "data-processing",
  "accessibility",
  "whitelabel",
  "complaints",
];

describe("legal catalog", () => {
  it("includes every required Legal Centre slug exactly once", () => {
    expect([...REQUIRED_LEGAL_SLUGS].sort()).toEqual([...REQUIRED_ROUTES].sort());
    const slugs = LEGAL_DOCUMENTS.map((doc) => doc.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of REQUIRED_ROUTES) {
      expect(getLegalDocument(slug)?.slug).toBe(slug);
      expect(getLegalPath(slug)).toBe(`/legal/${slug}`);
    }
  });

  it("resolves legacy slugs to the canonical policies", () => {
    expect(getLegalDocument("payment-escrow")?.slug).toBe("payments");
    expect(getLegalDocument("payments-transaction")?.slug).toBe("payments");
    expect(getLegalDocument("fair-housing")?.slug).toBe("non-discrimination");
    expect(getLegalDocument("owner-terms")?.slug).toBe("property-owner-terms");
    expect(getLegalPath("dispute-resolution")).toBe("/legal/disputes");
    expect(LEGAL_SLUG_ALIASES["kyc-identity"]).toBe("kyc");
  });

  it("does not use outdated escrow or fair-housing product titles", () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(doc.title.toLowerCase()).not.toContain("fair housing");
      expect(doc.title.toLowerCase()).not.toContain("escrow terms");
      expect(doc.title).not.toMatch(/BaytMiftah escrow/i);
    }
    expect(getLegalDocument("payments")?.title).toBe("Payments & Transaction Processing Policy");
    expect(getLegalDocument("aml-sanctions")?.title).toBe("Fraud, AML & Sanctions Policy");
    expect(getLegalDocument("non-discrimination")?.title).toBe(
      "Non-Discrimination & Community Standards",
    );
  });

  it("does not name a payment provider and does not claim fund custody", () => {
    for (const doc of LEGAL_DOCUMENTS) {
      const text = JSON.stringify(doc);
      expect(text.toLowerCase()).not.toContain("payangels");
      expect(text.toLowerCase()).not.toContain("paystack");
      expect(text.toLowerCase()).not.toContain("stripe");
    }
    const payments = getLegalDocument("payments");
    const refunds = getLegalDocument("refunds");
    expect(payments?.sections.some((section) => section.heading === "Payment confirmation")).toBe(
      true,
    );
    expect(payments?.sections.some((section) => section.heading === "Provider terms")).toBe(true);
    expect(JSON.stringify(refunds)).toMatch(/does not hold the underlying funds/i);
  });

  it("keeps related policies and previous/next navigation valid", () => {
    for (const doc of LEGAL_DOCUMENTS) {
      for (const related of getRelatedDocuments(doc.relatedPolicies)) {
        expect(related.slug).toBeTruthy();
      }
    }
    const { previous, next } = getAdjacentPolicies("refunds");
    expect(previous?.slug).toBe("payments");
    expect(next?.slug).toBe("fees");
  });

  it("covers every grouped category slug with a document", () => {
    for (const category of LEGAL_CATEGORIES) {
      expect(category.slugs.length).toBeGreaterThan(0);
      for (const slug of category.slugs) {
        expect(getLegalDocument(slug)?.category).toBe(category.id);
      }
    }
    expect(FOOTER_LEGAL_LINKS.map((item) => item.slug)).toContain("payments");
    expect(FOOTER_LEGAL_LINKS.map((item) => item.label)).not.toContain("Payment & Escrow Terms");
  });

  it("does not leave company identity as bracket placeholders", () => {
    const text = JSON.stringify(ALL_PAGES);
    expect(text).not.toContain("[LEGAL COMPANY NAME]");
    expect(text).not.toContain("[REGISTERED ADDRESS]");
    expect(text).not.toContain("[REGISTRATION NUMBER]");
  });
});

import { describe, expect, it } from "vitest";
import {
  LEGAL_CONTACT,
  LEGAL_LAUNCH_CHECKLIST,
  LEGAL_LAUNCH_CHECKLIST_EVIDENCE,
  LEGAL_OPERATOR,
  LEGAL_PLATFORM_POSITION,
  LEGAL_POLICY_VERSION,
} from "../../lib/legal-config";
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
  "age-minor-protection",
  "biometric-identity-data",
  "tenant-screening",
  "ai-automated-decisions",
  "communications-marketing",
  "privacy-rights",
  "data-retention",
  "international-data-transfers",
  "subprocessors",
  "developer-api-terms",
  "smart-access-security",
  "location-data",
  "valuation-disclaimer",
  "tax-accounting-disclaimer",
  "professional-credentials",
  "account-enforcement-appeals",
  "content-moderation",
  "reasonable-accommodation",
  "protected-contact-safety",
  "business-saas-terms",
  "service-support",
  "debt-collection",
  "short-stay-terms",
  "subscription-billing",
  "payment-disputes",
  "beneficial-ownership",
  "business-verification",
  "anti-bribery-corruption",
  "conflicts-of-interest",
  "referrals",
  "insurance-mortgage-disclosures",
  "hazard-disclosures",
  "government-request-handling",
  "legal-hold",
  "records-management",
  "mobile-electron-terms",
  "third-party-notices",
  "security-reporting",
  "inspection-disclaimer",
  "review-audit-evidence",
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

  it("includes the required expanded policy set and jurisdiction-aware statements", () => {
    for (const slug of [
      "age-minor-protection",
      "biometric-identity-data",
      "tenant-screening",
      "ai-automated-decisions",
      "communications-marketing",
      "privacy-rights",
      "data-retention",
      "international-data-transfers",
      "subprocessors",
      "developer-api-terms",
      "smart-access-security",
      "location-data",
      "valuation-disclaimer",
      "tax-accounting-disclaimer",
      "professional-credentials",
      "account-enforcement-appeals",
      "content-moderation",
      "reasonable-accommodation",
      "protected-contact-safety",
      "business-saas-terms",
      "service-support",
      "debt-collection",
      "short-stay-terms",
      "subscription-billing",
      "payment-disputes",
      "beneficial-ownership",
      "business-verification",
      "anti-bribery-corruption",
      "conflicts-of-interest",
      "referrals",
      "insurance-mortgage-disclosures",
      "hazard-disclosures",
      "government-request-handling",
      "legal-hold",
      "records-management",
      "mobile-electron-terms",
      "third-party-notices",
      "security-reporting",
      "inspection-disclaimer",
      "review-audit-evidence",
    ]) {
      const doc = getLegalDocument(slug);
      expect(doc).toBeTruthy();
      expect(doc?.slug).toBe(slug);
      expect(doc?.sections.length).toBeGreaterThan(0);
      expect(JSON.stringify(doc)).not.toContain("guaranteed compliance");
      expect(JSON.stringify(doc)).not.toContain("guaranteed identity match");
      expect(JSON.stringify(doc)).not.toContain("100% safe");
    }
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

  it("keeps the legal platform role, jurisdiction, and launch checklist configured", () => {
    expect(LEGAL_OPERATOR.name).toBeTruthy();
    expect(LEGAL_OPERATOR.jurisdiction).toContain("Ghana");
    expect(LEGAL_CONTACT.legal).toMatch(/@/);
    expect(LEGAL_CONTACT.privacy).toMatch(/@/);
    expect(LEGAL_PLATFORM_POSITION.summary).toContain("BaytMiftah");
    expect(LEGAL_PLATFORM_POSITION.doesNotAutomaticallyActAs.length).toBeGreaterThan(0);
    expect(LEGAL_LAUNCH_CHECKLIST.length).toBeGreaterThan(0);
    for (const item of LEGAL_LAUNCH_CHECKLIST) {
      expect(LEGAL_LAUNCH_CHECKLIST_EVIDENCE[item]).toBeTruthy();
    }
  });

  it("marks the legal bundle as materially updated and not globally production-certified", () => {
    expect(LEGAL_POLICY_VERSION).toMatch(/2026/);
    expect(LEGAL_POLICY_VERSION).not.toBe("2026-08-14");
    const text = JSON.stringify(LEGAL_DOCUMENTS);
    expect(text).not.toContain("legally compliant worldwide");
    expect(text).not.toContain("ISO 27001 compliant");
  });
});

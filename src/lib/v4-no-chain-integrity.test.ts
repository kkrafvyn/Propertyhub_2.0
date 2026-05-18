import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260517143745_v4_integrity_rate_limit_foundation.sql"),
  "utf8"
);
const paymentService = readFileSync(
  join(process.cwd(), "supabase/functions/_shared/payment-service.ts"),
  "utf8"
);
const stripeShared = readFileSync(join(process.cwd(), "supabase/functions/_shared/stripe.ts"), "utf8");
const cryptoAudit = readFileSync(
  join(process.cwd(), "supabase/functions/_shared/cryptographic-audit.ts"),
  "utf8"
);
const rateLimit = readFileSync(
  join(process.cwd(), "supabase/functions/_shared/rate-limit.ts"),
  "utf8"
);
const manageEscrow = readFileSync(
  join(process.cwd(), "supabase/functions/manage-property-escrow/index.ts"),
  "utf8"
);
const escrowService = readFileSync(join(process.cwd(), "src/lib/escrow.service.ts"), "utf8");
const statusDoc = readFileSync(
  join(process.cwd(), "docs/reference/baytmiftah-v4-checklist-status.md"),
  "utf8"
);
const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");

describe("BaytMiftah v4 integrity and payment foundations", () => {
  it("adds append-only integrity, rate-limit, and condition report tables", () => {
    for (const tableName of [
      "integrity_audit_log",
      "integrity_anchors",
      "edge_rate_limit_events",
      "property_condition_reports",
    ]) {
      expect(migrationSql).toContain(`CREATE TABLE IF NOT EXISTS public.${tableName}`);
      expect(migrationSql).toContain(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY`);
    }

    expect(migrationSql).toContain("reject_integrity_audit_log_mutation");
    expect(migrationSql).toContain("BEFORE UPDATE ON public.integrity_audit_log");
    expect(migrationSql).toContain("BEFORE DELETE ON public.integrity_audit_log");
    expect(migrationSql).toContain("prev_hash TEXT NOT NULL");
    expect(migrationSql).toContain("chain_hash TEXT NOT NULL UNIQUE");
    expect(migrationSql).toContain("rsa_signature TEXT");
  });

  it("routes payment movement through a server-side PaymentService abstraction", () => {
    expect(paymentService).toContain("releaseToAgency");
    expect(paymentService).toContain("refundBuyer");
    expect(paymentService).toContain("createSubscription");
    expect(paymentService).toContain("selectEscrowProcessor");
    expect(manageEscrow).toContain("releaseToAgency");
    expect(manageEscrow).toContain("refundBuyer");
    expect(stripeShared).toContain("createStripeCheckoutSession");
    expect(stripeShared).toContain("verifyStripeWebhookSignature");
  });

  it("wires escrow integrity events, watermark metadata, rate limits, and condition reports", () => {
    expect(cryptoAudit).toContain("appendIntegrityAuditEvent");
    expect(cryptoAudit).toContain("AUDIT_RSA_PRIVATE_KEY_PEM");
    expect(rateLimit).toContain("enforceRateLimit");
    expect(manageEscrow).toContain("watermarked_sha256");
    expect(manageEscrow).toContain("VERIFIED BY BAYTMIFTAH");
    expect(manageEscrow).toContain("appendIntegrityAuditEvent");
    expect(manageEscrow).toContain("enforceRateLimit");
    expect(escrowService).toContain("submitConditionReport");
    expect(escrowService).toContain("acknowledgeConditionReport");
  });

  it("documents v4 status and required production configuration", () => {
    expect(statusDoc).toContain("BaytMiftah V4 Checklist Status");
    expect(statusDoc).toContain("Phase 1 SaaS Core | Complete locally");
    expect(statusDoc).toContain("Phase 2 Marketplace | Complete locally");
    expect(statusDoc).toContain("Phase 3 Escrow + Trust | Complete locally");
    expect(statusDoc).toContain("Phase 4 Smart Property Access | Foundation complete locally");
    expect(envExample).toContain("STRIPE_SECRET_KEY=");
    expect(envExample).toContain("STRIPE_WEBHOOK_SECRET=");
    expect(envExample).toContain("AUDIT_RSA_PRIVATE_KEY_PEM=");
    expect(envExample).toContain("EDGE_RATE_LIMIT_MAX_REQUESTS=30");
  });

  it("keeps removed external-chain terms out of the v4 implementation slice", () => {
    const forbiddenTerms = [
      "Poly" + "gon",
      "Alch" + "emy",
      "Hard" + "hat",
      "US" + "DC",
      "smart " + "contract",
      "web" + "3",
    ];

    for (const fileText of [migrationSql, paymentService, stripeShared, cryptoAudit, manageEscrow, statusDoc]) {
      for (const term of forbiddenTerms) {
        expect(fileText.toLowerCase()).not.toContain(term.toLowerCase());
      }
    }
  });
});

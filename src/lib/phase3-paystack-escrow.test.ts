import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260517141922_phase3_paystack_escrow.sql"),
  "utf8"
);
const manageEscrowFunction = readFileSync(
  join(process.cwd(), "supabase/functions/manage-property-escrow/index.ts"),
  "utf8"
);
const paystackShared = readFileSync(
  join(process.cwd(), "supabase/functions/_shared/paystack.ts"),
  "utf8"
);
const paymentServiceShared = readFileSync(
  join(process.cwd(), "supabase/functions/_shared/payment-service.ts"),
  "utf8"
);
const escrowService = readFileSync(join(process.cwd(), "src/lib/escrow.service.ts"), "utf8");
const workspacePayments = readFileSync(
  join(process.cwd(), "src/app/pages/workspace/WorkspacePayments.tsx"),
  "utf8"
);
const adminLayout = readFileSync(join(process.cwd(), "src/app/pages/admin/AdminLayout.tsx"), "utf8");
const userDashboard = readFileSync(
  join(process.cwd(), "src/app/pages/user/Dashboard.tsx"),
  "utf8"
);
const deployScript = readFileSync(
  join(process.cwd(), "scripts/deploySupabasePayments.cjs"),
  "utf8"
);
const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");

describe("Phase 3 Paystack escrow", () => {
  it("creates escrow tables with RLS, grants, and deposit auto-hold trigger", () => {
    for (const tableName of [
      "property_escrows",
      "property_escrow_documents",
      "property_escrow_events",
    ]) {
      expect(migrationSql).toContain(`CREATE TABLE IF NOT EXISTS public.${tableName}`);
      expect(migrationSql).toContain(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY`);
    }

    expect(migrationSql).toContain("private.create_property_escrow_after_payment");
    expect(migrationSql).toContain("NEW.purpose NOT IN ('deposit', 'booking_fee')");
    expect(migrationSql).toContain("event_hash");
    expect(migrationSql).toContain("paystack_transfer_recipient_code");
  });

  it("keeps Phase 3 payment movement on Paystack release and refund APIs", () => {
    expect(paystackShared).toContain("createPaystackTransfer");
    expect(paystackShared).toContain('"/transfer"');
    expect(paymentServiceShared).toContain("createPaystackTransfer");
    expect(paymentServiceShared).toContain("createPaystackRefund");
    expect(paymentServiceShared).toContain("recordInitiatedPropertyRefund");
    expect(manageEscrowFunction).toContain("releaseToAgency");
    expect(manageEscrowFunction).toContain("refundBuyer");
    expect(manageEscrowFunction).toContain('"confirm_release"');
    expect(manageEscrowFunction).toContain('"resolve_dispute"');
    expect(manageEscrowFunction).toContain('"cancel_within_window"');
  });

  it("wires document gate review and internal SHA-256 audit proof", () => {
    expect(manageEscrowFunction).toContain('"upload_document"');
    expect(manageEscrowFunction).toContain('"review_document"');
    expect(manageEscrowFunction).toContain("verification_hashes");
    expect(manageEscrowFunction).toContain("escrow_document");
    expect(manageEscrowFunction).toContain("sha256Hex");
    expect(migrationSql).toContain("escrow_release");
    expect(migrationSql).toContain("escrow_refund");
    expect(migrationSql).toContain("escrow_dispute_resolution");
  });

  it("surfaces escrow controls for organizations, users, and admins", () => {
    expect(escrowService).toContain("getOrganizationEscrows");
    expect(escrowService).toContain("getUserEscrows");
    expect(escrowService).toContain("manage-property-escrow");
    expect(workspacePayments).toContain("Escrow Queue");
    expect(workspacePayments).toContain("Upload ${missingDocument.label}");
    expect(adminLayout).toContain("Paystack Escrow Control");
    expect(adminLayout).toContain("Release to Agency");
    expect(userDashboard).toContain("Confirm Release");
    expect(userDashboard).toContain("Cancel Escrow");
  });

  it("documents and deploys the new escrow function without external-chain dependencies", () => {
    expect(deployScript).toContain("manage-property-escrow");
    expect(envExample).toContain("PAYSTACK_DEFAULT_ESCROW_RECIPIENT_CODE=");
    const externalChainTerms = [
      "Poly" + "gon",
      "Alch" + "emy",
      "Hard" + "hat",
      "US" + "DC",
      "smart " + "contract",
    ];

    for (const term of externalChainTerms) {
      expect(migrationSql.toLowerCase()).not.toContain(term.toLowerCase());
      expect(manageEscrowFunction.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });
});

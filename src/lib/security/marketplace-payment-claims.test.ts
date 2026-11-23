import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("marketplace financial claims", () => {
  it("does not promise BaytMiftah-controlled escrow or custodial protection", () => {
    const pages = [
      "src/app/pages/PropertyDetail.tsx",
      "src/app/pages/PublicLeaseApplication.tsx",
      "src/app/pages/OwnerPortal.tsx",
      "src/app/pages/PublicPropertyExplorer.tsx",
      "src/app/pages/workspace/WorkspacePayments.tsx",
    ].map(source).join("\n");
    expect(pages).not.toMatch(/Protected by BaytMiftah Escrow|Bank-Grade 256-Bit SSL Escrow Protocol|Active Escrow Protection Vaults|Escrow Protected/);
    expect(pages).toContain("payment provider");
  });

  it("answers escrow questions without saying funds sit in a BaytMiftah wallet", () => {
    const assistant = source("supabase/functions/ai-assistant/index.ts");
    expect(assistant).not.toContain("Funds stay in your BaytMiftah wallet escrow balance");
    expect(assistant).toContain("does not hold customer money");
  });

  it("does not present one fixed withholding rate as a guarantee", () => {
    const payouts = source("src/app/pages/workspace/OwnerDisbursements.tsx");
    expect(payouts).not.toContain("Standard statutory rate");
    expect(payouts).toContain("Tax review required");
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260516143000_sold_property_announcements.sql"),
  "utf8"
);

describe("sold property announcement migration", () => {
  it("creates a public announcement table without exposing private payment fields", () => {
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.sold_property_announcements");
    expect(migrationSql).toContain("ALTER TABLE public.sold_property_announcements ENABLE ROW LEVEL SECURITY");
    expect(migrationSql).toContain("GRANT SELECT ON public.sold_property_announcements TO anon, authenticated");
    expect(migrationSql).toContain("buyer_hash TEXT NOT NULL");
    expect(migrationSql).not.toContain("payer_user_id UUID");
    expect(migrationSql).not.toContain("payer_email");
    expect(migrationSql).not.toContain("provider_reference TEXT");
  });

  it("marks finalized sale listings sold and hidden from public search", () => {
    expect(migrationSql).toContain("status = 'sold'");
    expect(migrationSql).toContain("visibility = 'hidden'");
    expect(migrationSql).toContain("announce_successful_property_sale");
  });

  it("syncs receipt hash metadata without exposing raw receipt payloads", () => {
    expect(migrationSql).toContain("receipt_hash TEXT");
    expect(migrationSql).toContain("integrityStatus");
    expect(migrationSql).not.toContain("receipt_payload JSONB");
  });
});

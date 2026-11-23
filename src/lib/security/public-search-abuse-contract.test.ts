import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const load = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("RLS public search and messaging boundaries (static contract)", () => {
  it("limits results in SQL, counts in SQL, and preserves invoker RLS", () => {
    const sql = load("supabase/migrations/20261123101000_public_search_server_pagination.sql");
    const service = load("src/lib/listing.service.ts");
    expect(sql).toContain("SECURITY INVOKER");
    expect(sql).toMatch(/LIMIT p_limit OFFSET p_offset/);
    expect(sql).toMatch(/SELECT count\(\*\) FROM matched/);
    expect(sql).toContain("l.visibility = 'public'");
    expect(sql).toContain("l.status = 'listed'");
    expect(service).toContain('.rpc("search_public_listing_ids"');
    expect(service).not.toContain("filtered.slice(offset, offset + limit)");
  });

  it("enforces property tour whitelist in both client and database", () => {
    const sql = load("supabase/migrations/20261123100000_property_3d_tours.sql");
    const viewer = load("src/app/components/baytmiftah/Property3DTour.tsx");
    expect(sql).toContain("property_virtual_tour_matterport_only");
    expect(sql).toContain("my\\.matterport\\.com");
    expect(viewer).toContain("normalizeMatterportTourUrl");
    expect(viewer).toContain('sandbox="');
  });

  it("blocks messages and serializes anti-spam before inserting rows", () => {
    const sql = load("supabase/migrations/20261123102000_message_abuse_block_rate.sql");
    expect(sql).toContain("BEFORE INSERT ON public.messages");
    expect(sql).toContain("public.blocked_users");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain(">= 20");
    expect(sql).toContain("NEW.created_at := clock_timestamp()");
  });
});

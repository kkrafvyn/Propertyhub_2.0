import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260516131850_production_depth_features.sql"),
  "utf8"
);

describe("production-depth Supabase migration", () => {
  it("creates persisted production-depth tables with RLS enabled", () => {
    [
      "ai_concierge_conversations",
      "buyer_groups",
      "buyer_group_members",
      "buyer_group_comments",
      "escrow_milestones",
      "analytics_events",
      "crm_tasks",
      "trust_review_events",
    ].forEach((tableName) => {
      expect(migrationSql).toContain(`public.${tableName}`);
      expect(migrationSql).toContain(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY`);
    });
  });

  it("keeps anonymous analytics write-only and null-user scoped", () => {
    expect(migrationSql).toContain("REVOKE ALL ON public.analytics_events FROM anon, authenticated");
    expect(migrationSql).toContain("GRANT INSERT ON public.analytics_events TO anon");
    expect(migrationSql).toContain("Anonymous visitors can insert public analytics events");
    expect(migrationSql).toContain("TO anon\nWITH CHECK (user_id IS NULL)");
    expect(migrationSql).not.toContain("GRANT SELECT ON public.analytics_events TO anon");
  });
});

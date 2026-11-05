#!/usr/bin/env node
/**
 * Take App Store capture demo listings private again so /explorer and /search
 * do not show fictional inventory on the live catalog.
 *
 * Usage: node scripts/apple/unpublish-store-demo.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadProjectEnv } from "../load-project-env.mjs";
import { resolveServiceRoleKey } from "../supabase/resolve-service-role-key.mjs";

const env = loadProjectEnv();
const key = await resolveServiceRoleKey(env);
if (!key) throw new Error("Supabase service role required.");

const admin = createClient(env.VITE_SUPABASE_URL, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: rows, error } = await admin
  .from("listings")
  .select("id, status, visibility, property:properties(address, description)")
  .eq("status", "listed")
  .eq("visibility", "public");

if (error) throw error;

const fictional = (rows || []).filter((row) => {
  const haystack = `${row.property?.address || ""} ${row.property?.description || ""}`;
  return /fictional|app review sample|demo cantonments|demo east legon|demo osu/i.test(haystack);
});

if (!fictional.length) {
  console.log(JSON.stringify({ ok: true, unpublished: 0, message: "No public fictional listings found." }));
  process.exit(0);
}

const ids = fictional.map((row) => row.id);
const { data: updated, error: updateError } = await admin
  .from("listings")
  .update({ status: "draft", visibility: "private" })
  .in("id", ids)
  .select("id, status, visibility");

if (updateError) throw updateError;

console.log(
  JSON.stringify({
    ok: true,
    unpublished: updated?.length || 0,
    ids,
  }),
);

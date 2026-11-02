#!/usr/bin/env node
/**
 * Fictional Supabase demo data for App Store capture only (not shipped in app binaries).
 * Requires service role + existing secrets/app-review/{consumer,workspace}.json from provision-review-*.mjs
 *
 * Usage: node scripts/apple/provision-store-demo.mjs
 */
import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadProjectEnv } from "../load-project-env.mjs";
import { resolveServiceRoleKey } from "../supabase/resolve-service-role-key.mjs";
import { manifestPath } from "./load-store-demo-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const checked = ({ data, error }) => {
  if (error) throw error;
  return data;
};

async function readJson(file) {
  return JSON.parse(await fs.readFile(path.join(ROOT, file), "utf8"));
}

const env = loadProjectEnv();
const key = await resolveServiceRoleKey(env);
if (!key) throw new Error("Supabase service role required (see resolve-service-role-key.mjs).");

const admin = createClient(env.VITE_SUPABASE_URL, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const consumer = await readJson("secrets/app-review/consumer.json").catch(() => null);
const workspace = await readJson("secrets/app-review/workspace.json").catch(() => null);
if (!consumer?.email || !workspace?.email) {
  console.error("Run first:");
  console.error("  node scripts/apple/provision-review-consumer.mjs");
  console.error("  node scripts/apple/provision-review-workspace.mjs");
  process.exit(1);
}

if (!workspace.dealCaseIds) {
  workspace.dealCaseIds = {
    shortStayInquiry: workspace.leads[2] || crypto.randomUUID(),
    rentalInquiry: workspace.leads[0] || crypto.randomUUID(),
  };
}
if (!consumer.dealCaseIds) {
  consumer.dealCaseIds = {
    rentalJourney: crypto.randomUUID(),
    bookingJourney: crypto.randomUUID(),
  };
}

const listingShortStay = workspace.listings[2];
const listingRental = workspace.listings[0];
const listingSale = workspace.listings[1];

for (const propId of workspace.properties) {
  checked(
    await admin
      .from("properties")
      .update({
        ghana_post_gps: "GA-184-1234",
        latitude: 5.6037,
        longitude: -0.187,
      })
      .eq("id", propId),
  );
}

const publishedAt = new Date().toISOString();
for (const listingId of workspace.listings) {
  checked(
    await admin
      .from("listings")
      .update({
        status: "listed",
        visibility: "public",
        published_at: publishedAt,
        featured: listingId === listingShortStay,
      })
      .eq("id", listingId),
  );
}

workspace.storeCapturePublished = true;
await fs.mkdir(path.join(ROOT, "secrets/app-review"), { recursive: true });
await fs.writeFile(
  path.join(ROOT, "secrets/app-review/workspace.json"),
  JSON.stringify(workspace, null, 2),
  { mode: 0o600 },
);

checked(
  await admin.from("deal_cases").upsert([
    {
      id: consumer.dealCaseIds.rentalJourney,
      listing_id: listingRental,
      user_id: consumer.userId,
      organization_id: workspace.organizationId,
      case_type: "property_inquiry",
      status: "pending",
      pipeline_stage: "viewing_scheduled",
      priority: "medium",
      message: "FICTIONAL STORE DEMO — rental viewing scheduled for App Store capture.",
      assigned_to: workspace.userId,
    },
    {
      id: consumer.dealCaseIds.bookingJourney,
      listing_id: listingShortStay,
      user_id: consumer.userId,
      organization_id: workspace.organizationId,
      case_type: "property_inquiry",
      status: "pending",
      pipeline_stage: "qualified",
      priority: "high",
      message: "FICTIONAL STORE DEMO — short-stay booking in progress.",
      assigned_to: workspace.userId,
    },
  ]),
);

const checkIn = new Date();
checkIn.setDate(checkIn.getDate() + 14);
const checkOut = new Date(checkIn);
checkOut.setDate(checkOut.getDate() + 3);
const fmt = (d) => d.toISOString().slice(0, 10);

let bookingId = consumer.bookingId;
try {
  bookingId = checked(
    await admin.rpc("create_short_stay_booking", {
      p_listing_id: listingShortStay,
      p_check_in: fmt(checkIn),
      p_check_out: fmt(checkOut),
      p_guest_note: "Fictional App Store demo booking — not a real reservation.",
      p_booking_mode: "instant",
      p_currency: "GHS",
    }),
  );
} catch {
  bookingId =
    bookingId ||
    checked(
      await admin
        .from("short_stay_bookings")
        .insert({
          listing_id: listingShortStay,
          organization_id: workspace.organizationId,
          guest_user_id: consumer.userId,
          check_in: fmt(checkIn),
          check_out: fmt(checkOut),
          nights: 3,
          total_minor: 650 * 3 * 100,
          currency: "GHS",
          status: "pending",
          guest_note: "Fictional App Store demo booking.",
        })
        .select("id")
        .single(),
    ).id;
}
consumer.bookingId = bookingId;
await fs.writeFile(
  path.join(ROOT, "secrets/app-review/consumer.json"),
  JSON.stringify(consumer, null, 2),
  { mode: 0o600 },
);

const shortStayPrice = 650;
const manifest = {
  baseURL: env.VITE_APP_URL?.trim() || "https://app.baytmiftah.com",
  consumer: {
    email: consumer.email,
    password: consumer.password,
    userId: consumer.userId,
  },
  workspace: {
    email: workspace.email,
    password: workspace.password,
    slug: workspace.slug,
    organizationId: workspace.organizationId,
  },
  listingIds: {
    shortStay: listingShortStay,
    rental: listingRental,
    sale: listingSale,
  },
  dealCaseIds: {
    shortStay: consumer.dealCaseIds.bookingJourney,
    rentalInquiry: consumer.dealCaseIds.rentalJourney,
    booking: bookingId,
  },
  routes: {
    shortStayProperty: `/property/${listingShortStay}`,
    rentalProperty: `/property/${listingRental}`,
    checkoutShortStay: `/checkout?listingId=${listingShortStay}&amount=${shortStayPrice}&purpose=booking_fee&bookingId=${bookingId}`,
    journeyRental: `/app/journey/${consumer.dealCaseIds.rentalJourney}`,
    journeyBooking: `/app/journey/${consumer.dealCaseIds.bookingJourney}`,
    trips: "/app/trips",
  },
  fictional: true,
  purpose: "app_store_capture_only",
};

await fs.writeFile(manifestPath(), JSON.stringify(manifest, null, 2), { mode: 0o600 });

console.log(
  JSON.stringify({
    ok: true,
    manifest: path.relative(ROOT, manifestPath()),
    publishedListings: 3,
    consumerLogin: consumer.email,
    workspaceSlug: workspace.slug,
    next: "npm run apple:record-app-preview -- consumer --demo && npm run apple:record-app-preview -- workspace --demo",
  }),
);

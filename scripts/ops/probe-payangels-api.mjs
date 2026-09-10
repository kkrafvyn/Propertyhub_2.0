#!/usr/bin/env node
/**
 * Probe PayAngels transaction/initialize with local secret — prints status + message only.
 *
 * Usage:
 *   npm run ops:probe-payangels-api
 *   npm run ops:probe-payangels-api -- --base https://api.payangels.com
 */
import { loadProjectEnv } from "../load-project-env.mjs";

const baseOverride = process.argv.find((arg) => arg.startsWith("--base="))?.split("=")[1]?.trim();

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function main() {
  const env = loadProjectEnv();
  const secret = env.PAYANGELS_SECRET_KEY?.trim();
  if (!secret) fail("Missing PAYANGELS_SECRET_KEY in root .env");

  const apiBase = baseOverride || env.PAYANGELS_API_BASE?.trim() || "https://api.paystack.co";
  const reference = `probe_${Date.now()}`;
  const payload = {
    amount: "100",
    email: env.PILOT_TEST_USER_EMAIL?.trim() || "tenant-a-isolation@mailinator.com",
    currency: "GHS",
    reference,
    callback_url: env.VITE_PUBLIC_APP_URL?.trim() || "https://app.baytmiftah.com/checkout",
  };

  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    apiBase,
    reference,
    secretPresent: true,
  }, null, 2));

  const response = await fetch(`${apiBase.replace(/\/+$/, "")}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);
  console.log(JSON.stringify({
    httpStatus: response.status,
    providerStatus: body?.status ?? null,
    message: body?.message ?? null,
    hasData: Boolean(body?.data),
    reference: body?.data?.reference ?? reference,
  }, null, 2));

  if (!response.ok || !body?.status) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

#!/usr/bin/env node
/**
 * PayAngels staging E2E — payment init, webhook reconciliation, refund, disbursement probes.
 *
 * Requires in .env (or CI secrets):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *   PAYANGELS_SECRET_KEY, PAYANGELS_WEBHOOK_SECRET
 *   PAYANGELS_SANDBOX_TEST_REFERENCE (optional — live webhook replay)
 *   PILOT_TEST_USER_EMAIL, PILOT_TEST_USER_PASSWORD (workspace user with finance role)
 *   PILOT_TEST_LISTING_ID (payable listing in pilot org)
 *
 * Usage:
 *   npm run pilot:payangels-e2e
 *   npm run pilot:payangels-e2e -- --dry-run
 */
import crypto from "node:crypto";
import { loadProjectEnv } from "../load-project-env.mjs";
import { requireCertificationConfig,requireAccepted,assertStableLedger } from './payment-certification.mjs';

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const certify = args.has('--certify');

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

function hmacSha512(secret, payload) {
  return crypto.createHmac("sha512", secret).update(payload, "utf8").digest("hex");
}

async function signIn(env) {
  const email =
    env.PILOT_TEST_USER_EMAIL?.trim() || "tenant-a-isolation@mailinator.com";
  const password =
    env.PILOT_TEST_USER_PASSWORD?.trim() ||
    env.TENANT_FIXTURE_PASSWORD?.trim() ||
    "BaytMiftah-TenantIsolation-CI-2026!";

  const res = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) fail(`Sign-in failed: ${body.error_description || body.msg || res.status}`);
  return body.access_token;
}

async function invokeFunction(env, name, token, payload) {
  const url = `${env.VITE_SUPABASE_URL}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.VITE_SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function resolveWebhookSecret(env) {
  return env.PAYANGELS_WEBHOOK_SECRET?.trim() || env.PAYANGELS_SECRET_KEY?.trim() || "";
}

async function main() {
  const env = loadProjectEnv();
  if(certify)requireCertificationConfig(env,dryRun);
  const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
  for (const key of required) {
    if (!env[key]?.trim()) fail(`Missing ${key}`);
  }
  if (!resolveWebhookSecret(env)) {
    fail("Missing PAYANGELS_WEBHOOK_SECRET (or PAYANGELS_SECRET_KEY fallback)");
  }

  console.log("PayAngels staging E2E");
  if (dryRun) {
    console.log("  (dry-run — config check only)");
    ok("Required env keys present");
    return;
  }

  const token = await signIn(env);
  async function readRows(resource) {
    const response=await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${resource}`,{headers:{apikey:env.VITE_SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error('Certification ledger query failed');
    return response.json();
  }
  async function verifiedLedger() {
    const rows=await readRows(`property_transactions?provider_reference=eq.${encodeURIComponent(env.PAYANGELS_SANDBOX_TEST_REFERENCE)}&select=id,status,organization_id`);
    if(rows.length!==1 || rows[0].status!=='success' || rows[0].organization_id!==env.PILOT_TEST_ORG_ID)throw new Error('Expected one successful sandbox payment in the fixture organization');
    return readRows(`organization_wallet_ledger?reference_type=eq.property_transaction&reference_id=eq.${rows[0].id}&select=id,amount_minor,reference_id&order=id`);
  }
  ok("Authenticated pilot test user");

  const listingId = env.PILOT_TEST_LISTING_ID?.trim();
  if (listingId) {
    const init = await invokeFunction(env, "initialize-payangels-payment", token, {
      listingId,
      purpose: "other",
    });
    if(certify)requireAccepted('Payment initialization',init.status);
    if (init.status === 200 || init.status === 201) {
      ok(`Payment init: reference=${init.json?.reference || init.json?.data?.reference || "ok"}`);
    } else if (init.status === 503) {
      console.warn(`⚠ Payment init not configured: ${init.json?.error || init.status}`);
    } else if (init.status === 500) {
      console.warn(
        `⚠ Payment init reached DB but PayAngels API failed (${init.json?.error || "unknown"}) — verify PAYANGELS_SECRET_KEY in Supabase secrets`,
      );
    } else {
      fail(`Payment init failed (${init.status}): ${JSON.stringify(init.json)}`);
    }
  } else {
    console.warn("⚠ Skipping payment init — set PILOT_TEST_LISTING_ID");
  }

  const sandboxRef = env.PAYANGELS_SANDBOX_TEST_REFERENCE?.trim();
  const webhookSecret = resolveWebhookSecret(env);
  if (sandboxRef) {
    const webhook = {
      event: "charge.success",
      data: {
        reference: sandboxRef,
        amount: Number(env.PAYANGELS_SANDBOX_AMOUNT_MINOR || 25000) / 100,
        status: "success",
        currency: "GHS",
      },
    };
    const payload = JSON.stringify(webhook);
    const signature = hmacSha512(webhookSecret, payload);
    const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/payangels-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-payangels-signature": signature,
      },
      body: payload,
    });
    if(certify){
      requireAccepted('Webhook reconciliation',res.status);
      const before=await verifiedLedger();
      const replay=await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/payangels-webhook`,{method:'POST',headers:{'Content-Type':'application/json','x-payangels-signature':signature},body:payload});
      requireAccepted('Duplicate webhook',replay.status);assertStableLedger(before,await verifiedLedger());
      ok('Duplicate webhook preserves one payment ledger credit');
    }
    if (res.status === 200) {
      ok("Webhook reconciliation accepted");
    } else {
      const body = await res.text();
      console.warn(`⚠ Webhook probe returned ${res.status}: ${body.slice(0, 200)}`);
    }
  } else {
    console.warn("⚠ Skipping webhook replay — set PAYANGELS_SANDBOX_TEST_REFERENCE");
  }

  const txId = env.PILOT_TEST_TRANSACTION_ID?.trim();
  if (txId) {
    const refund = await invokeFunction(env, "initiate-payangels-refund", token, {
      transactionId: txId,
      reason: "pilot_e2e_probe",
    });
    if(certify){
      requireAccepted('Refund',refund.status);
      const rows=await readRows(`property_refunds?transaction_id=eq.${txId}&select=id,status,amount_minor`);
      if(rows.length!==1||rows[0].status!=='processed')throw new Error('Refund has not completed; verify provider callback and rerun with fresh fixtures');
    }
    if (refund.status === 200 || refund.status === 201) {
      ok("Refund initiation accepted");
    } else if (refund.status === 503 || refund.status === 404) {
      console.warn(`⚠ Refund probe: ${refund.json?.error || refund.status}`);
    } else {
      fail(`Refund failed (${refund.status}): ${JSON.stringify(refund.json)}`);
    }
  } else {
    console.warn("⚠ Skipping refund — set PILOT_TEST_TRANSACTION_ID after a successful payment");
  }

  const approvalId = env.PILOT_TEST_APPROVAL_ID?.trim();
  const orgId = env.PILOT_TEST_ORG_ID?.trim();
  if (approvalId && orgId) {
    const disb = await invokeFunction(env, "initiate-payangels-disbursement", token, {
      organizationId: orgId,
      approvalId,
      amount: 1,
      phone: env.PILOT_TEST_DISBURSE_PHONE || "233200000000",
    });
    if(certify){
      requireAccepted('Disbursement',disb.status);
      const rows=await readRows(`estate_distribution_approvals?id=eq.${approvalId}&select=id,status`);
      if(rows.length!==1||rows[0].status!=='paid')throw new Error('Disbursement has not settled; verify provider callback before certification');
    }
    if (disb.status === 200 || disb.status === 201) {
      ok("Disbursement initiation accepted");
    } else if (disb.status === 503) {
      console.warn(`⚠ Disbursement not configured: ${disb.json?.error || disb.status}`);
    } else {
      console.warn(`⚠ Disbursement probe (${disb.status}): ${JSON.stringify(disb.json)}`);
    }
  } else {
    console.warn("⚠ Skipping disbursement — set PILOT_TEST_ORG_ID and PILOT_TEST_APPROVAL_ID");
  }

  console.log(certify?'\nPayment certification steps passed. Retain the sandbox run output as evidence.':"\nPayAngels staging E2E complete (see warnings for optional probes).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Wire optional integrations (everything except Twilio).
 * - Generates web-push VAPID keys when missing
 * - Generates INTERNAL_AUTOMATIONS_KEY when missing
 * - Syncs server secrets from root .env → supabase/.env.payments (deploy helper)
 * - Updates root .env client flags (VITE_WEB_PUSH_PUBLIC_KEY, VITE_OPENAI_ENABLED, etc.)
 *
 * Usage: npm run integrations:wire
 */
import path from "node:path";
import webpush from "web-push";
import {
  PROJECT_ROOT,
  ROOT_ENV_PATH,
  buildServerSecrets,
  loadProjectEnv,
  upsertRootEnv,
  writeServerSecretsFile,
} from "./load-project-env.mjs";

const PAYMENTS_PATH = path.join(PROJECT_ROOT, "supabase", ".env.payments");

function randomKey(bytes = 32) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  const random = crypto.getRandomValues(new Uint8Array(bytes));
  for (const byte of random) {
    out += alphabet[byte % alphabet.length];
  }
  return out;
}

function resolveAiProvider(env) {
  const explicit = (env.AI_PROVIDER || "").trim().toLowerCase();
  const hasOpenAi = Boolean(env.OPENAI_API_KEY?.trim());
  const hasQwen = Boolean(env.QWEN_API_KEY?.trim());

  if (explicit === "openai" || explicit === "qwen") {
    if (explicit === "openai" && hasOpenAi) return "openai";
    if (explicit === "qwen" && hasQwen) return "qwen";
    return "";
  }

  if (hasOpenAi && !hasQwen) return "openai";
  if (hasQwen && !hasOpenAi) return "qwen";
  if (hasOpenAi && hasQwen) return "openai";
  return "";
}

function main() {
  const rootEnv = loadProjectEnv();
  const payments = buildServerSecrets(rootEnv);

  if (!payments.INTERNAL_AUTOMATIONS_KEY) {
    payments.INTERNAL_AUTOMATIONS_KEY = randomKey(48);
    upsertRootEnv({ INTERNAL_AUTOMATIONS_KEY: payments.INTERNAL_AUTOMATIONS_KEY });
    console.log("Generated INTERNAL_AUTOMATIONS_KEY");
  }

  if (!payments.WEB_PUSH_PUBLIC_KEY || !payments.WEB_PUSH_PRIVATE_KEY) {
    const vapid = webpush.generateVAPIDKeys();
    payments.WEB_PUSH_PUBLIC_KEY = vapid.publicKey;
    payments.WEB_PUSH_PRIVATE_KEY = vapid.privateKey;
    upsertRootEnv({
      WEB_PUSH_PUBLIC_KEY: vapid.publicKey,
      WEB_PUSH_PRIVATE_KEY: vapid.privateKey,
    });
    console.log("Generated web-push VAPID keys");
  }

  writeServerSecretsFile(PAYMENTS_PATH, { ...rootEnv, ...payments });
  console.log(`Synced ${path.relative(PROJECT_ROOT, PAYMENTS_PATH)} from root .env`);

  const aiProvider = resolveAiProvider(payments);
  const aiEnabled = Boolean(aiProvider);

  const clientUpdates = {
    VITE_WEB_PUSH_PUBLIC_KEY: payments.WEB_PUSH_PUBLIC_KEY,
    VITE_OPENAI_ENABLED: aiEnabled ? "true" : rootEnv.VITE_OPENAI_ENABLED || "",
    VITE_AI_ENABLED: aiEnabled ? "true" : rootEnv.VITE_AI_ENABLED || "",
    VITE_AI_PROVIDER: aiProvider || rootEnv.VITE_AI_PROVIDER || "",
    VITE_RESEND_CONFIGURED: payments.RESEND_API_KEY ? "true" : rootEnv.VITE_RESEND_CONFIGURED || "",
  };

  if (!rootEnv.VITE_PUBLIC_APP_URL) clientUpdates.VITE_PUBLIC_APP_URL = payments.PUBLIC_APP_URL;
  if (!rootEnv.VITE_SITE_URL) clientUpdates.VITE_SITE_URL = payments.PUBLIC_APP_URL;

  for (const key of [
    "VITE_PAYSTACK_PUBLIC_KEY",
    "VITE_STRIPE_PUBLIC_KEY",
    "VITE_EXCHANGE_RATE_API_KEY",
    "VITE_PROPERTY_TOKEN_ADDRESS",
    "VITE_PROPERTY_ESCROW_ADDRESS",
    "VITE_PROPERTY_OWNERSHIP_ADDRESS",
    "VITE_PROPERTY_LEASE_ADDRESS",
    "VITE_VERIFICATION_REGISTRY_ADDRESS",
  ]) {
    if (rootEnv[key]) clientUpdates[key] = rootEnv[key];
  }

  upsertRootEnv(clientUpdates);
  console.log(`Updated ${path.relative(PROJECT_ROOT, ROOT_ENV_PATH)}`);

  const configured = {
    paystack: Boolean(payments.PAYSTACK_SECRET_KEY && rootEnv.VITE_PAYSTACK_PUBLIC_KEY),
    resend: Boolean(payments.RESEND_API_KEY),
    webPush: Boolean(payments.WEB_PUSH_PUBLIC_KEY && payments.WEB_PUSH_PRIVATE_KEY),
    openAi: aiEnabled,
    ai: aiEnabled,
    stripe: Boolean(payments.STRIPE_SECRET_KEY && rootEnv.VITE_STRIPE_PUBLIC_KEY),
    exchangeRates: Boolean(rootEnv.VITE_EXCHANGE_RATE_API_KEY),
    blockchain: Boolean(
      rootEnv.VITE_PROPERTY_TOKEN_ADDRESS ||
        rootEnv.VITE_PROPERTY_ESCROW_ADDRESS ||
        rootEnv.VITE_VERIFICATION_REGISTRY_ADDRESS,
    ),
    mls: Boolean(payments.MLS_API_KEY || payments.ZILLOW_API_KEY || payments.REALTOR_API_KEY),
  };

  console.log("\nIntegration status:");
  for (const [name, ok] of Object.entries(configured)) {
    console.log(`  ${ok ? "✓" : "○"} ${name}`);
  }

  const missing = [];
  if (!configured.paystack) {
    missing.push("Paystack: VITE_PAYSTACK_PUBLIC_KEY + PAYSTACK_SECRET_KEY in .env");
  }
  if (!configured.resend) missing.push("Resend: RESEND_API_KEY in .env");
  if (!configured.ai) {
    missing.push("AI: set AI_PROVIDER=openai + OPENAI_API_KEY, or AI_PROVIDER=qwen + QWEN_API_KEY");
  }
  if (!configured.stripe) {
    missing.push("Stripe: VITE_STRIPE_PUBLIC_KEY + STRIPE_SECRET_KEY in .env");
  }
  if (!configured.blockchain) missing.push("Deploy contracts + VITE_PROPERTY_*_ADDRESS");
  if (!configured.mls) missing.push("MLS/Zillow/Realtor keys (optional)");

  if (missing.length) {
    console.log("\nStill needs API keys in .env (then re-run this script):");
    missing.forEach((item) => console.log(`  - ${item}`));
  }

  console.log("\nNext: npm run supabase:deploy:payments -- --skip-db");
}

main();

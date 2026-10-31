#!/usr/bin/env node
/**
 * Send a branded BaytMiftah transactional test email (same template as Edge functions).
 * Usage: node --experimental-strip-types scripts/send-test-email.mjs you@example.com
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadProjectEnv } = require("./load-project-env.cjs");

const to = process.argv[2];
if (!to) {
  console.error("Usage: node --experimental-strip-types scripts/send-test-email.mjs <email>");
  process.exit(1);
}

const env = loadProjectEnv();
for (const [key, value] of Object.entries(env)) {
  if (value != null && String(value).trim() && process.env[key] == null) {
    process.env[key] = String(value);
  }
}

const siteUrl =
  env.PUBLIC_APP_URL ||
  env.VITE_PUBLIC_APP_URL ||
  env.VITE_SITE_URL ||
  "https://app.baytmiftah.com";

const { buildTransactionalEmail } = await import(
  "../supabase/functions/_shared/email-template.ts"
);
// Production Edge functions use sendBrandedTransactionalEmail in _shared/resend-mail.ts (same template).

const key = (env.RESEND_API_KEY || "").trim();
const from = (env.NOTIFICATION_EMAIL_FROM || "noreply@baytmiftah.com").trim();
const replyTo = (env.NOTIFICATION_EMAIL_REPLY_TO || "support@baytmiftah.com").trim();

if (!key) {
  console.error("RESEND_API_KEY missing in .env");
  process.exit(1);
}

const emailContent = buildTransactionalEmail({
  siteUrl,
  title: "Your BaytMiftah email is connected",
  body:
    "This message uses the same branded transactional template as notifications, invites, and enrollment emails sent from the platform.\n\nIf you can see the header, footer, and button below, Resend and your domain setup are working correctly.",
  ctaUrl: siteUrl.replace(/\/+$/, ""),
  ctaLabel: "OPEN BAYTMIFTAH",
  preheader: "Branded template test from BaytMiftah",
});

const fromHeader = from.includes("<") ? from : `BaytMiftah <${from}>`;

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60_000);

const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  signal: controller.signal,
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: fromHeader,
    reply_to: replyTo,
    to: [to],
    subject: "BaytMiftah — branded email test",
    text: emailContent.text,
    html: emailContent.html,
  }),
}).finally(() => clearTimeout(timeout));

const body = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error("Send failed:", response.status, body);
  process.exit(1);
}

console.log("Sent branded template to", to, "— Resend id:", body.id);

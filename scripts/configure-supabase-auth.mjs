#!/usr/bin/env node

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadProjectEnv } = require("./load-project-env.cjs");

const env = loadProjectEnv();
const projectRef = env.SUPABASE_PROJECT_REF;
const token = env.SUPABASE_ACCESS_TOKEN;

if (!projectRef || !token) {
  console.error("SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN are required in .env");
  process.exit(1);
}

const appUrl = (env.VITE_PUBLIC_APP_URL || env.PUBLIC_APP_URL || "https://app.baytmiftah.com").replace(/\/+$/, "");
const marketingUrl = (env.VITE_SITE_URL || "https://baytmiftah.com").replace(/\/+$/, "");
const vercelPublicAppUrl = (env.VERCEL_PUBLIC_APP_URL || "https://propertyhub-2-0-ecru.vercel.app").replace(/\/+$/, "");
const extraRedirects = (env.SUPABASE_EXTRA_REDIRECT_URLS || "")
  .split(",")
  .map((value) => value.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const redirectUrlSet = new Set([
  "http://localhost:5173/**",
  "http://127.0.0.1:5173/**",
  `${appUrl}/**`,
  `${marketingUrl}/**`,
  `${vercelPublicAppUrl}/**`,
  "https://www.baytmiftah.com/**",
  "https://app.baytmiftah.com/**",
  "https://propertyhub-2-0-ecru.vercel.app/**",
  "https://*.vercel.app/**",
  "baytmiftah://auth/callback",
  "baytmiftah://auth/callback/**",
  ...extraRedirects.map((url) => `${url}/**`),
]);

const redirectUrls = [...redirectUrlSet].join(",");

const payload = {
  site_url: appUrl,
  uri_allow_list: redirectUrls,
  mailer_autoconfirm: false,
  mfa_totp_enroll_enabled: true,
  mfa_totp_verify_enabled: true,
  mfa_phone_enroll_enabled: false,
  mfa_phone_verify_enabled: false,
};

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const body = await response.text();
if (!response.ok) {
  console.error("Failed to configure Supabase Auth:", response.status, body);
  process.exit(1);
}

console.log("Supabase Auth configured:");
console.log(`  site_url: ${payload.site_url}`);
console.log(`  uri_allow_list: ${payload.uri_allow_list}`);
console.log("  mailer_autoconfirm: false");
console.log("  mfa_totp_enroll_enabled: true");
console.log("  mfa_totp_verify_enabled: true");

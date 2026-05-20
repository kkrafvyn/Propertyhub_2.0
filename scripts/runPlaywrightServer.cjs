#!/usr/bin/env node

const { spawn } = require("child_process");

const port = process.env.PLAYWRIGHT_WEB_PORT || "4173";
const host = "127.0.0.1";

const env = {
  ...process.env,
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "https://example.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY:
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "pk_publishable_playwright",
  VITE_PUBLIC_APP_URL: `http://${host}:${port}`,
  PUBLIC_APP_URL: `http://${host}:${port}`,
  VITE_PAYSTACK_PUBLIC_KEY: process.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_playwright",
  VITE_STRIPE_PUBLISHABLE_KEY:
    process.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_playwright",
  WEB_PUSH_PUBLIC_KEY: process.env.WEB_PUSH_PUBLIC_KEY || "playwright_web_push_public_key",
  WEB_PUSH_CONTACT_EMAIL:
    process.env.WEB_PUSH_CONTACT_EMAIL || "support@baytmiftah.app",
};

const command =
  process.platform === "win32"
    ? `npm run dev -- --host ${host} --port ${port} --strictPort`
    : `npm run dev -- --host ${host} --port ${port} --strictPort`;
const child = spawn(command, {
  cwd: process.cwd(),
  env,
  shell: true,
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

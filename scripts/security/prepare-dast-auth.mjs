#!/usr/bin/env node
/**
 * Obtain a Supabase access token for authenticated DAST (synthetic test account only).
 * Writes GitHub Actions outputs; never prints the token.
 */
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const email = process.env.DAST_TEST_EMAIL?.trim();
const password = process.env.DAST_TEST_PASSWORD?.trim();
const supabaseUrl = (
  process.env.DAST_SUPABASE_URL ||
  process.env.VITE_SUPABASE_TEST_URL ||
  process.env.VITE_SUPABASE_URL
)?.trim();
const anonKey = (
  process.env.DAST_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_TEST_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY
)?.trim();

async function signIn() {
  if (!email || !password || !supabaseUrl || !anonKey) {
    return { available: false, reason: "Missing DAST_TEST_EMAIL, DAST_TEST_PASSWORD, or Supabase URL/anon key" };
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    return {
      available: false,
      reason: body.error_description || body.msg || `Sign-in failed (${response.status})`,
    };
  }

  return { available: true, token: body.access_token };
}

function writeGithubOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${name}=${value}\n`);
  }
}

async function main() {
  const result = await signIn();

  if (!result.available) {
    console.log(`Authenticated DAST: UNVERIFIED (${result.reason})`);
    writeGithubOutput("available", "false");
    writeGithubOutput("zap_options", "");
    process.exit(0);
  }

  const token = result.token;
  mkdirSync(".github/zap", { recursive: true });
  writeFileSync(".github/zap/.auth-token", token, { encoding: "utf8", mode: 0o600 });

  const replacement = `Bearer ${token}`;
  const zapOptions = [
    "-config",
    "replacer.full_list(0).description=auth",
    "-config",
    "replacer.full_list(0).enabled=true",
    "-config",
    "replacer.full_list(0).matchtype=REQ_HDR",
    "-config",
    "replacer.full_list(0).matchstr=Authorization",
    "-config",
    "replacer.full_list(0).regex=false",
    "-config",
    `replacer.full_list(0).replacement=${replacement}`,
  ].join(" ");

  console.log("Authenticated DAST session prepared for synthetic test account.");
  writeGithubOutput("available", "true");
  writeGithubOutput("token", token);
  writeGithubOutput("zap_options", zapOptions);
}

main().catch((error) => {
  console.error("Authenticated DAST preparation failed:", error.message || error);
  process.exit(1);
});

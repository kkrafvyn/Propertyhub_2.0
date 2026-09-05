#!/usr/bin/env node
/**
 * Validates DAST_TARGET_URL is an approved non-production environment.
 * Exits 0 when safe, 1 when blocked or missing.
 */
const target = process.env.DAST_TARGET_URL?.trim();

const PRODUCTION_PATTERNS = [
  /^https?:\/\/(www\.)?baytmiftah\.com(\/|$)/i,
  /^https?:\/\/propertyhub-2-0(-ecru)?\.vercel\.app(\/|$)/i,
  /^https?:\/\/propertyhub-2-0\.vercel\.app(\/|$)/i,
  /^https?:\/\/(www\.)?propertyhub.*\.vercel\.app(\/|$)/i,
];

const STAGING_HINTS = [/staging/i, /preview/i, /localhost/i, /127\.0\.0\.1/, /-dev\./i, /test\./i];

function main() {
  if (!target) {
    console.error("DAST_TARGET_URL is not set.");
    console.error("Set a staging/preview URL in the GitHub staging environment.");
    process.exit(1);
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    console.error("DAST_TARGET_URL is not a valid URL.");
    process.exit(1);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    console.error("DAST_TARGET_URL must use http or https.");
    process.exit(1);
  }

  for (const pattern of PRODUCTION_PATTERNS) {
    if (pattern.test(target)) {
      console.error("DAST blocked: target matches a production URL pattern.");
      console.error("Use an explicit staging or preview environment only.");
      process.exit(1);
    }
  }

  const looksStaging = STAGING_HINTS.some((hint) => hint.test(target));
  if (!looksStaging && process.env.DAST_ALLOW_NON_STAGING !== "true") {
    console.error("DAST blocked: target does not look like staging/preview/localhost.");
    console.error("Set DAST_ALLOW_NON_STAGING=true only for approved isolated test hosts.");
    process.exit(1);
  }

  console.log("DAST target approved:", parsed.origin);
}

main();

#!/usr/bin/env node
/**
 * Validate marketing/apple/* assets against App Store Connect specs.
 *
 * Usage: node scripts/apple/validate-store-assets.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const APPLE = path.join(ROOT, "marketing", "apple");

const SCREENSHOT_W = 1290;
const SCREENSHOT_H = 2796;
const PREVIEW_W = 886;
const PREVIEW_H = 1920;
const PREVIEW_MIN_S = 15;
const PREVIEW_MAX_S = 30;
const PREVIEW_MAX_BYTES = 500 * 1024 * 1024;
const ICON = 1024;

/** @param {string} file */
function imageSize(file) {
  const out = execFileSync(
    `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 ${JSON.stringify(file)}`,
    { encoding: "utf8", shell: true },
  ).trim();
  const [w, h] = out.split(",").map(Number);
  return { w, h };
}

/** @param {string} file */
function videoInfo(file) {
  const wh = execFileSync(
    `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 ${JSON.stringify(file)}`,
    { encoding: "utf8", shell: true },
  ).trim();
  const [w, h] = wh.split(",").map(Number);
  const duration = Number(
    execFileSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 ${JSON.stringify(file)}`,
      { encoding: "utf8", shell: true },
    ).trim(),
  );
  return { w, h, duration, size: statSync(file).size };
}

/** @param {string[]} errors */
function fail(errors) {
  console.error("\nApple store asset validation FAILED:\n");
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

/** @param {'consumer' | 'workspace'} variant */
function validateVariant(variant) {
  const errors = [];
  const base = path.join(APPLE, variant);

  const icon = path.join(base, "app-store-icon-1024.png");
  if (!existsSync(icon)) {
    errors.push(`${variant}: missing app-store-icon-1024.png`);
  } else {
    const { w, h } = imageSize(icon);
    if (w !== ICON || h !== ICON) {
      errors.push(`${variant}: icon must be ${ICON}×${ICON}, got ${w}×${h}`);
    }
  }

  const shotsDir = path.join(base, "screenshots", "iphone-6.7");
  const shots = existsSync(shotsDir)
    ? readdirSync(shotsDir)
        .filter((f) => /\.jpe?g$/i.test(f))
        .map((f) => path.join(shotsDir, f))
    : [];
  if (shots.length < 1) {
    errors.push(`${variant}: need at least 1 screenshot in screenshots/iphone-6.7/`);
  }
  if (shots.length > 10) {
    console.warn(
      `Warning: ${variant} has ${shots.length} files in iphone-6.7/ — upload only connect-upload/ (max 10).`,
    );
  }
  for (const file of shots) {
    const { w, h } = imageSize(file);
    if (w !== SCREENSHOT_W || h !== SCREENSHOT_H) {
      errors.push(
        `${path.relative(ROOT, file)}: expected ${SCREENSHOT_W}×${SCREENSHOT_H}, got ${w}×${h}`,
      );
    }
  }

  const preview = path.join(base, "app-preview.mp4");
  if (!existsSync(preview)) {
    errors.push(`${variant}: missing app-preview.mp4 (optional but recommended)`);
  } else {
    const { w, h, duration, size } = videoInfo(preview);
    if (w !== PREVIEW_W || h !== PREVIEW_H) {
      errors.push(
        `${variant} app-preview: expected ${PREVIEW_W}×${PREVIEW_H}, got ${w}×${h} — run npm run apple:export-store-assets -- --force`,
      );
    }
    if (duration < PREVIEW_MIN_S - 0.1 || duration > PREVIEW_MAX_S + 0.5) {
      errors.push(
        `${variant} app-preview: duration ${duration.toFixed(1)}s (Apple requires ${PREVIEW_MIN_S}–${PREVIEW_MAX_S}s)`,
      );
    }
    if (size > PREVIEW_MAX_BYTES) {
      errors.push(`${variant} app-preview: file exceeds 500MB`);
    }
  }

  const uploadDir = path.join(base, "connect-upload");
  if (existsSync(uploadDir)) {
    const uploadShots = readdirSync(uploadDir).filter((f) => /^\d{2}-screenshot\.jpe?g$/i.test(f));
    if (uploadShots.length < 1) {
      errors.push(`${variant}: connect-upload/ has no numbered screenshots`);
    }
  }

  return errors;
}

function main() {
  const errors = [...validateVariant("consumer"), ...validateVariant("workspace")];
  if (errors.length) fail(errors);
  console.log("Apple store assets OK for consumer + workspace.");
  console.log("Upload folders: marketing/apple/*/connect-upload/");
}

main();

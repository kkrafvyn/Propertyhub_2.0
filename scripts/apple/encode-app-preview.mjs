#!/usr/bin/env node
/**
 * Encode a raw in-app screen recording to App Store Connect app preview spec.
 *
 * Usage:
 *   node scripts/apple/encode-app-preview.mjs <consumer|workspace> [input.webm|mp4]
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const PREVIEW_W = 886;
const PREVIEW_H = 1920;
const MIN_S = 15;
const MAX_S = 30;
const PAD_COLOR = "0x0d1913";

/** @param {string} cmd */
function run(cmd) {
  execFileSync(cmd, { cwd: ROOT, stdio: "inherit", shell: true });
}

/** @param {string} file */
function durationSeconds(file) {
  const raw = execFileSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 ${JSON.stringify(file)}`,
    { encoding: "utf8", shell: true },
  ).trim();
  return Number(raw) || 0;
}

/**
 * @param {string} input
 * @param {string} output
 */
export function encodeAppleAppPreview(input, output) {
  if (!existsSync(input)) {
    throw new Error(`Missing input video: ${input}`);
  }
  mkdirSync(path.dirname(output), { recursive: true });

  let dur = durationSeconds(input);
  if (dur > 0 && dur < MIN_S) {
    console.warn(`Input is ${dur.toFixed(1)}s — looping to reach ${MIN_S}s minimum.`);
  }

  const loop = dur > 0 && dur < MIN_S ? `-stream_loop 2` : "";
  const vf = `scale=${PREVIEW_W}:${PREVIEW_H}:force_original_aspect_ratio=decrease,pad=${PREVIEW_W}:${PREVIEW_H}:(ow-iw)/2:(oh-ih)/2:color=${PAD_COLOR}`;

  run(
    `ffmpeg -y ${loop} -i ${JSON.stringify(input)} -t ${MAX_S} -vf ${JSON.stringify(vf)} -an -c:v libx264 -profile:v high -level 4.0 -b:v 11M -maxrate 12M -bufsize 24M -pix_fmt yuv420p -r 30 -movflags +faststart ${JSON.stringify(output)}`,
  );

  dur = durationSeconds(output);
  if (dur < MIN_S - 0.05) {
    throw new Error(`Encoded preview is ${dur.toFixed(1)}s; Apple requires ${MIN_S}–${MAX_S}s.`);
  }
  return output;
}

function main() {
  const variant = process.argv[2];
  if (variant !== "consumer" && variant !== "workspace") {
    console.error("Usage: node scripts/apple/encode-app-preview.mjs <consumer|workspace> [input]");
    process.exit(1);
  }

  const base = path.join(ROOT, "marketing", "apple", variant);
  const defaultInput = path.join(base, "source", "in-app-preview.webm");
  const input = process.argv[3] ? path.resolve(process.argv[3]) : defaultInput;

  const outMain = path.join(base, "app-preview.mp4");
  const outUpload = path.join(base, "connect-upload", "app-preview.mp4");

  encodeAppleAppPreview(input, outMain);
  mkdirSync(path.dirname(outUpload), { recursive: true });
  copyFileSync(outMain, outUpload);
  console.log(`Wrote ${path.relative(ROOT, outMain)} (${(statSync(outMain).size / 1e6).toFixed(1)} MB)`);
  console.log(`Wrote ${path.relative(ROOT, outUpload)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}

#!/usr/bin/env node
/**
 * Extract in-app JPEG stills from encoded app preview for connect-upload/.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const APPLE_W = 1290;
const APPLE_H = 2796;
const PAD_COLOR = "0x0d1913";
const TIMES = [2, 6, 10, 14, 18, 24];

/** @param {string} variant */
export function extractConnectScreenshots(variant, mp4Path) {
  const connectDir = path.join(ROOT, "marketing", "apple", variant, "connect-upload");
  mkdirSync(connectDir, { recursive: true });
  if (!existsSync(mp4Path)) return;

  TIMES.forEach((t, i) => {
    const out = path.join(connectDir, `${String(i + 1).padStart(2, "0")}-screenshot.jpg`);
    const vf = `scale=${APPLE_W}:${APPLE_H}:force_original_aspect_ratio=decrease,pad=${APPLE_W}:${APPLE_H}:(ow-iw)/2:(oh-ih)/2:color=${PAD_COLOR}`;
    execFileSync(
      `ffmpeg -y -ss ${t} -i ${JSON.stringify(mp4Path)} -frames:v 1 -vf ${JSON.stringify(vf)} -q:v 2 ${JSON.stringify(out)}`,
      { cwd: ROOT, stdio: "pipe", shell: true },
    );
  });
}

#!/usr/bin/env node
/** Resolve ffmpeg and export App Store–ready H.264 MP4 previews. */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function resolveFfmpeg() {
  try {
    const mod = await import("@ffmpeg-installer/ffmpeg");
    if (mod?.default?.path && fs.existsSync(mod.default.path)) return mod.default.path;
  } catch {
    /* optional dep */
  }
  const which = spawnSync("which", ["ffmpeg"], { encoding: "utf8" });
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
  throw new Error("ffmpeg not found. Run: npm install --save-dev @ffmpeg-installer/ffmpeg");
}

export async function exportAppPreview({
  input,
  output,
  width,
  height,
  minSeconds = 15,
  maxSeconds = 30,
}) {
  const ffmpeg = await resolveFfmpeg();
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const targetSeconds = Math.min(maxSeconds, Math.max(minSeconds, 18));
  const probe = spawnSync(ffmpeg, ["-i", input], { encoding: "utf8" });
  const durationMatch = /Duration: (\d+):(\d+):([\d.]+)/.exec(probe.stderr || "");
  let inputSeconds = 12;
  if (durationMatch) {
    inputSeconds =
      Number(durationMatch[1]) * 3600 +
      Number(durationMatch[2]) * 60 +
      Number(durationMatch[3]);
  }
  const padSeconds = Math.max(0, targetSeconds - inputSeconds + 0.25);
  const vf = [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
    ...(padSeconds > 0 ? [`tpad=stop_mode=clone:stop_duration=${padSeconds.toFixed(2)}`] : []),
  ].join(",");
  const args = [
    "-y",
    "-i",
    input,
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "high",
    "-level",
    "4.0",
    "-b:v",
    "10M",
    "-maxrate",
    "12M",
    "-bufsize",
    "16M",
    "-movflags",
    "+faststart",
    "-an",
    "-t",
    String(targetSeconds),
    output,
  ];
  const run = spawnSync(ffmpeg, args, { encoding: "utf8" });
  if (run.status !== 0) {
    throw new Error(`ffmpeg failed: ${run.stderr || run.stdout}`);
  }
  return output;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [input, output, w, h] = process.argv.slice(2);
  if (!input || !output) {
    console.error("Usage: node brag-ffmpeg.mjs <input> <output.mp4> [width] [height]");
    process.exit(1);
  }
  await exportAppPreview({
    input,
    output,
    width: Number(w || 1920),
    height: Number(h || 1080),
  });
  console.log("Wrote", output);
}

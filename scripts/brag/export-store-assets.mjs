#!/usr/bin/env node
/**
 * Export Google Play + App Store listing assets from brag-output MP4s.
 *
 * Prerequisites: ffmpeg on PATH; run render-brag-variants.mjs / render-brag-ads.mjs first.
 *
 * Usage:
 *   node scripts/brag/export-store-assets.mjs [--force]
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const BRAG = path.join(ROOT, "brag-output");
const MARKETING = path.join(ROOT, "marketing");

const force = process.argv.includes("--force");

/** @param {string} cmd */
function run(cmd) {
  execFileSync(cmd, { cwd: ROOT, stdio: "inherit", shell: true, env: process.env });
}

/** @param {string} bin */
function which(bin) {
  try {
    execFileSync(process.platform === "win32" ? `where ${bin}` : `which ${bin}`, {
      stdio: "pipe",
      shell: true,
    });
    return true;
  } catch {
    return false;
  }
}

const PLAY_W = 1080;
const PLAY_H = 1920;
const APPLE_W = 1290;
const APPLE_H = 2796;
const FEATURE_W = 1024;
const FEATURE_H = 500;
const PAD_COLOR = "0x0d1913";

/** Seconds to grab stills (18s brag iPhone compositions). */
const FRAME_TIMES = [1.5, 4.5, 7.5, 10.5, 13.5, 16];

/**
 * @param {object} p
 * @param {string} p.video
 * @param {string} p.outDir
 * @param {string} p.prefix
 * @param {number} p.w
 * @param {number} p.h
 * @param {boolean} p.padToApple67
 */
function exportFrames({ video, outDir, prefix, w, h, padToApple67 }) {
  if (!existsSync(video)) {
    console.error(`Missing video: ${video}`);
    return [];
  }
  mkdirSync(outDir, { recursive: true });
  const written = [];
  FRAME_TIMES.forEach((t, i) => {
    const name = `${String(i + 1).padStart(2, "0")}-${prefix}-t${String(t).replace(".", "-")}.jpg`;
    const out = path.join(outDir, name);
    if (existsSync(out) && !force) {
      written.push(out);
      return;
    }
    const vf = padToApple67
      ? `scale=${APPLE_W}:-2,pad=${APPLE_W}:${APPLE_H}:(ow-iw)/2:(oh-ih)/2:color=${PAD_COLOR}`
      : `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=${PAD_COLOR}`;
    run(
      `ffmpeg -y -ss ${t} -i ${JSON.stringify(video)} -frames:v 1 -vf ${JSON.stringify(vf)} -q:v 2 ${JSON.stringify(out)}`,
    );
    written.push(out);
  });
  return written;
}

/**
 * @param {string} video
 * @param {string} out
 */
function exportFeatureGraphic(video, out) {
  if (!existsSync(video)) return null;
  mkdirSync(path.dirname(out), { recursive: true });
  if (existsSync(out) && !force) return out;
  const vf = `scale=${FEATURE_W}:-1,crop=${FEATURE_W}:${FEATURE_H}:(in_w-out_w)/2:(in_h-out_h)/3`;
  run(
    `ffmpeg -y -ss 6 -i ${JSON.stringify(video)} -frames:v 1 -vf ${JSON.stringify(vf)} -q:v 2 ${JSON.stringify(out)}`,
  );
  return out;
}

/**
 * @param {string} video
 * @param {string} out
 */
function exportAppPreview(video, out) {
  if (!existsSync(video)) return null;
  mkdirSync(path.dirname(out), { recursive: true });
  if (existsSync(out) && !force) return out;
  run(
    `ffmpeg -y -i ${JSON.stringify(video)} -t 30 -an -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -movflags +faststart ${JSON.stringify(out)}`,
  );
  return out;
}

function main() {
  if (!which("ffmpeg")) {
    console.error("ffmpeg is required. Install ffmpeg and retry.");
    process.exit(1);
  }

  const consumerIphone = path.join(BRAG, "brag-consumer-iphone.mp4");
  const workspaceIphone = path.join(BRAG, "brag-workspace-iphone.mp4");
  const listingsIphone = path.join(BRAG, "ad-listings-iphone.mp4");

  const variants = [
    {
      key: "consumer",
      primary: consumerIphone,
      extra: listingsIphone,
      featureSource: consumerIphone,
    },
    {
      key: "workspace",
      primary: workspaceIphone,
      extra: null,
      featureSource: workspaceIphone,
    },
  ];

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: "brag-output (Hyperframes compositions)",
    specs: {
      googlePlayPhone: `${PLAY_W}x${PLAY_H} JPEG`,
      appleIphone67: `${APPLE_W}x${APPLE_H} JPEG (padded from 9:16 brag)`,
      featureGraphic: `${FEATURE_W}x${FEATURE_H} JPEG`,
      appPreview: "H.264 MP4, max 30s, no audio",
    },
    variants: {},
  };

  for (const v of variants) {
    const playPhone = path.join(
      MARKETING,
      "google-play",
      v.key,
      "screenshots",
      "phone",
    );
    const apple67 = path.join(
      MARKETING,
      "apple",
      v.key,
      "screenshots",
      "iphone-6.7",
    );
    const playFeature = path.join(
      MARKETING,
      "google-play",
      v.key,
      "feature-graphic.jpg",
    );
    const playPreview = path.join(
      MARKETING,
      "google-play",
      v.key,
      "app-preview.mp4",
    );
    const applePreview = path.join(
      MARKETING,
      "apple",
      v.key,
      "app-preview.mp4",
    );

    const playFrames = exportFrames({
      video: v.primary,
      outDir: playPhone,
      prefix: "brag",
      w: PLAY_W,
      h: PLAY_H,
      padToApple67: false,
    });
    const appleFrames = exportFrames({
      video: v.primary,
      outDir: apple67,
      prefix: "brag",
      w: APPLE_W,
      h: APPLE_H,
      padToApple67: true,
    });

    if (v.extra) {
      exportFrames({
        video: v.extra,
        outDir: playPhone,
        prefix: "listings-ad",
        w: PLAY_W,
        h: PLAY_H,
        padToApple67: false,
      });
      exportFrames({
        video: v.extra,
        outDir: apple67,
        prefix: "listings-ad",
        w: APPLE_W,
        h: APPLE_H,
        padToApple67: true,
      });
    }

    const feature = exportFeatureGraphic(v.featureSource, playFeature);
    const playCopyFeature = path.join(
      MARKETING,
      "google-play",
      v.key,
      "feature-graphic-play.jpg",
    );
    if (feature && existsSync(feature)) {
      copyFileSync(feature, playCopyFeature);
    }

    const preview = exportAppPreview(v.primary, playPreview);
    if (preview && existsSync(preview)) {
      copyFileSync(preview, applePreview);
    }

    manifest.variants[v.key] = {
      videos: { primary: path.relative(ROOT, v.primary) },
      googlePlay: {
        phoneScreenshots: playFrames.map((f) => path.relative(ROOT, f)),
        featureGraphic: path.relative(ROOT, playFeature),
        appPreview: path.relative(ROOT, playPreview),
      },
      apple: {
        iphone67Screenshots: appleFrames.map((f) => path.relative(ROOT, f)),
        appPreview: path.relative(ROOT, applePreview),
      },
    };
  }

  const manifestPath = path.join(MARKETING, "store-submission-manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nWrote ${manifestPath}`);
  console.log(
    "\nUpload phone/iphone-6.7 JPEGs in Play Console and App Store Connect.",
  );
  console.log(
    "App previews: optional on Play (YouTube or file); recommended on Apple for 6.7\" display.",
  );
}

main();

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
/** App Store Connect accepted preview size (large iPhone class), not native 1290×2796. */
const APPLE_PREVIEW_W = 886;
const APPLE_PREVIEW_H = 1920;
const APPLE_PREVIEW_MIN_S = 15;
const APPLE_PREVIEW_MAX_S = 30;
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
 * @returns {number}
 */
function probeDurationSeconds(video) {
  try {
    const raw = execFileSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 ${JSON.stringify(video)}`,
      { cwd: ROOT, encoding: "utf8", shell: true },
    ).trim();
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Google Play promo / generic preview (9:16, no audio).
 * @param {string} video
 * @param {string} out
 */
function exportPlayAppPreview(video, out) {
  if (!existsSync(video)) return null;
  mkdirSync(path.dirname(out), { recursive: true });
  if (existsSync(out) && !force) return out;
  const vf = `scale=${PLAY_W}:${PLAY_H}:force_original_aspect_ratio=decrease,pad=${PLAY_W}:${PLAY_H}:(ow-iw)/2:(oh-ih)/2:color=${PAD_COLOR}`;
  run(
    `ffmpeg -y -i ${JSON.stringify(video)} -t ${APPLE_PREVIEW_MAX_S} -vf ${JSON.stringify(vf)} -an -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -movflags +faststart ${JSON.stringify(out)}`,
  );
  return out;
}

/**
 * App Store Connect app preview: 886×1920, 15–30s, H.264 ~10–12 Mbps (Apple accepted resolution).
 * @param {string} video
 * @param {string} out
 */
function exportAppleAppPreview(video, out) {
  if (!existsSync(video)) return null;
  mkdirSync(path.dirname(out), { recursive: true });
  if (existsSync(out) && !force) return out;

  const dur = probeDurationSeconds(video);
  const loopInput =
    dur > 0 && dur < APPLE_PREVIEW_MIN_S
      ? `-stream_loop 3 -i ${JSON.stringify(video)}`
      : `-i ${JSON.stringify(video)}`;

  const vf = `scale=${APPLE_PREVIEW_W}:${APPLE_PREVIEW_H}:force_original_aspect_ratio=decrease,pad=${APPLE_PREVIEW_W}:${APPLE_PREVIEW_H}:(ow-iw)/2:(oh-ih)/2:color=${PAD_COLOR}`;

  run(
    `ffmpeg -y ${loopInput} -t ${APPLE_PREVIEW_MAX_S} -vf ${JSON.stringify(vf)} -an -c:v libx264 -profile:v high -level 4.0 -b:v 11M -maxrate 12M -bufsize 24M -pix_fmt yuv420p -r 30 -movflags +faststart ${JSON.stringify(out)}`,
  );

  const outDur = probeDurationSeconds(out);
  if (outDur > 0 && outDur < APPLE_PREVIEW_MIN_S - 0.05) {
    console.warn(
      `Warning: ${path.relative(ROOT, out)} is ${outDur.toFixed(1)}s; Apple requires 15–30s.`,
    );
  }
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
      appPreviewPlay: "H.264 MP4, max 30s, 1080×1920, no audio",
      appPreviewApple: `${APPLE_PREVIEW_W}x${APPLE_PREVIEW_H} H.264, 15–30s, 10–12 Mbps, no audio`,
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

    exportPlayAppPreview(v.primary, playPreview);

    const inAppRaw = path.join(MARKETING, "apple", v.key, "source", "in-app-preview.webm");
    if (existsSync(inAppRaw)) {
      exportAppleAppPreview(inAppRaw, applePreview);
    } else {
      console.warn(
        `Skip Apple app preview for ${v.key}: no in-app recording at ${path.relative(ROOT, inAppRaw)}. Run: npm run apple:record-app-preview -- ${v.key}`,
      );
    }

    const connectDir = path.join(MARKETING, "apple", v.key, "connect-upload");
    mkdirSync(connectDir, { recursive: true });
    const submissionShots = appleFrames
      .filter((f) => path.basename(f).includes("-brag-"))
      .sort();
    const inAppCapture = path.join(MARKETING, "apple", v.key, "source", "in-app-preview.webm");
    if (!existsSync(inAppCapture)) {
      submissionShots.forEach((src, i) => {
        const dest = path.join(connectDir, `${String(i + 1).padStart(2, "0")}-screenshot.jpg`);
        copyFileSync(src, dest);
      });
    }
    if (existsSync(applePreview)) {
      copyFileSync(applePreview, path.join(connectDir, "app-preview.mp4"));
    } else {
      console.warn(`${v.key}: connect-upload/ will have screenshots only until in-app app-preview.mp4 exists.`);
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
        connectUploadDir: path.relative(ROOT, connectDir),
        connectUploadScreenshots: submissionShots.map((_, i) =>
          path.relative(ROOT, path.join(connectDir, `${String(i + 1).padStart(2, "0")}-screenshot.jpg`)),
        ),
        appPreview: path.relative(ROOT, applePreview),
        connectUploadPreview: path.relative(ROOT, path.join(connectDir, "app-preview.mp4")),
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
    "Apple: upload marketing/apple/*/connect-upload/ (6 screenshots + app-preview.mp4).",
  );
  console.log(
    "Validate: npm run apple:validate-store-assets",
  );
}

main();

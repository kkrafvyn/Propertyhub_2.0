#!/usr/bin/env node
/** Convert BRAG WebM browser previews to App Store–ready MP4 sizes. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportAppPreview } from "./brag-ffmpeg.mjs";

const assetsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../apple-store-assets");

const jobs = [
  {
    input: "workspace/preview/mac-workspace-preview.webm",
    output: "workspace/preview/mac-workspace-app-preview-1920x1080.mp4",
    width: 1920,
    height: 1080,
  },
  {
    input: "consumer/preview/iphone-consumer-preview.webm",
    output: "consumer/preview/iphone-67-app-preview-886x1920.mp4",
    width: 886,
    height: 1920,
  },
];

for (const job of jobs) {
  const input = path.join(assetsRoot, job.input);
  const output = path.join(assetsRoot, job.output);
  if (!fs.existsSync(input)) {
    console.warn(`Skip missing ${job.input}`);
    continue;
  }
  await exportAppPreview({
    input,
    output,
    width: job.width,
    height: job.height,
    minSeconds: 15,
    maxSeconds: 30,
  });
  console.log(`Wrote ${job.output}`);
}

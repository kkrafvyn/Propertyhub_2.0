#!/usr/bin/env node
/**
 * Export Google Play high-res icons (512×512) from brand SVGs.
 * Output: marketing/google-play/{consumer,workspace}/play-store-icon-512.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const variants = [
  {
    id: "consumer",
    svg: path.join(root, "public/brand/app-icon.svg"),
    out: path.join(root, "marketing/google-play/consumer/play-store-icon-512.png"),
  },
  {
    id: "workspace",
    svg: path.join(root, "public/brand/app-icon-workspace.svg"),
    out: path.join(root, "marketing/google-play/workspace/play-store-icon-512.png"),
  },
];

for (const { id, svg, out } of variants) {
  if (!fs.existsSync(svg)) {
    console.error(`Missing SVG for ${id}: ${svg}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(fs.readFileSync(svg)).resize(512, 512).png().toFile(out);
  console.log(`Wrote ${path.relative(root, out)}`);
}

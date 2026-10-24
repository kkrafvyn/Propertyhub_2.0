import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";
import os from "node:os";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const sourceSvg = path.join(projectRoot, "public", "brand", "app-icon-workspace.svg");
const outputDir = path.join(projectRoot, "electron", "build");

// NSIS + Windows shell expect standard ICO sizes (512 in ICO often breaks NSIS).
const icoSizes = [16, 32, 48, 256];
const pngSizes = [16, 32, 48, 64, 128, 256, 512, 1024];

async function main() {
  if (!fs.existsSync(sourceSvg)) {
    throw new Error(`Missing brand asset: ${sourceSvg}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const icoPngPaths = [];
  for (const size of icoSizes) {
    const pngPath = path.join(outputDir, `icon-${size}.png`);
    await sharp(sourceSvg).resize(size, size).png().toFile(pngPath);
    icoPngPaths.push(pngPath);
  }

  for (const size of pngSizes) {
    if (icoSizes.includes(size)) continue;
    const pngPath = path.join(outputDir, `icon-${size}.png`);
    await sharp(sourceSvg).resize(size, size).png().toFile(pngPath);
  }

  const masterPng = path.join(outputDir, "icon.png");
  await sharp(sourceSvg).resize(1024, 1024).png().toFile(masterPng);

  // The Mac App Store requires the 512pt @2x (1024px) ICNS representation.
  if (process.platform === "darwin") {
    const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "baytmiftah-icons-"));
    const iconset = path.join(temporaryDir, "icon.iconset");
    fs.mkdirSync(iconset);
    try {
      for (const size of [16, 32, 128, 256, 512]) {
        for (const scale of [1, 2]) {
          const suffix = scale === 2 ? "@2x" : "";
          await sharp(sourceSvg).resize(size * scale, size * scale).png()
            .toFile(path.join(iconset, `icon_${size}x${size}${suffix}.png`));
        }
      }
      execFileSync("iconutil", ["-c", "icns", iconset, "-o", path.join(outputDir, "icon.icns")]);
    } finally {
      fs.rmSync(temporaryDir, { recursive: true, force: true });
    }
  }

  const icoBuffer = await pngToIco(icoPngPaths);
  fs.writeFileSync(path.join(outputDir, "icon.ico"), icoBuffer);

  const stats = fs.statSync(path.join(outputDir, "icon.ico"));
  console.log(`Desktop icons written to ${outputDir} (icon.ico ${stats.size} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

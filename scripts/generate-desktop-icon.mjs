import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const sourceSvg = path.join(projectRoot, "public", "brand", "app-icon-workspace.svg");
const outputDir = path.join(projectRoot, "electron", "build");

// NSIS + Windows shell expect standard ICO sizes (512 in ICO often breaks NSIS).
const icoSizes = [16, 32, 48, 256];
const pngSizes = [16, 32, 48, 64, 128, 256, 512];

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
  await sharp(sourceSvg).resize(512, 512).png().toFile(masterPng);

  const icoBuffer = await pngToIco(icoPngPaths);
  fs.writeFileSync(path.join(outputDir, "icon.ico"), icoBuffer);

  const stats = fs.statSync(path.join(outputDir, "icon.ico"));
  console.log(`Desktop icons written to ${outputDir} (icon.ico ${stats.size} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

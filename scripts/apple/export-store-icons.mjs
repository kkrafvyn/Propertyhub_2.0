#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
for (const variant of [
  { name: 'consumer', source: 'app-icon.svg', background: '#0F2922', ios: 'ios' },
  { name: 'workspace', source: 'app-icon-workspace.svg', background: '#0B2545', ios: 'ios-business' },
]) {
  const svg = await fs.readFile(path.join(root, 'public/brand', variant.source));
  // Apple applies the platform's icon mask. Fill the source's transparent corners
  // with the brand background and omit the alpha channel from the submitted PNG.
  const png = await sharp(svg, { density: 192 })
    .resize(1024, 1024)
    .flatten({ background: variant.background })
    .removeAlpha()
    .png()
    .toBuffer();
  const folder = path.join(root, 'marketing/apple', variant.name);
  await fs.mkdir(folder, { recursive: true });
  // Match the rounded Workspace presentation icon, using each app's color.
  const rounded = await sharp(svg, { density: 192 })
    .resize(1024, 1024)
    .png()
    .toBuffer();
  await fs.writeFile(path.join(folder, 'app-icon-rounded-1024.png'), rounded);
  if (variant.name === 'consumer') {
    await fs.writeFile(path.join(root, 'public/brand/app-icon.png'), rounded);
  }
  await fs.writeFile(path.join(folder, 'app-store-icon-1024.png'), png);
  await fs.writeFile(path.join(root, variant.ios, 'App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), png);
  const metadata = await sharp(png).metadata();
  if (metadata.width !== 1024 || metadata.height !== 1024 || metadata.hasAlpha) {
    throw new Error(`Invalid Apple icon: ${variant.name}`);
  }
  console.log(`${variant.name}: 1024x1024 opaque icon exported and installed in iOS assets`);
}

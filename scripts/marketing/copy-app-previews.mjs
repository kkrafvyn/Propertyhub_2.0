#!/usr/bin/env node
/**
 * Copy App Store connect-upload previews into public/ for marketing embeds.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'public', 'marketing', 'previews');

const pairs = [
  {
    mp4: path.join(ROOT, 'marketing/apple/consumer/connect-upload/app-preview.mp4'),
    poster: path.join(ROOT, 'marketing/apple/consumer/connect-upload/04-screenshot.jpg'),
    outMp4: 'consumer-app-preview.mp4',
    outPoster: 'consumer-poster.jpg',
  },
  {
    mp4: path.join(ROOT, 'marketing/apple/workspace/connect-upload/app-preview.mp4'),
    poster: path.join(ROOT, 'marketing/apple/workspace/connect-upload/04-screenshot.jpg'),
    outMp4: 'workspace-app-preview.mp4',
    outPoster: 'workspace-poster.jpg',
  },
];

fs.mkdirSync(OUT, { recursive: true });

for (const item of pairs) {
  if (!fs.existsSync(item.mp4)) {
    console.warn(`Skip missing preview: ${item.mp4}`);
    continue;
  }
  fs.copyFileSync(item.mp4, path.join(OUT, item.outMp4));
  if (fs.existsSync(item.poster)) {
    fs.copyFileSync(item.poster, path.join(OUT, item.outPoster));
  }
}

console.log(`Marketing app previews synced to ${path.relative(ROOT, OUT)}`);

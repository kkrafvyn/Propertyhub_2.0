#!/usr/bin/env node

/**
 * electron-builder 26.15.x embeds plist 3.1.0, whose XML parser call omits
 * the MIME type. @xmldom/xmldom 0.9+ correctly requires it. Keep the patched
 * XML dependency and repair the old call immediately before packaging.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [
  'node_modules/app-builder-lib/node_modules/plist/lib/parse.js',
  'node_modules/electron-builder/node_modules/app-builder-lib/node_modules/plist/lib/parse.js',
].map((file) => path.join(root, file));

const parserPath = candidates.find((file) => fs.existsSync(file));
if (!parserPath) {
  throw new Error('Unable to locate electron-builder’s bundled plist parser.');
}

const source = fs.readFileSync(parserPath, 'utf8');
const legacyCall = 'new DOMParser().parseFromString(xml);';
const compatibleCall = "new DOMParser().parseFromString(xml, 'text/xml');";

if (source.includes(compatibleCall)) {
  console.log('electron-builder plist parser is already compatible with @xmldom/xmldom 0.9+.');
} else if (source.includes(legacyCall)) {
  fs.writeFileSync(parserPath, source.replace(legacyCall, compatibleCall));
  console.log('Prepared electron-builder plist parser for @xmldom/xmldom 0.9+.');
} else {
  throw new Error(`Unexpected plist parser format: ${parserPath}`);
}

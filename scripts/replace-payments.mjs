import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'artifacts', 'backups']);
const TEXT_EXT = new Set(['.js','.ts','.jsx','.tsx','.mjs','.cjs','.json','.md','.mdx','.html','.env','.toml','.sql','.py','.yml','.yaml','.txt','.css','.scss','.tsx','.d.ts']);

const replacements = [
  { from: /\bPaystack\b/g, to: 'PayAngels' },
  { from: /\bpaystack\b/g, to: 'payangels' },
  { from: /\bPAYSTACK\b/g, to: 'PAYANGELS' },
  { from: /\bStripe\b/g, to: 'PayAngels' },
  { from: /\bstripe\b/g, to: 'payangels' },
  { from: /\bSTRIPE\b/g, to: 'PAYANGELS' },
  // Ensure env var replacements for PayAngels
  { from: /VITE_STRIPE_PUBLIC_KEY/g, to: 'VITE_PAYANGELS_PUBLIC_KEY' },
  { from: /STRIPE_SECRET_KEY/g, to: 'PAYANGELS_SECRET_KEY' },
  // provider strings
  { from: /provider:\s*['"]payangels['"]/g, to: 'provider: "payangels"' },
  { from: /provider:\s*['"]payangels['"]/g, to: 'provider: "payangels"' },
  // payment function names
  { from: /initialize-payangels-payment/g, to: 'initialize-payangels-payment' },
  { from: /verify-payangels-payment/g, to: 'verify-payangels-payment' },
  { from: /initiate-payangels-refund/g, to: 'initiate-payangels-refund' },
  { from: /payangels-webhook/g, to: 'payangels-webhook' },
  { from: /initialize-payangels-payment/g, to: 'initialize-payangels-payment' },
  { from: /verify-payangels-payment/g, to: 'verify-payangels-payment' },
  { from: /initiate-payangels-refund/g, to: 'initiate-payangels-refund' },
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!TEXT_EXT.has(ext) && ext !== '') continue;
      try {
        let content = fs.readFileSync(full, 'utf8');
        let changed = false;
        for (const r of replacements) {
          const newContent = content.replace(r.from, r.to);
          if (newContent !== content) {
            content = newContent;
            changed = true;
          }
        }
        if (changed) {
          fs.writeFileSync(full, content, 'utf8');
          console.log('Updated', path.relative(ROOT, full));
        }
      } catch (err) {
        // skip binary files or read errors
      }
    }
  }
}

function renamePaths(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      renamePaths(full);
    }
  }
  // After walking, check this dir for rename
  const parent = path.dirname(dir);
}

function renameMatches(root) {
  const all = getAllPaths(root);
  // sort descending so we rename deeper paths first
  all.sort((a,b) => b.length - a.length);
  for (const p of all) {
    const base = path.basename(p);
    let newBase = base
      .replace(/payangels/gi, (m)=>{return /[A-Z]/.test(m[0])? 'PayAngels':'payangels'})
      .replace(/payangels/gi, (m)=>{return /[A-Z]/.test(m[0])? 'PayAngels':'payangels'});
    if (newBase !== base) {
      const newPath = path.join(path.dirname(p), newBase);
      try {
        fs.renameSync(p, newPath);
        console.log('Renamed', path.relative(ROOT, p), '→', path.relative(ROOT, newPath));
      } catch (err) {
        console.error('Rename failed', p, err.message);
      }
    }
  }
}

function getAllPaths(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    out.push(full);
    if (entry.isDirectory()) out.push(...getAllPaths(full));
  }
  return out;
}

console.log('Starting replacements...');
walk(ROOT);
console.log('Attempting path renames...');
renameMatches(ROOT);
console.log('Done.');

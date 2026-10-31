#!/usr/bin/env node
/**
 * UI debt inventory for CI summaries and local ratchets.
 * Usage: node scripts/audit-ui-debt.mjs [--json]
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const appRoot = join(process.cwd(), "src/app");
const jsonMode = process.argv.includes("--json");

async function walkTsx(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      await walkTsx(full, acc);
    } else if (entry.name.endsWith(".tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

function countMatches(text, re) {
  return (text.match(re) || []).length;
}

const uiPrimitiveOverlays = new Set(["dialog.tsx", "sheet.tsx", "drawer.tsx"]);

const files = await walkTsx(appRoot);

let microtype = 0;
const fixedOverlays = [];
const mixedTokenFiles = [];
const pageMetaMissing = [];
const oqsGapWorkspace = [];
let silentCatch = 0;
let asAny = 0;
let zIndexMagic = 0;
let slateGray = 0;
const spinnerNoOqs = [];

for (const file of files) {
  const rel = file.replace(process.cwd() + "\\", "").replace(process.cwd() + "/", "");
  const base = rel.split(/[/\\]/).pop();
  const text = await readFile(file, "utf8");

  microtype += countMatches(text, /text-\[(10|11)px\]/g);

  if (text.includes("fixed inset-0") && !uiPrimitiveOverlays.has(base)) {
    fixedOverlays.push(rel);
  }

  if (text.includes("text-ink") && text.includes("text-muted-foreground")) {
    mixedTokenFiles.push(rel);
  }

  if (rel.includes("pages/user/") && base.endsWith(".tsx") && !text.includes("PageMeta")) {
    pageMetaMissing.push(rel);
  }

  if (
    rel.includes("pages/workspace/") &&
    text.includes("WorkspacePageShell") &&
    !text.includes("OperationalQueryState") &&
    (text.includes("setLoading(true)") || text.includes("useEffect"))
  ) {
    oqsGapWorkspace.push(rel);
  }

  silentCatch += countMatches(text, /catch\s*\{\s*\}/g);
  asAny += countMatches(text, /\bas any\b/g);
  zIndexMagic += countMatches(text, /z-\[(?!var)[^\]]+\]/g);

  if (!rel.includes("marketing/") && !rel.includes("AuthShell")) {
    slateGray += countMatches(text, /(?:slate-|gray-)\d+/g);
  }

  const hasSpinner = /animate-spin|Loader2/.test(text);
  const hasOqs = text.includes("OperationalQueryState");
  const hasSkeleton = /PageLoadingSkeleton|ListSkeleton|ListingCardSkeleton/.test(text);
  if (rel.includes("pages/") && hasSpinner && !hasOqs && !hasSkeleton) {
    spinnerNoOqs.push(rel);
  }
}

const payload = {
  microtype10px11px: microtype,
  fixedOverlayCount: fixedOverlays.length,
  fixedOverlays: fixedOverlays.sort(),
  mixedTokenFileCount: mixedTokenFiles.length,
  mixedTokenFiles: mixedTokenFiles.sort().slice(0, 40),
  consumerPageMetaMissing: pageMetaMissing.sort(),
  workspaceOqsGaps: oqsGapWorkspace.sort().slice(0, 30),
  silentEmptyCatch: silentCatch,
  asAnyInApp: asAny,
  zIndexMagic,
  slateGrayClassCount: slateGray,
  spinnerWithoutOqsOrSkeleton: spinnerNoOqs.sort().slice(0, 30),
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log("UI debt audit (src/app)");
  console.log(`  Microtype text-[10|11px]: ${payload.microtype10px11px}`);
  console.log(`  Fixed inset-0 overlays (excl. dialog/sheet/drawer): ${payload.fixedOverlayCount}`);
  console.log(`  Mixed ink + muted-foreground files: ${payload.mixedTokenFileCount}`);
  console.log(`  User pages missing PageMeta: ${payload.consumerPageMetaMissing.length}`);
  console.log(`  Workspace shell + fetch, no OQS (sample): ${payload.workspaceOqsGaps.length}`);
  console.log(`  Silent catch {}: ${payload.silentEmptyCatch}`);
  console.log(`  "as any" in app tsx: ${payload.asAnyInApp}`);
  console.log(`  z-[non-var] usages: ${payload.zIndexMagic}`);
  console.log(`  slate-/gray- classes (excl. marketing/auth): ${payload.slateGrayClassCount}`);
  if (payload.fixedOverlays.length) {
    console.log("\nOverlays:");
    for (const f of payload.fixedOverlays.slice(0, 15)) console.log(`  - ${f}`);
    if (payload.fixedOverlays.length > 15) console.log(`  ... +${payload.fixedOverlays.length - 15} more`);
  }
}

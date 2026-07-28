/**
 * Generates translated locale chrome partials from English source modules.
 * Run: node scripts/generate-locale-chrome.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import translate from "google-translate-api-x";
import { FEATURE_CHROME_BY_CODE as existingFeatureChrome } from "../src/app/i18n/locales/partials/_featureChrome.js";
import complianceEn from "../src/app/i18n/locales/en/compliance.js";
import searchPageEn from "../src/app/i18n/locales/en/searchPage.js";
import coreEn from "../src/app/i18n/locales/en/core.js";
import mobileEn from "../src/app/i18n/locales/en/mobile.js";
import { LOCALE_META } from "../src/app/i18n/localeRegistry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PARTIALS = path.join(ROOT, "src/app/i18n/locales/partials");

/** Google Translate target codes (fallback to English on failure). */
const GOOGLE_LANG = {
  en: "en",
  ar: "ar",
  fr: "fr",
  es: "es",
  pt: "pt",
  de: "de",
  it: "it",
  nl: "nl",
  ru: "ru",
  tr: "tr",
  zh: "zh-CN",
  hi: "hi",
  ja: "ja",
  ko: "ko",
  vi: "vi",
  tw: "ak",
  ha: "ha",
  sw: "sw",
  yo: "yo",
  ig: "ig",
  am: "am",
  pl: "pl",
  sv: "sv",
  uk: "uk",
  id: "id",
  ms: "ms",
  th: "th",
  bn: "bn",
  ur: "ur",
  fa: "fa",
  ee: "ee",
  zu: "zu",
  af: "af",
};

const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g;

function flattenStrings(obj, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const pathKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenStrings(value, pathKey, out);
    } else if (typeof value === "string") {
      out[pathKey] = value;
    }
  }
  return out;
}

function unflattenStrings(flat) {
  const root = {};
  for (const [pathKey, value] of Object.entries(flat)) {
    const parts = pathKey.split(".");
    let cursor = root;
    for (let i = 0; i < parts.length - 1; i++) {
      cursor[parts[i]] ??= {};
      cursor = cursor[parts[i]];
    }
    cursor[parts[parts.length - 1]] = value;
  }
  return root;
}

function protectPlaceholders(text) {
  const tokens = [];
  const safe = text.replace(PLACEHOLDER_RE, (match) => {
    const token = `__PH_${tokens.length}__`;
    tokens.push(match);
    return token;
  });
  return { safe, tokens };
}

function restorePlaceholders(text, tokens) {
  let out = text;
  tokens.forEach((token, i) => {
    out = out.replace(`__PH_${i}__`, token);
    out = out.replace(`__ PH _ ${i} __`, token);
    out = out.replace(new RegExp(`__\\s*PH\\s*_\\s*${i}\\s*__`, "gi"), token);
  });
  return out;
}

async function translateFlatStrings(flat, targetCode) {
  if (targetCode === "en") return { ...flat };

  const googleCode = GOOGLE_LANG[targetCode] ?? targetCode;
  const entries = Object.entries(flat);
  const translated = {};

  const batchSize = 12;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const protectedBatch = batch.map(([, text]) => protectPlaceholders(text));

    try {
      const results = await translate.translate(
        protectedBatch.map((p) => p.safe),
        { from: "en", to: googleCode },
      );
      const list = Array.isArray(results) ? results : [results];
      batch.forEach(([key], idx) => {
        const raw = list[idx]?.text ?? flat[key];
        translated[key] = restorePlaceholders(raw, protectedBatch[idx].tokens);
      });
    } catch (err) {
      console.warn(`  translate batch failed for ${targetCode}: ${err.message}`);
      batch.forEach(([key, text]) => {
        translated[key] = text;
      });
    }

    await new Promise((r) => setTimeout(r, 350));
  }

  return translated;
}

function toJsObject(value, indent = 0) {
  const pad = "  ".repeat(indent);
  const padIn = "  ".repeat(indent + 1);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  const entries = Object.entries(value);
  if (!entries.length) return "{}";
  const lines = entries.map(([k, v]) => {
    const key = /^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
    return `${padIn}${key}: ${toJsObject(v, indent + 1)}`;
  });
  return `{\n${lines.join(",\n")}\n${pad}}`;
}

async function buildFeatureChrome() {
  const source = {
    compliance: complianceEn,
    searchPage: searchPageEn,
  };
  const flatEn = flattenStrings(source);
  const byCode = {};

  for (const { code } of LOCALE_META) {
    if (code === "en") continue;
    process.stdout.write(`Translating feature chrome: ${code}…\n`);

    let flat;
    if (existingFeatureChrome[code]) {
      const existingFlat = flattenStrings(existingFeatureChrome[code]);
      const missing = {};
      for (const [key, value] of Object.entries(flatEn)) {
        if (!(key in existingFlat)) missing[key] = value;
      }
      const translatedMissing =
        Object.keys(missing).length > 0
          ? await translateFlatStrings(missing, code)
          : {};
      flat = { ...existingFlat, ...translatedMissing };
    } else {
      flat = await translateFlatStrings(flatEn, code);
    }

    byCode[code] = unflattenStrings(flat);
  }

  const body = `/** Compliance + search page chrome merged into non-English locales at load time. */
/** Auto-generated by scripts/generate-locale-chrome.mjs — edit English source and re-run. */
export const FEATURE_CHROME_BY_CODE = ${toJsObject(byCode)};

export function getFeatureChrome(code) {
  return FEATURE_CHROME_BY_CODE[code] ?? {};
}
`;

  await fs.writeFile(path.join(PARTIALS, "_featureChrome.js"), body, "utf8");
}

async function buildCoreChrome() {
  const source = { residentAccess: coreEn.residentAccess };
  const flatEn = flattenStrings(source);
  const byCode = {};

  for (const { code } of LOCALE_META) {
    if (code === "en") continue;
    process.stdout.write(`Translating core chrome: ${code}…\n`);
    const flat = await translateFlatStrings(flatEn, code);
    byCode[code] = unflattenStrings(flat);
  }

  const body = `/** Resident / IoT access chrome merged into non-English locales at load time. */
/** Auto-generated by scripts/generate-locale-chrome.mjs */
export const CORE_CHROME_BY_CODE = ${toJsObject(byCode)};

export function getCoreChrome(code) {
  return CORE_CHROME_BY_CODE[code] ?? {};
}
`;

  await fs.writeFile(path.join(PARTIALS, "_coreChrome.js"), body, "utf8");
}

async function buildMobileExtras() {
  const source = {
    smartProperty: mobileEn.mobile.smartProperty,
    offlineCache: mobileEn.mobile.appShell.offlineCache,
  };
  const flatEn = flattenStrings(source);
  const byCode = {};

  for (const { code } of LOCALE_META) {
    if (code === "en") continue;
    process.stdout.write(`Translating mobile chrome extras: ${code}…\n`);
    const flat = await translateFlatStrings(flatEn, code);
    const nested = unflattenStrings(flat);
    byCode[code] = {
      mobile: {
        smartProperty: nested.smartProperty,
        appShell: { offlineCache: nested.offlineCache },
      },
    };
  }

  const body = `/** Mobile shell extras merged into non-English locales at load time. */
/** Auto-generated by scripts/generate-locale-chrome.mjs */
export const MOBILE_EXTRAS_BY_CODE = ${toJsObject(byCode)};

export function getMobileExtras(code) {
  return MOBILE_EXTRAS_BY_CODE[code] ?? {};
}
`;

  await fs.writeFile(path.join(PARTIALS, "_mobileExtras.js"), body, "utf8");
}

async function main() {
  console.log("Generating locale chrome translations…\n");
  await buildFeatureChrome();
  await buildCoreChrome();
  await buildMobileExtras();
  console.log("\nDone. Review git diff and run npm test.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

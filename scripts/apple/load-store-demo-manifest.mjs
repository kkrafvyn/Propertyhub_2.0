import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const MANIFEST = path.join(ROOT, "secrets", "app-review", "store-demo.json");

/** @returns {Promise<StoreDemoManifest | null>} */
export async function loadStoreDemoManifest() {
  try {
    const raw = await fs.readFile(MANIFEST, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "ENOENT") return null;
    throw e;
  }
}

export function manifestPath() {
  return MANIFEST;
}

/**
 * @typedef {object} StoreDemoManifest
 * @property {string} baseURL
 * @property {{ email: string, password: string, userId: string }} consumer
 * @property {{ email: string, password: string, slug: string, organizationId: string }} workspace
 * @property {{ shortStay: string, rental: string, sale: string }} listingIds
 * @property {{ shortStay: string, rentalInquiry: string, booking?: string }} dealCaseIds
 * @property {{ shortStayProperty: string, rentalProperty: string, checkoutShortStay: string, journeyRental: string, journeyBooking?: string, trips?: string }} routes
 */

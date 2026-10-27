import { validateMarketingDocument, type MarketingPageDocument } from "./marketing-page-document";

export const MARKETING_HOME_CACHE_KEY = "bm-marketing-home-published-v1";

export function readMarketingHomeCache(): MarketingPageDocument | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MARKETING_HOME_CACHE_KEY);
    if (!raw) return null;
    return validateMarketingDocument(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeMarketingHomeCache(document: MarketingPageDocument) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(MARKETING_HOME_CACHE_KEY, JSON.stringify(document));
  } catch {
    /* quota / private mode */
  }
}

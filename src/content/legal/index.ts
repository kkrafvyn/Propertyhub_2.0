import { COOKIE_DEFINITIONS, LEGAL_CONTACT } from "../../lib/legal-config";
import { LEGAL_POLICIES } from "./policies";
import { COMPANY_PAGES, SUPPORT_PAGES } from "./support-pages";
import {
  LEGAL_CATEGORIES,
  LEGAL_SLUG_ALIASES,
  sectionAnchor,
  type LegalDocument,
} from "./types";

export {
  LEGAL_CATEGORIES,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_LAST_UPDATED,
  LEGAL_SLUG_ALIASES,
  FOOTER_LEGAL_LINKS,
  PLATFORM_ROLE_STATEMENT,
  sectionAnchor,
  type LegalCategory,
  type LegalCategoryId,
  type LegalDocument,
  type LegalSection,
} from "./types";
export { LEGAL_POLICIES } from "./policies";
export { COMPANY_PAGES, SUPPORT_PAGES } from "./support-pages";
export { LEGAL_CONTACT };

function withCookieRegister(doc: LegalDocument): LegalDocument {
  if (doc.slug !== "cookies") return doc;
  return {
    ...doc,
    sections: [
      ...doc.sections,
      {
        heading: "Cookie register",
        bullets: COOKIE_DEFINITIONS.map(
          (cookie) =>
            `${cookie.name} (${cookie.category}) — ${cookie.purpose}. Duration: ${cookie.duration}. Provider: ${cookie.provider}.`,
        ),
      },
    ],
  };
}

export const LEGAL_DOCUMENTS: LegalDocument[] = LEGAL_POLICIES.map(withCookieRegister);

export const ALL_PAGES: LegalDocument[] = [...LEGAL_DOCUMENTS, ...SUPPORT_PAGES, ...COMPANY_PAGES];

export const REQUIRED_LEGAL_SLUGS: readonly string[] = Object.freeze(
  LEGAL_CATEGORIES.flatMap((category) => category.slugs),
);

export function resolveLegalSlug(slug: string): string {
  return LEGAL_SLUG_ALIASES[slug] ?? slug;
}

export function getLegalDocument(slug: string): LegalDocument | undefined {
  const resolved = resolveLegalSlug(slug);
  return ALL_PAGES.find((doc) => doc.slug === resolved);
}

export function getLegalPath(slug: string): string {
  const resolved = resolveLegalSlug(slug);
  if (resolved === "help") return "/help";
  if (resolved === "about") return "/about";
  if (resolved === "careers") return "/careers";
  if (resolved === "contact") return "/contact";
  if (resolved === "cancellation") return "/cancellation";
  return `/legal/${resolved}`;
}

export function getRelatedDocuments(slugs: string[] = []): LegalDocument[] {
  return slugs.map((slug) => getLegalDocument(slug)).filter(Boolean) as LegalDocument[];
}

export function getPoliciesByCategory() {
  return LEGAL_CATEGORIES.map((category) => ({
    ...category,
    documents: category.slugs
      .map((slug) => getLegalDocument(slug))
      .filter(Boolean) as LegalDocument[],
  }));
}

export function getAdjacentPolicies(slug: string) {
  const ordered = REQUIRED_LEGAL_SLUGS as string[];
  const resolved = resolveLegalSlug(slug);
  const index = ordered.indexOf(resolved);
  if (index < 0) return { previous: undefined, next: undefined };
  return {
    previous: index > 0 ? getLegalDocument(ordered[index - 1]) : undefined,
    next: index < ordered.length - 1 ? getLegalDocument(ordered[index + 1]) : undefined,
  };
}

export function getSiteOrigin() {
  const envUrl =
    (typeof import.meta !== "undefined" &&
      (import.meta.env?.VITE_PUBLIC_APP_URL || import.meta.env?.VITE_SITE_URL)) ||
    "";
  const origin =
    envUrl || (typeof window !== "undefined" ? window.location.origin : "https://baytmiftah.com");
  return String(origin).replace(/\/$/, "");
}

export function getCanonicalUrl(path: string) {
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteOrigin()}${normalised}`;
}

export function getSectionId(heading: string) {
  return sectionAnchor(heading);
}

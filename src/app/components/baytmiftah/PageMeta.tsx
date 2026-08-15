import { useEffect } from "react";

function getCanonicalHref(canonicalPath?: string) {
  if (canonicalPath) {
    const origin = (
      import.meta.env.VITE_PUBLIC_APP_URL ||
      import.meta.env.VITE_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "https://baytmiftah.com")
    ).replace(/\/$/, "");
    const path = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
    return `${origin}${path}`;
  }
  return typeof window !== "undefined" ? window.location.href.split("?")[0] : undefined;
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  const isLink = selector.startsWith('link');
  if (!element) {
    element = document.createElement(isLink ? "link" : "meta") as HTMLMetaElement | HTMLLinkElement;
    document.head.appendChild(element);
  }
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  return element;
}

export function PageMeta({
  title,
  description,
  canonicalPath,
  ogTitle,
  ogDescription,
}: {
  title: string;
  description?: string;
  canonicalPath?: string;
  ogTitle?: string;
  ogDescription?: string;
}) {
  useEffect(() => {
    const fullTitle = title.includes("BaytMiftah") ? title : `${title} · BaytMiftah`;
    document.title = fullTitle;

    if (description) {
      upsertMeta('meta[name="description"]', { name: "description", content: description });
    }

    const canonical = getCanonicalHref(canonicalPath);

    if (canonical) {
      upsertMeta('link[rel="canonical"]', { rel: "canonical", href: canonical });
      upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    }

    upsertMeta('meta[property="og:title"]', {
      property: "og:title",
      content: ogTitle || fullTitle,
    });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "BaytMiftah" });

    const ogDesc = ogDescription || description;
    if (ogDesc) {
      upsertMeta('meta[property="og:description"]', {
        property: "og:description",
        content: ogDesc,
      });
    }
  }, [title, description, canonicalPath, ogTitle, ogDescription]);

  return null;
}

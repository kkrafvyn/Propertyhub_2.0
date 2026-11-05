import { useEffect } from "react";
import { getAppOrigin, getMarketingOrigin } from "../../../lib/marketing-urls";
import { isMarketingPublicPath, isMarketingSite } from "../../../lib/site-mode";

function pageMetaOrigin(): string {
  if (typeof window !== "undefined") {
    if (isMarketingSite() || isMarketingPublicPath(window.location.pathname)) {
      return getMarketingOrigin();
    }
    return getAppOrigin();
  }

  const mode = import.meta.env.VITE_SITE_MODE?.trim().toLowerCase();
  if (mode === "marketing") {
    return getMarketingOrigin();
  }
  if (mode === "app") {
    return getAppOrigin();
  }

  return getMarketingOrigin();
}

function getCanonicalHref(canonicalPath?: string) {
  if (canonicalPath) {
    const origin = pageMetaOrigin();
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

function absoluteOgImage(ogImage: string) {
  if (ogImage.startsWith("http://") || ogImage.startsWith("https://")) {
    return ogImage;
  }
  const origin = pageMetaOrigin();
  const path = ogImage.startsWith("/") ? ogImage : `/${ogImage}`;
  return `${origin}${path}`;
}

export function PageMeta({
  title,
  description,
  canonicalPath,
  ogTitle,
  ogDescription,
  ogImage,
  ogImageWidth = 1280,
  ogImageHeight = 800,
  themeColor,
}: {
  title: string;
  description?: string;
  canonicalPath?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  themeColor?: string;
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

    if (ogImage) {
      const imageUrl = absoluteOgImage(ogImage);
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: imageUrl });
      upsertMeta('meta[property="og:image:width"]', { property: "og:image:width", content: String(ogImageWidth) });
      upsertMeta('meta[property="og:image:height"]', { property: "og:image:height", content: String(ogImageHeight) });
      upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
      upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: ogTitle || fullTitle });
      upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: imageUrl });
      const twitterDesc = ogDescription || description;
      if (twitterDesc) {
        upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: twitterDesc });
      }
    }

    if (themeColor) {
      upsertMeta('meta[name="theme-color"]', { name: "theme-color", content: themeColor });
    }
  }, [title, description, canonicalPath, ogTitle, ogDescription, ogImage, ogImageWidth, ogImageHeight, themeColor]);

  return null;
}

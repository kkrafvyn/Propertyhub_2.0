import { useMemo } from "react";
import type { MarketingPageDocument } from "../../../../lib/marketing-page-document";
import { getMarketingOrigin } from "../../../../lib/marketing-urls";

export function MarketingStructuredData({
  document,
  canonicalPath = "/",
}: {
  document: MarketingPageDocument;
  canonicalPath?: string;
}) {
  const json = useMemo(() => {
    const origin = getMarketingOrigin();
    const url = `${origin}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${origin}/#organization`,
          name: "BaytMiftah",
          url: origin,
        },
        {
          "@type": "WebSite",
          "@id": `${origin}/#website`,
          url,
          name: document.seo.title,
          description: document.seo.description,
          publisher: { "@id": `${origin}/#organization` },
        },
        {
          "@type": "FAQPage",
          "@id": `${url}#faq`,
          mainEntity: document.faq.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        },
      ],
    };
  }, [canonicalPath, document.faq, document.seo.description, document.seo.title]);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

import { useEffect, useState } from "react";
import { DEFAULT_MARKETING_DOCUMENT, type MarketingPageDocument } from "../../../lib/marketing-page-document";
import { readMarketingHomeCache, writeMarketingHomeCache } from "../../../lib/marketing-home-cache";
import { marketingContentService } from "../../../lib/marketing-content.service";
import { MarketingStructuredData } from "../../components/marketing/editorial/MarketingStructuredData";
import { MarketingContentProvider } from "../../components/marketing/editorial/MarketingContentContext";
import { EditorialRolesSection, EditorialResidentSection, EditorialIntegrationsSection } from "../../components/marketing/editorial/EditorialSupportingSections";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { EditorialHero } from "../../components/marketing/editorial/EditorialHero";
import { EditorialProductTour } from "../../components/marketing/editorial/EditorialProductTour";
import "../../components/marketing/editorial/marketing-showcase.css";
import {
  EditorialAiSection,
  EditorialFaqSection,
  EditorialFinalCtaSection,
  EditorialGettingStartedSection,
  EditorialOutcomeSection,
  EditorialSalesSection,
  EditorialTrustSection,
  EditorialWorkflowSection,
} from "../../components/marketing/editorial/EditorialHomeSections";
import { EditorialAppPreviewSection } from "../../components/marketing/editorial/EditorialConversionSections";
import { EditorialPlatformSection } from "../../components/marketing/editorial/EditorialPlatformSection";

function heroOgImage(document: MarketingPageDocument) {
  const first = document.hero.images[0] ?? "residences";
  return `/marketing/hero/${first}-2200.webp`;
}

export function MarketingEditorialHome({ document: suppliedDocument, preview = false }: { document?: MarketingPageDocument; preview?: boolean } = {}) {
  const [published, setPublished] = useState<MarketingPageDocument>(() => {
    if (suppliedDocument) return suppliedDocument;
    if (preview) return DEFAULT_MARKETING_DOCUMENT;
    return readMarketingHomeCache() ?? DEFAULT_MARKETING_DOCUMENT;
  });

  useEffect(() => {
    if (suppliedDocument || preview) return;
    let active = true;
    void marketingContentService
      .loadPublished()
      .then((value) => {
        if (active) {
          writeMarketingHomeCache(value);
          setPublished(value);
        }
      })
      .catch(() => {
        // Keep the cached or default page available if the refresh fails.
      });
    return () => {
      active = false;
    };
  }, [suppliedDocument, preview]);

  const content = suppliedDocument ?? published;

  return (
    <MarketingContentProvider document={content}>
      {!preview && (
        <PageMeta
          title={content.seo.title}
          description={content.seo.description}
          canonicalPath="/"
          ogTitle={content.seo.title}
          ogDescription={content.seo.description}
          ogImage={heroOgImage(content)}
          ogImageWidth={2200}
          ogImageHeight={1375}
          themeColor="#0d1913"
        />
      )}
      {!preview && <MarketingStructuredData document={content} />}
      <div id="mk-main-content" className="mk-ed-page mk-ed-page--showcase" tabIndex={-1}>
        <EditorialHero />
        <EditorialOutcomeSection />
        <EditorialPlatformSection />
        <EditorialProductTour />
        <EditorialWorkflowSection />
        <EditorialRolesSection />
        <EditorialResidentSection />
        <EditorialAppPreviewSection />
        <EditorialAiSection />
        <EditorialGettingStartedSection />
        <EditorialIntegrationsSection />
        <EditorialTrustSection />
        <EditorialSalesSection />
        {content.sections.map((section, index) => (
          <section key={index} className="mk-ed-section mk-ed-section--surface">
            <div className="mk-ed-container">
              <h2 className="mk-ed-heading">{section.title}</h2>
              <p className="mk-ed-lead" style={{ whiteSpace: "pre-line" }}>
                {section.body}
              </p>
            </div>
          </section>
        ))}
        <EditorialFaqSection />
        <EditorialFinalCtaSection />
      </div>
    </MarketingContentProvider>
  );
}

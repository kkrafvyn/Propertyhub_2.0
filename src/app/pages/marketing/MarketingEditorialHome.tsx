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
import { MarketingBackgroundCarousel } from "../../components/marketing/MarketingBackgroundCarousel";
import {
  EditorialAiSection,
  EditorialFaqSection,
  EditorialFinalCtaSection,
  EditorialGettingStartedSection,
  EditorialOutcomeSection,
  EditorialPortfolioSection,
  EditorialSalesSection,
  EditorialTrustSection,
  EditorialWorkflowSection,
} from "../../components/marketing/editorial/EditorialHomeSections";

function heroOgImage(document: MarketingPageDocument) {
  const first = document.hero.images[0] ?? "residences";
  return `/marketing/hero/${first}-2200.webp`;
}

function MarketingHeroSkeleton() {
  return (
    <MarketingBackgroundCarousel imageIds={DEFAULT_MARKETING_DOCUMENT.hero.images}>
      <div className="mk-ed-container">
        <div className="mk-ed-hero__copy mk-ed-hero__copy--loading" aria-busy="true" aria-label="Loading homepage">
          <div className="mk-ed-hero-skeleton__line mk-ed-hero-skeleton__line--kicker" />
          <div className="mk-ed-hero-skeleton__line mk-ed-hero-skeleton__line--title" />
          <div className="mk-ed-hero-skeleton__line mk-ed-hero-skeleton__line--title-short" />
          <div className="mk-ed-hero-skeleton__line mk-ed-hero-skeleton__line--lead" />
          <div className="mk-ed-hero-skeleton__actions">
            <div className="mk-ed-hero-skeleton__pill" />
            <div className="mk-ed-hero-skeleton__pill mk-ed-hero-skeleton__pill--ghost" />
          </div>
        </div>
      </div>
    </MarketingBackgroundCarousel>
  );
}

/** Public marketing homepage — editorial layout (replaces scroll-cinematic composition). */
export function MarketingEditorialHome({ document: suppliedDocument, preview = false }: { document?: MarketingPageDocument; preview?: boolean } = {}) {
  const [published, setPublished] = useState<MarketingPageDocument | null>(() => {
    if (suppliedDocument) return suppliedDocument;
    if (preview) return DEFAULT_MARKETING_DOCUMENT;
    return readMarketingHomeCache();
  });

  useEffect(() => {
    if (suppliedDocument || preview) return;
    let active = true;
    const fallbackTimer = window.setTimeout(() => {
      if (active) {
        setPublished((current) => current ?? DEFAULT_MARKETING_DOCUMENT);
      }
    }, 4000);

    void marketingContentService
      .loadPublished()
      .then((value) => {
        if (active) {
          writeMarketingHomeCache(value);
          setPublished(value);
        }
      })
      .catch(() => {
        if (active) setPublished(DEFAULT_MARKETING_DOCUMENT);
      })
      .finally(() => {
        window.clearTimeout(fallbackTimer);
      });
    return () => {
      active = false;
      window.clearTimeout(fallbackTimer);
    };
  }, [suppliedDocument, preview]);

  const loadingPublic = !suppliedDocument && !preview && published === null;
  const content = published ?? DEFAULT_MARKETING_DOCUMENT;

  if (loadingPublic) {
    return (
      <>
        <PageMeta
          title={DEFAULT_MARKETING_DOCUMENT.seo.title}
          description={DEFAULT_MARKETING_DOCUMENT.seo.description}
          canonicalPath="/"
          ogTitle={DEFAULT_MARKETING_DOCUMENT.seo.title}
          ogDescription={DEFAULT_MARKETING_DOCUMENT.seo.description}
          ogImage={heroOgImage(DEFAULT_MARKETING_DOCUMENT)}
          ogImageWidth={2200}
          ogImageHeight={1375}
          themeColor="#0d1913"
        />
        <MarketingStructuredData document={DEFAULT_MARKETING_DOCUMENT} />
        <div id="mk-main-content" className="mk-ed-page mk-ed-page--carousel" tabIndex={-1}>
          <MarketingHeroSkeleton />
        </div>
      </>
    );
  }

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
      <div id="mk-main-content" className="mk-ed-page mk-ed-page--carousel" tabIndex={-1}>
        <EditorialHero />
        <EditorialOutcomeSection />
        <EditorialProductTour />
        <EditorialWorkflowSection />
        <EditorialRolesSection />
        <EditorialResidentSection />
        <EditorialPortfolioSection />
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

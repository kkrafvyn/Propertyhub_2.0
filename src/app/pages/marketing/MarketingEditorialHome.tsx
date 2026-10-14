import { useEffect, useState } from "react";
import { DEFAULT_MARKETING_DOCUMENT, type MarketingPageDocument } from "../../../lib/marketing-page-document";
import { marketingContentService } from "../../../lib/marketing-content.service";
import { MarketingContentProvider } from "../../components/marketing/editorial/MarketingContentContext";
import { EditorialRolesSection, EditorialResidentSection, EditorialIntegrationsSection } from "../../components/marketing/editorial/EditorialSupportingSections";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { EditorialHero } from "../../components/marketing/editorial/EditorialHero";
import { EditorialProductTour } from "../../components/marketing/editorial/EditorialProductTour";
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
/** Public marketing homepage — editorial layout (replaces scroll-cinematic composition). */
export function MarketingEditorialHome({ document: suppliedDocument, preview = false }: { document?: MarketingPageDocument; preview?: boolean } = {}) {
  const [published, setPublished] = useState(DEFAULT_MARKETING_DOCUMENT);
  useEffect(() => {
    if (suppliedDocument) return;
    let active = true;
    void marketingContentService.loadPublished().then(value => { if (active) setPublished(value); }).catch(() => {});
    return () => { active = false; };
  }, [suppliedDocument]);
  const content = suppliedDocument ?? published;
  return (
    <MarketingContentProvider document={content}>
      {!preview && <PageMeta
        title={content.seo.title}
        description={content.seo.description}
        canonicalPath="/"
        ogTitle={content.seo.title}
        ogDescription={content.seo.description}
      />}
      <div id="mk-main-content" className="mk-ed-page" tabIndex={-1}>
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
        {content.sections.map((section, index) => <section key={index} className="mk-ed-section mk-ed-section--surface"><div className="mk-ed-container"><h2 className="mk-ed-heading">{section.title}</h2><p className="mk-ed-lead" style={{ whiteSpace: "pre-line" }}>{section.body}</p></div></section>)}
        <EditorialFaqSection />
        <EditorialFinalCtaSection />
      </div>
    </MarketingContentProvider>
  );
}

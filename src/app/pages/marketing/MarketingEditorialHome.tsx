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
export function MarketingEditorialHome() {
  return (
    <>
      <PageMeta
        title="BaytMiftah — Property operations in one workspace"
        description="Run listings, leasing, collections, maintenance, documents, and portfolio reporting from one property operations app."
        canonicalPath="/"
        ogTitle="BaytMiftah — Property operations platform"
        ogDescription="Explore one connected app for property operations, workflow tracking, reporting, and control."
      />
      <div id="mk-main-content" className="mk-ed-page" tabIndex={-1}>
        <EditorialHero />
        <EditorialOutcomeSection />
        <EditorialProductTour />
        <EditorialWorkflowSection />
        <EditorialPortfolioSection />
        <EditorialAiSection />
        <EditorialGettingStartedSection />
        <EditorialTrustSection />
        <EditorialSalesSection />
        <EditorialFaqSection />
        <EditorialFinalCtaSection />
      </div>
    </>
  );
}

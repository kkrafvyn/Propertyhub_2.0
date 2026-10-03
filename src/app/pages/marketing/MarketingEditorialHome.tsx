import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { EditorialHero } from "../../components/marketing/editorial/EditorialHero";
import { EditorialProductTour } from "../../components/marketing/editorial/EditorialProductTour";
import {
  EditorialAiSection,
  EditorialFaqSection,
  EditorialFinalCtaSection,
  EditorialGettingStartedSection,
  EditorialIntegrationsSection,
  EditorialPortfolioSection,
  EditorialResidentSection,
  EditorialRoleSection,
  EditorialSalesSection,
  EditorialTrustSection,
  EditorialWorkflowSection,
} from "../../components/marketing/editorial/EditorialHomeSections";
/** Public marketing homepage — editorial layout (replaces scroll-cinematic composition). */
export function MarketingEditorialHome() {
  return (
    <>
      <PageMeta
        title="BaytMiftah — Every property, one clear picture"
        description="Property operations software for listings, leasing, payments, maintenance, and resident support."
        canonicalPath="/"
        ogTitle="BaytMiftah — Property operations platform"
        ogDescription="Architectural editorial homepage with interactive product previews and verified integrations."
      />
      <div id="mk-main-content" className="mk-ed-page" tabIndex={-1}>
        <EditorialHero />
        <EditorialProductTour />
        <EditorialRoleSection />
        <EditorialWorkflowSection />
        <EditorialPortfolioSection />
        <EditorialResidentSection />
        <EditorialAiSection />
        <EditorialGettingStartedSection />
        <EditorialIntegrationsSection />
        <EditorialTrustSection />
        <EditorialSalesSection />
        {/* Customer stories omitted — no approved testimonials in repository */}
        <EditorialFaqSection />
        <EditorialFinalCtaSection />
      </div>
    </>
  );
}

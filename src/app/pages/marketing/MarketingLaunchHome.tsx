import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { LaunchHero } from "../../components/marketing/launch/LaunchHero";
import {
  LaunchAi,
  LaunchFinance,
  LaunchFinalCta,
  LaunchLeasing,
  LaunchMaintenance,
  LaunchOrganizations,
  LaunchPortfolio,
  LaunchProductStory,
  LaunchResident,
} from "../../components/marketing/launch/LaunchSections";

/** Product-led public homepage — restrained motion, real UI compositions. */
export function MarketingLaunchHome() {
  return (
    <>
      <PageMeta
        title="BaytMiftah — Real estate, operated as one system"
        description="Property discovery, leasing, finance, maintenance and portfolio operations in one connected platform."
        canonicalPath="/"
        ogTitle="BaytMiftah"
        ogDescription="A serious operating platform for real estate teams and residents."
      />
      <div id="mk-main-content" className="mk-l-page" tabIndex={-1}>
        <LaunchHero />
        <LaunchProductStory />
        <LaunchPortfolio />
        <LaunchFinance />
        <LaunchLeasing />
        <LaunchMaintenance />
        <LaunchResident />
        <LaunchAi />
        <LaunchOrganizations />
        <LaunchFinalCta />
      </div>
    </>
  );
}

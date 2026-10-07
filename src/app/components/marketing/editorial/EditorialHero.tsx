import { ArrowRight } from "lucide-react";
import { appPath } from "../../../../lib/marketing-urls";
import { MarketingBackgroundCarousel } from "../MarketingBackgroundCarousel";
import { trackMarketingEvent } from "./marketing-editorial-analytics";

export function EditorialHero() {
  return (
    <MarketingBackgroundCarousel>
      <div className="mk-ed-container">
        <div className="mk-ed-hero__copy">
          <p className="mk-ed-kicker mk-ed-kicker--dark">One app for property operations</p>
          <h1 id="marketing-hero-heading" className="mk-ed-hero__title">Every property.<br />One clear picture.</h1>
          <p className="mk-ed-hero__lead">Bring listings, leasing, payments and maintenance together—so your team can run the portfolio with clarity.</p>
          <div className="mk-ed-inline-actions mk-ed-hero__actions">
            <a href={appPath("/signup")} className="mk-ed-btn mk-ed-btn--light" onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "hero_primary" })}>Get Started <ArrowRight size={16} aria-hidden="true" /></a>
            <a href="#product-tour" className="mk-ed-btn mk-ed-btn--ghost">Explore the Platform</a>
          </div>
        </div>
      </div>
    </MarketingBackgroundCarousel>
  );
}

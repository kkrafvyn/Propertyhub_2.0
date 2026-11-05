import { useMarketingContent } from "./MarketingContentContext";
import { ArrowRight } from "lucide-react";
import { appPath } from "../../../../lib/marketing-urls";
import { MarketingBackgroundCarousel } from "../MarketingBackgroundCarousel";
import { trackMarketingEvent } from "./marketing-editorial-analytics";

export function EditorialHero() {
  const { hero, extras } = useMarketingContent();
  const highlights = extras.heroHighlights;

  return (
    <MarketingBackgroundCarousel key={hero.images.join(",")} imageIds={hero.images}>
      <div className="mk-ed-container">
        <div className="mk-ed-hero__copy">
          <p className="mk-ed-kicker mk-ed-kicker--dark">{hero.eyebrow}</p>
          <h1 id="marketing-hero-heading" className="mk-ed-hero__title" aria-label={`${hero.title} ${hero.secondLine}`}>
            {hero.title}
            <br />
            {hero.secondLine}
          </h1>
          <p className="mk-ed-hero__lead">{hero.description}</p>
          <div className="mk-ed-inline-actions mk-ed-hero__actions">
            <a href={appPath("/signup")} className="mk-ed-btn mk-ed-btn--light" onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "hero_primary" })}>Get Started <ArrowRight size={16} aria-hidden="true" /></a>
            <a href={appPath("/search")} className="mk-ed-btn mk-ed-btn--ghost" onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "hero_explore_properties" })}>Explore Properties</a>
            <a href="#product-tour" className="mk-ed-btn mk-ed-btn--ghost" onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "hero_product_tour" })}>Product tour</a>
          </div>
          {highlights.length > 0 ? (
            <ul className="mk-ed-hero__highlights" aria-label="Product highlights">
              {highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </MarketingBackgroundCarousel>
  );
}

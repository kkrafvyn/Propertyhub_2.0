import { useMarketingContent } from "./MarketingContentContext";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Building2, Check, MapPin, Search } from "lucide-react";
import { appPath } from "../../../../lib/marketing-urls";
import { MarketingBackgroundCarousel } from "../MarketingBackgroundCarousel";
import { trackMarketingEvent } from "./marketing-editorial-analytics";

export function EditorialHero() {
  const { hero, extras } = useMarketingContent();
  const highlights = extras.heroHighlights;
  const [view, setView] = useState<"explore" | "workspace">("explore");

  return (
    <MarketingBackgroundCarousel key={hero.images.join(",")} imageIds={hero.images}>
      <div className="mk-ed-container mk-ed-hero-layout">
        <div className="mk-ed-hero__copy">
          <p className="mk-ed-kicker mk-ed-kicker--dark">{hero.eyebrow}</p>
          <h1 id="marketing-hero-heading" className="mk-ed-hero__title" aria-label={`${hero.title} ${hero.secondLine}`}>
            {hero.title}
            <br />
            <em>{hero.secondLine}</em>
          </h1>
          <p className="mk-ed-hero__lead">{hero.description}</p>
          <div className="mk-ed-inline-actions mk-ed-hero__actions">
            <a href={appPath("/search")} className="mk-ed-btn mk-ed-btn--light" onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "hero_explore_properties" })}>Explore Properties <ArrowUpRight size={17} aria-hidden="true" /></a>
            <a href={appPath("/signup")} className="mk-ed-btn mk-ed-btn--ghost" onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "hero_primary" })}>Create workspace <ArrowRight size={16} aria-hidden="true" /></a>
          </div>
          <a href="#product-tour" className="mk-ed-hero__tour-link" onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "hero_product_tour" })}>Take a look inside <ArrowRight size={15} aria-hidden="true" /></a>
          {highlights.length > 0 ? (
            <ul className="mk-ed-hero__highlights" aria-label="Product highlights">
              {highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="mk-ed-hero-showcase">
          <p className="mk-ed-hero-showcase__caption">A place to live.<br /><em>Space to grow.</em></p>
          <div className="mk-hero-product">
            <div className="mk-hero-product__switch" role="group" aria-label="Product preview">
              <button type="button" aria-pressed={view === "explore"} onClick={() => setView("explore")}>Explore</button>
              <button type="button" aria-pressed={view === "workspace"} onClick={() => setView("workspace")}>Workspace</button>
            </div>
            <div className="mk-hero-product__body" aria-live="polite">
              {view === "explore" ? <>
                <span className="mk-hero-product__eyebrow"><MapPin size={13} aria-hidden="true" /> Your next move</span>
                <h2>Somewhere that feels like you.</h2>
                <a href={appPath("/search")} className="mk-hero-product__search" onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "hero_preview_explore" })}><Search size={17} aria-hidden="true" /> Find a home, land, or a stay <ArrowUpRight size={17} aria-hidden="true" /></a>
              </> : <>
                <span className="mk-hero-product__eyebrow"><Building2 size={13} aria-hidden="true" /> Your portfolio, together</span>
                <h2>A clearer view of every property.</h2>
                <ul className="mk-hero-product__tasks"><li><Check size={14} aria-hidden="true" /> Listings & enquiries</li><li><Check size={14} aria-hidden="true" /> Leases & collections</li><li><Check size={14} aria-hidden="true" /> Maintenance & team tasks</li></ul>
                <a href="#product-tour" className="mk-hero-product__tour">Try the workspace preview <ArrowRight size={15} aria-hidden="true" /></a>
              </>}
            </div>
            <p className="mk-hero-product__note">Product preview</p>
          </div>
        </div>
      </div>
    </MarketingBackgroundCarousel>
  );
}

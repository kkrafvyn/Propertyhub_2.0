import { useEffect } from "react";
import { useMarketingContent } from "./MarketingContentContext";
import { ArrowRight } from "lucide-react";
import { appPath } from "../../../../lib/marketing-urls";
import { MarketingBackgroundCarousel } from "../MarketingBackgroundCarousel";
import { trackMarketingEvent } from "./marketing-editorial-analytics";

export function EditorialHero() {
  const { hero } = useMarketingContent();

  useEffect(() => {
    const first = hero.images[0];
    if (!first) return undefined;
    const linkId = `mk-hero-preload-${first}`;
    if (document.getElementById(linkId)) return undefined;

    const mobile = document.createElement("link");
    mobile.id = `${linkId}-mobile`;
    mobile.rel = "preload";
    mobile.as = "image";
    mobile.href = `/marketing/hero/${first}-mobile.webp`;
    mobile.media = "(max-width: 639px)";

    const desktop = document.createElement("link");
    desktop.id = linkId;
    desktop.rel = "preload";
    desktop.as = "image";
    desktop.href = `/marketing/hero/${first}-1280.webp`;
    desktop.setAttribute(
      "imagesrcset",
      `/marketing/hero/${first}-1280.webp 1280w, /marketing/hero/${first}-2200.webp 2200w`,
    );
    desktop.setAttribute("imagesizes", "100vw");
    desktop.media = "(min-width: 640px)";

    document.head.append(mobile, desktop);
    return () => {
      mobile.remove();
      desktop.remove();
    };
  }, [hero.images]);

  return (
    <MarketingBackgroundCarousel key={hero.images.join(",")} imageIds={hero.images}>
      <div className="mk-ed-container">
        <div className="mk-ed-hero__copy">
          <p className="mk-ed-kicker mk-ed-kicker--dark">{hero.eyebrow}</p>
          <h1 id="marketing-hero-heading" className="mk-ed-hero__title">{hero.title}<br />{hero.secondLine}</h1>
          <p className="mk-ed-hero__lead">{hero.description}</p>
          <div className="mk-ed-inline-actions mk-ed-hero__actions">
            <a href={appPath("/signup")} className="mk-ed-btn mk-ed-btn--light" onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "hero_primary" })}>Get Started <ArrowRight size={16} aria-hidden="true" /></a>
            <a href="#product-tour" className="mk-ed-btn mk-ed-btn--ghost">Explore the Platform</a>
          </div>
        </div>
      </div>
    </MarketingBackgroundCarousel>
  );
}

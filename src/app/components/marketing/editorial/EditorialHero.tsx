import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { appPath } from "../../../../lib/marketing-urls";
import { trackMarketingEvent } from "./marketing-editorial-analytics";

const EditorialHeroScene = lazy(() =>
  import("./EditorialHeroScene").then((module) => ({ default: module.EditorialHeroScene })),
);

function HeroStaticArt() {
  return (
    <div className="mk-ed-hero-art" aria-hidden="true">
      <div className="mk-ed-hero-art__tower">
        {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
      </div>
    </div>
  );
}

export function EditorialHero() {
  const [webglOk, setWebglOk] = useState(true);
  const [enhance3d, setEnhance3d] = useState(false);

  useEffect(() => {
    const canEnhance = window.matchMedia("(min-width: 760px) and (prefers-reduced-motion: no-preference)").matches;
    if (!canEnhance) return undefined;
    const timer = window.setTimeout(() => setEnhance3d(true), 450);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="mk-ed-hero" aria-labelledby="marketing-hero-heading">
      <div className="mk-ed-container mk-ed-hero__grid">
        <div className="mk-ed-hero__copy">
          <p className="mk-ed-kicker">One app for property operations</p>
          <h1 id="marketing-hero-heading" className="mk-ed-hero__title">
            Run every property workflow from one clear workspace.
          </h1>
          <p className="mk-ed-hero__lead">
            Bring listings, leasing, collections, maintenance, documents, and portfolio reporting into one connected app.
          </p>
          <div className="mk-ed-inline-actions mk-ed-hero__actions">
            <a href="/contact" className="mk-ed-btn mk-ed-btn--primary" onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "hero_primary" })}>
              Book a demo <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href={appPath("/signup")} className="mk-ed-btn mk-ed-btn--secondary">Start free</a>
          </div>
          <a href="#product-tour" className="mk-ed-hero__tour-link">
            Explore the product <ArrowRight size={14} aria-hidden="true" />
          </a>
        </div>

        <div className="mk-ed-hero__visual" role="img" aria-label="3D architectural illustration inspired by stacked property spaces">
          <HeroStaticArt />
          {webglOk && enhance3d ? (
            <Suspense fallback={null}>
              <EditorialHeroScene onFailure={() => setWebglOk(false)} />
            </Suspense>
          ) : null}
          <div className="mk-ed-hero__visual-label" aria-hidden="true">
            <span>One connected structure</span>
            <strong>Every workflow in its place</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

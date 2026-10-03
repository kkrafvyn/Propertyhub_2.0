import { lazy, Suspense, useState } from "react";
import { ArrowRight } from "lucide-react";
import { appPath } from "../../../../lib/marketing-urls";
import { trackMarketingEvent } from "./marketing-editorial-analytics";

const EditorialHeroScene = lazy(() =>
  import("./EditorialHeroScene").then((m) => ({ default: m.EditorialHeroScene })),
);

function HeroStaticArt() {
  return (
    <div className="mk-ed-hero-art" aria-hidden="true">
      <div className="mk-ed-hero-art__facade">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function EditorialHero() {
  const [webglOk, setWebglOk] = useState(true);

  return (
    <section className="mk-ed-hero" aria-labelledby="marketing-hero-heading">
      <div className="mk-ed-container mk-ed-hero__grid">
        <div className="mk-ed-hero__copy">
          <p className="mk-ed-kicker">BaytMiftah</p>
          <h1 id="marketing-hero-heading" className="mk-ed-hero__title">
            Every property.
            <br />
            One clear picture.
          </h1>
          <p className="mk-ed-hero__lead">
            Bring listings, leasing, payments, and maintenance together — so your team can run the portfolio with clarity.
          </p>
          <div className="mk-ed-inline-actions mk-ed-hero__actions">
            <a
              href={appPath("/signup")}
              className="mk-ed-btn mk-ed-btn--primary"
              onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "hero_primary" })}
            >
              Create workspace <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="#product-tour" className="mk-ed-btn mk-ed-btn--secondary">
              View product tour
            </a>
          </div>
        </div>

        <div className="mk-ed-hero__visual">
          <HeroStaticArt />
          {webglOk ? (
            <Suspense fallback={null}>
              <EditorialHeroScene onFailure={() => setWebglOk(false)} />
            </Suspense>
          ) : null}
          <aside className="mk-ed-hero-preview" aria-label="Sample workspace preview">
            <p className="mk-ed-note">Illustrative preview</p>
            <strong>Listings · Unit 204</strong>
            <span>Published · Lease active</span>
            <span>1 open maintenance ticket</span>
          </aside>
        </div>
      </div>
    </section>
  );
}

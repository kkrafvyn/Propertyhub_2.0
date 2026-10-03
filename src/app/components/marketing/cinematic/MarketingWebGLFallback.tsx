import { ArrowRight } from "lucide-react";
import { appPath } from "../../../../lib/marketing-urls";
import { CINEMATIC_CHAPTERS } from "./cinematic-chapters";
import { CinematicProductPreviews } from "./CinematicProductPreviews";

/** Static narrative when WebGL is unavailable or reduced-motion is preferred. */
export function MarketingWebGLFallback() {
  return (
    <div className="mk-cinema-fallback" id="mk-main-content" tabIndex={-1}>
      <div className="mk-cinema-static-hero-art" aria-hidden="true">
        <div className="mk-cinema-static-hero-art__building" />
      </div>

      {CINEMATIC_CHAPTERS.map((ch) => {
        const HeadingTag = ch.headingLevel === "h1" ? "h1" : "h2";
        return (
          <section
            key={ch.id}
            id={`chapter-${ch.id}`}
            className="mk-cinema-chapter mk-cinema-chapter--static"
            aria-labelledby={`cinema-heading-${ch.id}`}
          >
            <div className={`mk-cinema-chapter__inner ${ch.alignClass ?? ""}`}>
              {ch.eyebrow ? <p className="mk-cinema-eyebrow">{ch.eyebrow}</p> : null}
              <HeadingTag id={`cinema-heading-${ch.id}`} className="mk-cinema-title">
                {ch.title}
              </HeadingTag>
              {ch.lead ? <p className="mk-cinema-lead">{ch.lead}</p> : null}
              {ch.labels ? (
                <div className="mk-cinema-labels">
                  {ch.labels.map((l) => (
                    <span key={l} className="mk-cinema-label">
                      {l}
                    </span>
                  ))}
                </div>
              ) : null}
              {ch.productPreviews ? (
                <CinematicProductPreviews kinds={ch.productPreviews} layout="grid" />
              ) : null}
              {ch.mobileCards ? (
                <div className="mk-cinema-mobile-cards">
                  {ch.mobileCards.map((card) => (
                    <div key={card.title} className="mk-cinema-mobile-card">
                      <strong>{card.title}</strong>
                      <span>{card.sub}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {ch.aiPrompts ? (
                <div className="mk-cinema-ai-prompts">
                  {ch.aiPrompts.map((p) => (
                    <span key={p} className="mk-cinema-ai-prompt">
                      {p}
                    </span>
                  ))}
                </div>
              ) : null}
              {(ch.primaryCta || ch.secondaryCta) && (
                <div className="mk-cinema-actions">
                  {ch.primaryCta ? (
                    <a
                      href={
                        ch.primaryCta.href.startsWith("#")
                          ? ch.primaryCta.href
                          : appPath(ch.primaryCta.href.startsWith("/") ? ch.primaryCta.href : `/${ch.primaryCta.href}`)
                      }
                      className="mk-btn mk-btn-primary"
                    >
                      {ch.primaryCta.label} <ArrowRight size={16} aria-hidden="true" />
                    </a>
                  ) : null}
                  {ch.secondaryCta ? (
                    <a
                      href={ch.secondaryCta.href.startsWith("#") ? ch.secondaryCta.href : appPath(ch.secondaryCta.href)}
                      className="mk-btn mk-btn-secondary"
                    >
                      {ch.secondaryCta.label}
                    </a>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

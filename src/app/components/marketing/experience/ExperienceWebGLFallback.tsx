import { ArrowRight } from "lucide-react";
import { appPath } from "../../../../lib/marketing-urls";
import { CinematicProductPreviews } from "../cinematic/CinematicProductPreviews";
import { EXPERIENCE_CHAPTERS } from "./experience-chapters";
import { EXPERIENCE_CHAPTER_UI } from "./experience-chapter-ui";

export function ExperienceWebGLFallback() {
  return (
    <div className="mk-cinema-fallback" id="mk-main-content" tabIndex={-1}>
      <div className="mk-cinema-static-hero-art" aria-hidden="true">
        <div className="mk-cinema-static-hero-art__building" />
      </div>

      {EXPERIENCE_CHAPTERS.map((ch) => {
        const ui = EXPERIENCE_CHAPTER_UI[ch.id] ?? {};
        const HeadingTag = ui.headingLevel === "h1" ? "h1" : "h2";
        return (
          <section
            key={ch.id}
            id={`chapter-${ch.id}`}
            className="mk-cinema-chapter mk-cinema-chapter--static"
            aria-labelledby={`xp-heading-${ch.id}`}
          >
            <div className={`mk-cinema-chapter__inner ${ui.alignClass ?? ""}`}>
              {ch.eyebrow ? <p className="mk-cinema-eyebrow">{ch.eyebrow}</p> : null}
              <HeadingTag id={`xp-heading-${ch.id}`} className="mk-cinema-title">
                {ch.title.split("\n").map((line, i, arr) => (
                  <span key={i}>
                    {line}
                    {i < arr.length - 1 ? <br /> : null}
                  </span>
                ))}
              </HeadingTag>
              {ch.lead ? <p className="mk-cinema-lead">{ch.lead}</p> : null}
              {ui.labels ? (
                <div className="mk-cinema-labels">
                  {ui.labels.map((l) => (
                    <span key={l} className="mk-cinema-label">
                      {l}
                    </span>
                  ))}
                </div>
              ) : null}
              {ui.productPreviews ? (
                <CinematicProductPreviews kinds={ui.productPreviews} layout="grid" />
              ) : null}
              {(ch.primaryCta || ch.secondaryCta) && (
                <div className="mk-cinema-actions">
                  {ch.primaryCta ? (
                    <a href={ch.primaryCta.href} className="mk-btn mk-btn-primary">
                      {ch.primaryCta.label} <ArrowRight size={16} aria-hidden="true" />
                    </a>
                  ) : null}
                  {ch.secondaryCta ? (
                    <a href={appPath(ch.secondaryCta.href)} className="mk-btn mk-btn-secondary">
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

import { ArrowRight } from "lucide-react";
import { appPath } from "../../../../lib/marketing-urls";
import { CINEMATIC_CHAPTERS } from "./cinematic-chapters";

/** Static narrative when WebGL is unavailable or reduced-motion is preferred. */
export function MarketingWebGLFallback() {
  return (
    <div className="mk-cinema-fallback">
      {CINEMATIC_CHAPTERS.map((ch) => (
        <section key={ch.id} className="mk-cinema-chapter mk-container">
          <div className={`mk-cinema-chapter__inner ${ch.alignClass ?? ""}`}>
            {ch.eyebrow ? <p className="mk-cinema-eyebrow">{ch.eyebrow}</p> : null}
            <h2 className="mk-cinema-title">{ch.title}</h2>
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
          </div>
        </section>
      ))}
      <div className="mk-container mk-cinema-actions" style={{ paddingBottom: "4rem" }}>
        <a href={appPath("/signup")} className="mk-btn mk-btn-primary">
          Get started <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

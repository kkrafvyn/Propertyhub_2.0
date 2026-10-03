import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { CINEMATIC_CHAPTERS } from "../../components/marketing/cinematic/cinematic-chapters";
import { MarketingWebGLFallback } from "../../components/marketing/cinematic/MarketingWebGLFallback";
import {
  useIsMobileCinematic,
  useMarketingSceneProgress,
} from "../../components/marketing/cinematic/useMarketingSceneProgress";
import { appPath } from "../../../lib/marketing-urls";
import "../../components/marketing/cinematic/marketing-cinematic.css";

const Marketing3DScene = lazy(() =>
  import("../../components/marketing/cinematic/Marketing3DScene").then((m) => ({
    default: m.Marketing3DScene,
  })),
);

function resolveHref(href: string) {
  if (href.startsWith("#") || href.startsWith("http")) return href;
  return appPath(href.startsWith("/") ? href : `/${href}`);
}

function CinematicChapterSection({
  chapter,
  mobile,
}: {
  chapter: (typeof CINEMATIC_CHAPTERS)[number];
  mobile: boolean;
}) {
  const titleLines = chapter.title.split("\n");

  return (
    <section
      id={`chapter-${chapter.id}`}
      className={`mk-cinema-chapter${chapter.short ? " mk-cinema-chapter--short" : ""}`}
      aria-labelledby={`cinema-heading-${chapter.id}`}
    >
      <div className={`mk-cinema-chapter__inner ${chapter.alignClass ?? ""}`}>
        {chapter.eyebrow ? <p className="mk-cinema-eyebrow">{chapter.eyebrow}</p> : null}
        <h2 id={`cinema-heading-${chapter.id}`} className="mk-cinema-title">
          {titleLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < titleLines.length - 1 ? <br /> : null}
            </span>
          ))}
        </h2>
        {chapter.lead ? <p className="mk-cinema-lead">{chapter.lead}</p> : null}

        {chapter.labels ? (
          <div className="mk-cinema-labels" aria-label="Connected operations">
            {chapter.labels.map((l) => (
              <span key={l} className="mk-cinema-label">
                {l}
              </span>
            ))}
          </div>
        ) : null}

        {mobile && chapter.mobileCards ? (
          <div className="mk-cinema-mobile-cards">
            {chapter.mobileCards.map((card) => (
              <div key={card.title} className="mk-cinema-mobile-card">
                <strong>{card.title}</strong>
                <span>{card.sub}</span>
              </div>
            ))}
          </div>
        ) : null}

        {chapter.aiPrompts ? (
          <div className="mk-cinema-ai-prompts" aria-label="Example AI prompts">
            {chapter.aiPrompts.map((p) => (
              <span key={p} className="mk-cinema-ai-prompt">
                {p}
              </span>
            ))}
          </div>
        ) : null}

        {chapter.id === "brand" ? (
          <div className="mk-cinema-brand-lockup" aria-hidden="true">
            <div className="mk-cinema-brand-mark" />
          </div>
        ) : null}

        {(chapter.primaryCta || chapter.secondaryCta) && (
          <div className="mk-cinema-actions">
            {chapter.primaryCta ? (
              <a
                href={resolveHref(chapter.primaryCta.href)}
                className="mk-btn mk-btn-primary mk-btn-glow"
                id={chapter.primaryCta.id}
              >
                {chapter.primaryCta.label} <ArrowRight size={16} aria-hidden="true" />
              </a>
            ) : null}
            {chapter.secondaryCta ? (
              <a
                href={resolveHref(chapter.secondaryCta.href)}
                className="mk-btn mk-btn-secondary"
                id={chapter.secondaryCta.id}
              >
                {chapter.secondaryCta.label}
              </a>
            ) : null}
          </div>
        )}
      </div>

      {chapter.id === "hero" ? (
        <p className="mk-cinema-scroll-cue" aria-hidden="true">
          Scroll
        </p>
      ) : null}
    </section>
  );
}

function useWebGLSupported() {
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const ok = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
      setSupported(ok);
    } catch {
      setSupported(false);
    }
  }, []);
  return supported;
}

export function MarketingCinematicHome() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const mobile = useIsMobileCinematic();
  const webgl = useWebGLSupported();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const { progress, pointer, reducedMotion: scrollReduced } = useMarketingSceneProgress(scrollRef);
  const motionOff = reducedMotion || scrollReduced;
  const use3d = webgl && !motionOff;

  return (
    <>
      <PageMeta
        title="BaytMiftah — The operating system for real estate"
        description="A connected platform for discovery, leasing, operations, finance, maintenance and AI — from one property to an entire portfolio."
        canonicalPath="/"
        ogTitle="BaytMiftah — Real estate operating system"
        ogDescription="Cinematic product story: one luxury property transforms into the BaytMiftah platform as you scroll."
      />

      {!use3d ? (
        <MarketingWebGLFallback />
      ) : (
        <div className="mk-cinema-root">
          <Suspense fallback={null}>
            <Marketing3DScene
              progress={progress}
              pointer={pointer}
              mobile={mobile}
              reducedMotion={reducedMotion}
            />
          </Suspense>

          <div ref={scrollRef} className="mk-cinema-scroll">
            {CINEMATIC_CHAPTERS.map((chapter) => (
              <CinematicChapterSection key={chapter.id} chapter={chapter} mobile={mobile} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { Logo } from "../../components/baytmiftah/Logo";
import { CINEMATIC_CHAPTERS } from "../../components/marketing/cinematic/cinematic-chapters";
import { MarketingWebGLFallback } from "../../components/marketing/cinematic/MarketingWebGLFallback";
import { CinematicProductPreviews } from "../../components/marketing/cinematic/CinematicProductPreviews";
import {
  useIsMobileCinematic,
  useMarketingSceneProgress,
} from "../../components/marketing/cinematic/useMarketingSceneProgress";
import { useSectionFocus } from "../../components/marketing/cinematic/useChapterFocus";
import { appPath } from "../../../lib/marketing-urls";
import { Marketing3DErrorBoundary } from "../../components/marketing/cinematic/Marketing3DErrorBoundary";
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
  motionOff,
}: {
  chapter: (typeof CINEMATIC_CHAPTERS)[number];
  mobile: boolean;
  motionOff: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const focus = useSectionFocus(sectionRef, { headerOffset: 72, disabled: motionOff });
  const titleLines = chapter.title.split("\n");
  const HeadingTag = chapter.headingLevel === "h1" ? "h1" : "h2";

  return (
    <section
      ref={sectionRef}
      id={`chapter-${chapter.id}`}
      className={`mk-cinema-chapter${chapter.short ? " mk-cinema-chapter--short" : ""}${
        chapter.tall ? " mk-cinema-chapter--tall" : ""
      }${chapter.id === "hero" ? " mk-cinema-chapter--hero" : ""}`}
      aria-labelledby={`cinema-heading-${chapter.id}`}
    >
      <div
        className={`mk-cinema-chapter__glass${focus.readable ? "" : " mk-cinema-chapter__glass--dim"}`}
        style={
          motionOff
            ? undefined
            : {
                opacity: focus.opacity,
                transform: `translateY(${focus.translateY}px)`,
              }
        }
        aria-hidden={!focus.readable}
      >
        <div
          className={`mk-cinema-chapter__inner ${chapter.alignClass ?? ""}`}
          inert={!focus.readable ? true : undefined}
        >
          {chapter.eyebrow ? <p className="mk-cinema-eyebrow">{chapter.eyebrow}</p> : null}
          <HeadingTag id={`cinema-heading-${chapter.id}`} className="mk-cinema-title">
            {titleLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < titleLines.length - 1 ? <br /> : null}
              </span>
            ))}
          </HeadingTag>
          {chapter.lead ? <p className="mk-cinema-lead">{chapter.lead}</p> : null}

          {chapter.labels ? (
            <div className="mk-cinema-labels" aria-label="Workflow areas">
              {chapter.labels.map((l) => (
                <span key={l} className="mk-cinema-label">
                  {l}
                </span>
              ))}
            </div>
          ) : null}

          {chapter.productPreviews && !mobile ? (
            <CinematicProductPreviews kinds={chapter.productPreviews} layout="grid" />
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

          {mobile && chapter.productPreviews ? (
            <CinematicProductPreviews kinds={chapter.productPreviews.slice(0, 2)} layout="stack" />
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
            <div className="mk-cinema-brand-lockup">
              <Logo to="/" size="md" inverted disableLink />
            </div>
          ) : null}

          {(chapter.primaryCta || chapter.secondaryCta) && (
            <div className="mk-cinema-actions">
              {chapter.primaryCta ? (
                <a
                  href={resolveHref(chapter.primaryCta.href)}
                  className="mk-btn mk-btn-primary mk-btn-glow"
                  id={chapter.primaryCta.id}
                  tabIndex={focus.readable ? undefined : -1}
                >
                  {chapter.primaryCta.label} <ArrowRight size={16} aria-hidden="true" />
                </a>
              ) : null}
              {chapter.secondaryCta ? (
                <a
                  href={resolveHref(chapter.secondaryCta.href)}
                  className="mk-btn mk-btn-secondary"
                  id={chapter.secondaryCta.id}
                  tabIndex={focus.readable ? undefined : -1}
                >
                  {chapter.secondaryCta.label}
                </a>
              ) : null}
            </div>
          )}
        </div>
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
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  const [sceneFailed, setSceneFailed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useMarketingSceneProgress(scrollRef);
  const staticOnly = !webgl || reducedMotion;
  const motionOff = reducedMotion || sceneFailed;
  const use3d = webgl && !reducedMotion && !sceneFailed;

  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (!hash.startsWith("#chapter-")) return;
      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      }
    };
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, [reducedMotion]);

  if (staticOnly) {
    return (
      <>
        <PageMeta
          title="BaytMiftah — Property operations for real estate teams"
          description="Listings, leasing, payments, maintenance, and resident support in one workspace — with governed AI assistance."
          canonicalPath="/"
          ogTitle="BaytMiftah — Property operations platform"
          ogDescription="Run property operations from one workspace. Illustrative previews on the marketing site."
        />
        <MarketingWebGLFallback />
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="BaytMiftah — Property operations for real estate teams"
        description="Listings, leasing, payments, maintenance, and resident support in one workspace — with governed AI assistance."
        canonicalPath="/"
        ogTitle="BaytMiftah — Property operations platform"
        ogDescription="Cinematic product story: architecture and workspace previews as you scroll."
      />

      <div className="mk-cinema-root">
        {use3d ? (
          <Marketing3DErrorBoundary onFailure={() => setSceneFailed(true)}>
            <Suspense fallback={<div className="mk-cinema-canvas-loader mk-cinema-canvas-loader--page" />}>
              <Marketing3DScene
                mobile={mobile}
                reducedMotion={reducedMotion}
                onContextLost={() => setSceneFailed(true)}
              />
            </Suspense>
          </Marketing3DErrorBoundary>
        ) : (
          <div className="mk-cinema-static-backdrop" aria-hidden="true" />
        )}

        <div ref={scrollRef} id="mk-main-content" className="mk-cinema-scroll" tabIndex={-1}>
          {CINEMATIC_CHAPTERS.map((chapter) => (
            <CinematicChapterSection
              key={chapter.id}
              chapter={chapter}
              mobile={mobile}
              motionOff={motionOff}
            />
          ))}
        </div>
      </div>
    </>
  );
}

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { Logo } from "../../components/baytmiftah/Logo";
import { Marketing3DErrorBoundary } from "../../components/marketing/cinematic/Marketing3DErrorBoundary";
import { CinematicProductPreviews } from "../../components/marketing/cinematic/CinematicProductPreviews";
import {
  useIsMobileCinematic,
  useMarketingSceneProgress,
} from "../../components/marketing/cinematic/useMarketingSceneProgress";
import { useSectionFocus } from "../../components/marketing/cinematic/useChapterFocus";
import { EXPERIENCE_CHAPTERS, type ExperienceChapterCopy } from "../../components/marketing/experience/experience-chapters";
import { EXPERIENCE_CHAPTER_UI } from "../../components/marketing/experience/experience-chapter-ui";
import { ExperienceWebGLFallback } from "../../components/marketing/experience/ExperienceWebGLFallback";
import { appPath } from "../../../lib/marketing-urls";
import "../../components/marketing/cinematic/marketing-cinematic.css";
import "../../components/marketing/experience/marketing-experience.css";

const ExperienceScene = lazy(() =>
  import("../../components/marketing/experience/ExperienceScene").then((m) => ({
    default: m.ExperienceScene,
  })),
);

function resolveHref(href: string) {
  if (href.startsWith("#") || href.startsWith("http")) return href;
  return appPath(href.startsWith("/") ? href : `/${href}`);
}

function ExperienceChapterSection({
  chapter,
  mobile,
  motionOff,
}: {
  chapter: ExperienceChapterCopy;
  mobile: boolean;
  motionOff: boolean;
}) {
  const ui = EXPERIENCE_CHAPTER_UI[chapter.id] ?? {};
  const sectionRef = useRef<HTMLElement>(null);
  const focus = useSectionFocus(sectionRef, { headerOffset: 72, disabled: motionOff });
  const titleLines = chapter.title.split("\n");
  const HeadingTag = ui.headingLevel === "h1" ? "h1" : "h2";
  const stepIndex = (steps: string[] | undefined) =>
    steps && steps.length > 0
      ? Math.min(steps.length - 1, Math.floor(focus.opacity * steps.length))
      : 0;
  const leasingIndex = stepIndex(ui.leasingSteps);
  const maintenanceIndex = stepIndex(ui.maintenanceSteps);
  const orgRoleIndex = stepIndex(ui.orgRoles);

  return (
    <section
      ref={sectionRef}
      id={`chapter-${chapter.id}`}
      className={`mk-cinema-chapter${ui.short ? " mk-cinema-chapter--short" : ""}${
        ui.tall ? " mk-cinema-chapter--tall" : ""
      }${chapter.id === "hero" ? " mk-cinema-chapter--hero" : ""}`}
      aria-labelledby={`xp-heading-${chapter.id}`}
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
          className={`mk-cinema-chapter__inner ${ui.alignClass ?? ""}`}
          inert={!focus.readable ? true : undefined}
        >
          {chapter.eyebrow ? <p className="mk-cinema-eyebrow">{chapter.eyebrow}</p> : null}
          <HeadingTag id={`xp-heading-${chapter.id}`} className="mk-cinema-title">
            {titleLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < titleLines.length - 1 ? <br /> : null}
              </span>
            ))}
          </HeadingTag>
          {chapter.lead ? <p className="mk-cinema-lead">{chapter.lead}</p> : null}

          {ui.labels ? (
            <div className="mk-cinema-labels" aria-label="Operational areas">
              {ui.labels.map((l) => (
                <span key={l} className="mk-cinema-label">
                  {l}
                </span>
              ))}
            </div>
          ) : null}

          {ui.leasingSteps ? (
            <ol className="mk-xp-leasing-steps" aria-label="Leasing workflow">
              {ui.leasingSteps.map((step, i) => (
                <li key={step} className={i === leasingIndex ? "is-active" : ""}>
                  {step}
                </li>
              ))}
            </ol>
          ) : null}

          {ui.maintenanceSteps ? (
            <ol className="mk-xp-leasing-steps" aria-label="Maintenance workflow">
              {ui.maintenanceSteps.map((step, i) => (
                <li key={step} className={i === maintenanceIndex ? "is-active" : ""}>
                  {step}
                </li>
              ))}
            </ol>
          ) : null}

          {ui.productPreviews && !mobile ? (
            <CinematicProductPreviews kinds={ui.productPreviews} layout="grid" />
          ) : null}

          {mobile && ui.mobileCards ? (
            <div className="mk-cinema-mobile-cards">
              {ui.mobileCards.map((card) => (
                <div key={card.title} className="mk-cinema-mobile-card">
                  <strong>{card.title}</strong>
                  <span>{card.sub}</span>
                </div>
              ))}
            </div>
          ) : null}

          {mobile && ui.productPreviews ? (
            <CinematicProductPreviews kinds={ui.productPreviews.slice(0, 2)} layout="stack" />
          ) : null}

          {ui.aiPrompts ? (
            <div className="mk-cinema-ai-prompts" aria-label="Example AI commands">
              {ui.aiPrompts.map((p) => (
                <span key={p} className="mk-cinema-ai-prompt">
                  {p}
                </span>
              ))}
            </div>
          ) : null}

          {ui.orgRoles ? (
            <div className="mk-xp-org-roles" aria-label="Role perspectives">
              <p className="mk-xp-org-roles__active">{ui.orgRoles[orgRoleIndex]} view · preview</p>
              <div className="mk-xp-org-roles__tabs">
                {ui.orgRoles.map((role, i) => (
                  <span key={role} className={i === orgRoleIndex ? "is-active" : ""}>
                    {role}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {chapter.id === "ai" ? (
            <div className="mk-xp-ai-brief" aria-label="Illustrative AI response">
              <p className="mk-xp-ai-brief__q">Which properties need attention today?</p>
              <ul>
                <li>3 overdue collection cases</li>
                <li>2 urgent maintenance requests</li>
                <li>4 leases expiring soon</li>
                <li>1 property with declining occupancy</li>
              </ul>
              <p className="mk-cinema-preview-note">Illustrative — not live data.</p>
            </div>
          ) : null}

          {chapter.id === "final" ? (
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
                  tabIndex={focus.readable ? undefined : -1}
                >
                  {chapter.primaryCta.label} <ArrowRight size={16} aria-hidden="true" />
                </a>
              ) : null}
              {chapter.secondaryCta ? (
                <a
                  href={resolveHref(chapter.secondaryCta.href)}
                  className="mk-btn mk-btn-secondary"
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

export function MarketingExperienceHome() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const mobile = useIsMobileCinematic();
  const webgl = useWebGLSupported();
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  const [sceneFailed, setSceneFailed] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

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
          title="BaytMiftah — Real estate, operated as one system"
          description="Cinematic product story: leasing, finance, maintenance, residents and portfolio operations in one platform."
          canonicalPath="/"
          ogTitle="BaytMiftah — Property operating system"
          ogDescription="Scroll through architecture and workspace previews — illustrative data only."
        />
        <ExperienceWebGLFallback />
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="BaytMiftah — Real estate, operated as one system"
        description="BaytMiftah connects leasing, finance, maintenance, residents and portfolio operations in one platform."
        canonicalPath="/"
        ogTitle="BaytMiftah — Property operating system"
        ogDescription="An interactive product film: architecture and BaytMiftah workspace previews as you scroll."
      />

      <div className={`mk-cinema-root mk-xp-root${sceneReady ? " is-scene-ready" : ""}`}>
        {use3d ? (
          <div
            className="mk-xp-loader"
            role="status"
            aria-live="polite"
            aria-hidden={sceneReady}
          >
            <p className="mk-xp-loader__brand">BaytMiftah</p>
            <p className="mk-xp-loader__line">Building your view…</p>
            <div className="mk-xp-loader__progress" aria-hidden="true">
              <span />
            </div>
          </div>
        ) : null}

        {use3d ? (
          <Marketing3DErrorBoundary onFailure={() => setSceneFailed(true)}>
            <Suspense fallback={<div className="mk-xp-loader mk-xp-loader--canvas" aria-hidden="true" />}>
              <ExperienceScene
                mobile={mobile}
                reducedMotion={reducedMotion}
                onContextLost={() => setSceneFailed(true)}
                onReady={() => setSceneReady(true)}
              />
            </Suspense>
          </Marketing3DErrorBoundary>
        ) : (
          <div className="mk-cinema-static-backdrop" aria-hidden="true" />
        )}

        <div
          ref={scrollRef}
          id="mk-main-content"
          className={`mk-cinema-scroll mk-xp-scroll${sceneReady ? " is-scene-ready" : ""}`}
          tabIndex={-1}
        >
          {EXPERIENCE_CHAPTERS.map((chapter) => (
            <ExperienceChapterSection
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

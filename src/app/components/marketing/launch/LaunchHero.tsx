import { useEffect, useRef } from "react";
import { appPath } from "../../../../lib/marketing-urls";
import { LaunchMetric, LaunchTableRow, LaunchUiShell } from "./LaunchProductChrome";

export function LaunchHero() {
  const composeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = composeRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 8;
      const ny = (e.clientY / window.innerHeight - 0.5) * 6;
      root.style.setProperty("--mk-l-parallax-x", `${nx}px`);
      root.style.setProperty("--mk-l-parallax-y", `${ny}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <section className="mk-l-hero" aria-labelledby="launch-hero-heading">
      <div className="mk-l-container mk-l-hero__grid">
        <div className="mk-l-hero__copy">
          <h1 id="launch-hero-heading" className="mk-l-hero__title">
            Real estate, operated as one system.
          </h1>
          <p className="mk-l-hero__lead">
            BaytMiftah brings property discovery, leasing, finance, maintenance and portfolio operations into one
            connected platform.
          </p>
          <div className="mk-l-actions">
            <a href="#platform" className="mk-l-btn mk-l-btn--primary">
              Explore the platform
            </a>
            <a href="#organizations" className="mk-l-btn mk-l-btn--ghost">
              For organizations
            </a>
          </div>
          <p className="mk-l-hero__caption">Built for owners, operators, managers, agents and residents.</p>
        </div>

        <div ref={composeRef} className="mk-l-hero__compose" id="platform">
          <div className="mk-l-arch-block" aria-hidden="true" />
          <LaunchUiShell title="Portfolio" className="mk-l-layer mk-l-layer--a">
            <LaunchMetric label="Occupancy" value="92%" />
            <LaunchMetric label="Units" value="48" />
          </LaunchUiShell>
          <LaunchUiShell title="Building · Airport Hills" className="mk-l-layer mk-l-layer--b">
            <LaunchTableRow left="Unit 204" right="Leased" />
            <LaunchTableRow left="Unit 18" right="Vacant" />
          </LaunchUiShell>
          <LaunchUiShell title="Collections" className="mk-l-layer mk-l-layer--c">
            <LaunchTableRow left="Rent due" right="5 days" />
            <LaunchTableRow left="Receipt" right="Matched" />
          </LaunchUiShell>
          <LaunchUiShell title="Maintenance" className="mk-l-layer mk-l-layer--d">
            <LaunchTableRow left="MT-2041" right="Assigned" />
          </LaunchUiShell>
        </div>
      </div>
    </section>
  );
}

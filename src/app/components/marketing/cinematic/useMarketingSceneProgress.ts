import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clamp01 } from "./scene-phases";
import { marketingScrollState, type ScenePointer } from "./marketingScrollState";

gsap.registerPlugin(ScrollTrigger);

export type { ScenePointer };

export function useMarketingSceneProgress(scrollRootRef: React.RefObject<HTMLElement | null>) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const root = scrollRootRef.current;
    if (!root || reducedMotion) {
      marketingScrollState.setProgress(0);
      return undefined;
    }

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.35,
      onUpdate: (self) => marketingScrollState.setProgress(clamp01(self.progress)),
    });

    const refresh = () => ScrollTrigger.refresh();
    refresh();
    const refreshTimer = window.setTimeout(refresh, 120);

    return () => {
      window.clearTimeout(refreshTimer);
      trigger.kill();
    };
  }, [scrollRootRef, reducedMotion]);

  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        marketingScrollState.setPointer(nx, ny);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) ScrollTrigger.refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return { reducedMotion };
}

export function useIsMobileCinematic(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [breakpoint]);
  return mobile;
}

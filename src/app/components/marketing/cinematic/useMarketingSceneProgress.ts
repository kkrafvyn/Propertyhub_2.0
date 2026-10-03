import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clamp01 } from "./scene-phases";

gsap.registerPlugin(ScrollTrigger);

export type ScenePointer = { x: number; y: number };

export function useMarketingSceneProgress(scrollRootRef: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  const [pointer, setPointer] = useState<ScenePointer>({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const root = scrollRootRef.current;
    if (!root || reducedMotion) {
      setProgress(0);
      return undefined;
    }

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      onUpdate: (self) => setProgress(clamp01(self.progress)),
    });
    ScrollTrigger.refresh();

    return () => {
      trigger.kill();
    };
  }, [scrollRootRef, reducedMotion]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      setPointer({ x: nx, y: ny });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) ScrollTrigger.refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return { progress, pointer, reducedMotion };
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

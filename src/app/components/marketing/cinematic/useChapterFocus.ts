import { useEffect, useState, type RefObject } from "react";
import { clamp01 } from "./scene-phases";

export type SectionFocus = {
  opacity: number;
  translateY: number;
  readable: boolean;
};

const DEFAULT_FOCUS: SectionFocus = {
  opacity: 1,
  translateY: 0,
  readable: true,
};

/** Opacity from section geometry — keeps copy readable while scrolling. */
export function computeSectionFocus(
  rect: DOMRectReadOnly,
  viewportHeight: number,
  headerOffset: number,
): SectionFocus {
  const viewportTop = headerOffset;
  const viewportBottom = viewportHeight;
  const visibleTop = Math.max(rect.top, viewportTop);
  const visibleBottom = Math.min(rect.bottom, viewportBottom);
  const visible = Math.max(0, visibleBottom - visibleTop);
  const viewportSpan = Math.max(viewportBottom - viewportTop, 1);
  const sectionHeight = Math.max(rect.height, 1);
  const visibilityRatio = visible / Math.min(sectionHeight, viewportSpan);

  const sectionMid = (rect.top + rect.bottom) / 2;
  const viewMid = (viewportTop + viewportBottom) / 2;
  const centerDistance = Math.abs(sectionMid - viewMid) / (viewportSpan * 0.55);
  const centerWeight = clamp01(1 - centerDistance * 0.55);

  let opacity = 1;

  if (visibilityRatio >= 0.12) {
    opacity = Math.max(0.9, 0.82 + centerWeight * 0.18);
  } else if (visibilityRatio > 0.02) {
    opacity = 0.35 + visibilityRatio * 4;
  } else {
    opacity = clamp01(visibilityRatio * 6) * 0.2;
  }

  // Initial hero / top-of-page: full opacity when the section header is in view
  if (rect.top <= viewportTop + 96 && rect.bottom > viewportTop + 140) {
    opacity = 1;
  }

  const readable = visibilityRatio >= 0.1 && opacity >= 0.78;
  const translateY = readable ? 0 : Math.min(14, (1 - Math.min(opacity, 1)) * 18);

  return { opacity, translateY, readable };
}

export function useSectionFocus(
  ref: RefObject<HTMLElement | null>,
  options?: { headerOffset?: number; disabled?: boolean },
) {
  const headerOffset = options?.headerOffset ?? 72;
  const disabled = options?.disabled ?? false;
  const [focus, setFocus] = useState<SectionFocus>(DEFAULT_FOCUS);

  useEffect(() => {
    if (disabled) {
      setFocus(DEFAULT_FOCUS);
      return undefined;
    }

    const el = ref.current;
    if (!el) return undefined;

    let raf = 0;
    const measure = () => {
      const next = computeSectionFocus(el.getBoundingClientRect(), window.innerHeight, headerOffset);
      setFocus((prev) =>
        prev.opacity === next.opacity &&
        prev.translateY === next.translateY &&
        prev.readable === next.readable
          ? prev
          : next,
      );
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        measure();
      });
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, headerOffset, disabled]);

  return focus;
}

/** @deprecated Use computeSectionFocus / useSectionFocus — kept for tests migrating off global bands. */
export function chapterFocusOpacity(_chapterId: string, _progress: number) {
  return { opacity: 1, translateY: 0 };
}

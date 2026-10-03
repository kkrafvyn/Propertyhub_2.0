import { CHAPTER_BANDS, clamp01 } from "./scene-phases";

const CHAPTER_IDS = [
  "hero",
  "enter",
  "platform",
  "portfolio",
  "consumer",
  "ai",
  "brand",
] as const;

/** Opacity + slight Y offset for DOM copy tied to global scroll progress. */
export function chapterFocusOpacity(chapterId: (typeof CHAPTER_IDS)[number], progress: number) {
  const band = CHAPTER_BANDS[chapterId];
  const [start, end] = band;
  const mid = (start + end) / 2;
  const half = (end - start) / 2;
  const dist = Math.abs(progress - mid) / Math.max(half, 0.001);
  const opacity = clamp01(1.15 - dist * 1.1);
  const translateY = (1 - opacity) * 24;
  return { opacity, translateY };
}

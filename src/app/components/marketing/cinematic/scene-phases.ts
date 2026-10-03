/** Normalized scroll progress bands for the single continuous 3D story. */
export const CINEMATIC_CHAPTER_COUNT = 7;

export type ScenePhase =
  | "hero"
  | "enter"
  | "platform"
  | "portfolio"
  | "consumer"
  | "ai"
  | "brand";

export function phaseFromProgress(p: number): ScenePhase {
  if (p < 0.14) return "hero";
  if (p < 0.28) return "enter";
  if (p < 0.42) return "platform";
  if (p < 0.57) return "portfolio";
  if (p < 0.71) return "consumer";
  if (p < 0.86) return "ai";
  return "brand";
}

export function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** Local 0–1 progress within a chapter band. */
export function chapterLocalProgress(p: number, start: number, end: number) {
  if (end <= start) return 0;
  return clamp01((p - start) / (end - start));
}

export const CHAPTER_BANDS = {
  hero: [0, 0.14],
  enter: [0.14, 0.28],
  platform: [0.28, 0.42],
  portfolio: [0.42, 0.57],
  consumer: [0.57, 0.71],
  ai: [0.71, 0.86],
  brand: [0.86, 1],
} as const;

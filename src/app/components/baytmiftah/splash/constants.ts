/** BaytMiftah animated splash — timing & brand tokens */

export const SPLASH_COLORS = {
  background: "#FFFFFF",
  primary: "#0D4F3C",
  glow: "rgba(13, 79, 60, 0.35)",
  shadow: "rgba(13, 79, 60, 0.18)",
  reflection: "rgba(13, 79, 60, 0.08)",
  tagline: "rgba(13, 79, 60, 0.72)",
  line: "rgba(13, 79, 60, 0.45)",
};

export const NATIVE_SPLASH_COLORS = {
  background: "#0F2922",
  primary: "#FFFFFF",
  glow: "rgba(255, 255, 255, 0.35)",
  shadow: "rgba(255, 255, 255, 0.12)",
  reflection: "rgba(255, 255, 255, 0.06)",
  tagline: "rgba(255, 255, 255, 0.72)",
  line: "rgba(255, 255, 255, 0.35)",
};

export const SPLASH_DURATION_MS = 3000;

export const SPLASH_PHASES = {
  dotStart: 0,
  dotEnd: 500,
  arcStart: 500,
  arcEnd: 1200,
  wordmarkStart: 1200,
  wordmarkEnd: 1800,
  taglineStart: 1800,
  taglineEnd: 2300,
  polishStart: 2300,
  polishEnd: 3000,
};

export const SPLASH_DURATIONS = {
  dot: SPLASH_PHASES.dotEnd - SPLASH_PHASES.dotStart,
  arc: SPLASH_PHASES.arcEnd - SPLASH_PHASES.arcStart,
  wordmark: SPLASH_PHASES.wordmarkEnd - SPLASH_PHASES.wordmarkStart,
  tagline: SPLASH_PHASES.taglineEnd - SPLASH_PHASES.taglineStart,
  polish: SPLASH_PHASES.polishEnd - SPLASH_PHASES.polishStart,
  hold: 500,
};

export const SPLASH_EASING = {
  smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeInOut: "cubic-bezier(0.45, 0, 0.55, 1)",
  spring: "cubic-bezier(0.34, 1.45, 0.64, 1)",
  softSpring: "cubic-bezier(0.22, 1.05, 0.36, 1)",
  arc: "cubic-bezier(0.33, 0, 0.2, 1)",
};

export const SPLASH_WORDMARK = "BΛYTMIFTΛH";
export const SPLASH_TAGLINE = "UNLOCKING PROPERTY OPPORTUNITIES";
export const WORDMARK_CHAR_STAGGER_MS = 52;

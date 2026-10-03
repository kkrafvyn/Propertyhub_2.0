/** Cinematic scroll easing — avoids linear keyframe interpolation. */
export function easeInOutQuart(t: number) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}

export function easeOutCubic(t: number) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return 1 - Math.pow(1 - x, 3);
}

export function sampleKeyframeSegment(t: number, ease = easeInOutQuart) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return ease(x);
}

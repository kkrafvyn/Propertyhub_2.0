import { describe, expect, it } from "vitest";
import { computeSectionFocus } from "./useChapterFocus";

describe("computeSectionFocus", () => {
  const header = 72;
  const vh = 800;

  it("keeps hero copy fully visible at initial scroll position", () => {
    const rect = {
      top: 72,
      bottom: 872,
      left: 0,
      right: 400,
      width: 400,
      height: 800,
      x: 0,
      y: 72,
      toJSON: () => ({}),
    } as DOMRect;

    const focus = computeSectionFocus(rect, vh, header);
    expect(focus.opacity).toBe(1);
    expect(focus.readable).toBe(true);
  });

  it("marks off-screen sections as not readable", () => {
    const rect = {
      top: 2000,
      bottom: 2800,
      left: 0,
      right: 400,
      width: 400,
      height: 800,
      x: 0,
      y: 2000,
      toJSON: () => ({}),
    } as DOMRect;

    const focus = computeSectionFocus(rect, vh, header);
    expect(focus.readable).toBe(false);
    expect(focus.opacity).toBeLessThan(0.5);
  });

  it("keeps partially visible platform section readable", () => {
    const rect = {
      top: 320,
      bottom: 1120,
      left: 0,
      right: 400,
      width: 400,
      height: 800,
      x: 0,
      y: 320,
      toJSON: () => ({}),
    } as DOMRect;

    const focus = computeSectionFocus(rect, vh, header);
    expect(focus.opacity).toBeGreaterThanOrEqual(0.9);
    expect(focus.readable).toBe(true);
  });
});

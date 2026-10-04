import { describe, expect, it } from "vitest";
import { videoCallsAvailable } from "./communications-capabilities";

describe("videoCallsAvailable", () => {
  it("is false without provider configuration", () => {
    expect(videoCallsAvailable()).toBe(false);
  });
});

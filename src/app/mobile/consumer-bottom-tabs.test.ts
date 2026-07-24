import { describe, expect, it } from "vitest";
import { buildConsumerTabItems, resolveConsumerTabId } from "./consumer-bottom-tabs";

describe("resolveConsumerTabId", () => {
  it("maps canonical consumer routes to tab ids", () => {
    expect(resolveConsumerTabId("/")).toBe("home");
    expect(resolveConsumerTabId("/search")).toBe("explore");
    expect(resolveConsumerTabId("/compare")).toBe("explore");
    expect(resolveConsumerTabId("/property/abc")).toBe("explore");
    expect(resolveConsumerTabId("/app/saved")).toBe("saved");
    expect(resolveConsumerTabId("/app/messages")).toBe("messages");
    expect(resolveConsumerTabId("/app/settings")).toBe("profile");
  });
});

describe("buildConsumerTabItems", () => {
  const t = (key: string) => key;

  it("builds five consumer tabs with translated labels", () => {
    const items = buildConsumerTabItems(t, { id: "user-1" });
    expect(items).toHaveLength(5);
    expect(items.map((item) => item.id)).toEqual(["home", "explore", "saved", "messages", "profile"]);
    expect(items[0].label).toBe("mobile.home");
  });

  it("routes auth-required tabs to login when signed out", () => {
    const items = buildConsumerTabItems(t, null);
    expect(items.find((item) => item.id === "messages")?.href).toBe("/login");
    expect(items.find((item) => item.id === "saved")?.href).toBe("/app/saved");
  });
});

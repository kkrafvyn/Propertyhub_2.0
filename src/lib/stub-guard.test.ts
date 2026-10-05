import { describe, expect, it } from "vitest";
import { isDemoSimulationAllowed, isProductionBuild } from "./simulation-mode";
import { whatsappGroupBotService } from "./whatsapp-group-bot.service";

describe("stub guard / simulation contract", () => {
  it("allows demo simulation only under Vitest MODE=test", () => {
    expect(import.meta.env.MODE).toBe("test");
    expect(isDemoSimulationAllowed()).toBe(true);
  });

  it("documents production build flag for shipped bundles", () => {
    expect(typeof isProductionBuild()).toBe("boolean");
  });

  it("permits WhatsApp group simulation under Vitest for unit tests", () => {
    const result = whatsappGroupBotService.simulateGroupMessage({
      text: "@BaytMiftah menu",
      senderPhone: "233200000000",
      respondWithoutMention: true,
    });
    expect(result.responded).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { resolveTemplatePack } from "./workspace-template-packs";

describe("workspace-template-packs", () => {
  it("selects agency pack for brokerages", () => {
    const pack = resolveTemplatePack({ businessTypes: ["agency_brokerage"] });
    expect(pack.id).toBe("agency");
    expect(pack.enabledModules).toContain("crm");
  });

  it("selects personal pack for personal workspaces", () => {
    const pack = resolveTemplatePack({ workspaceKind: "personal", businessTypes: [] });
    expect(pack.id).toBe("personal");
  });
});

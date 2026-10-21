import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("workspace shell audit script", () => {
  it("runs without throwing", () => {
    const out = execSync("node scripts/audit-workspace-shell.mjs", {
      encoding: "utf8",
    });
    expect(out).toMatch(/Workspace modules:/);
    expect(out).toMatch(/With WorkspacePageShell:/);
    const match = out.match(/With WorkspacePageShell:\s*(\d+)/);
    const count = match ? Number(match[1]) : 0;
    expect(count).toBeGreaterThanOrEqual(70);
  });
});

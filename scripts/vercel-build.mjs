import { spawnSync } from "node:child_process";

const project = (process.env.VERCEL_PROJECT_NAME ?? "").toLowerCase();
const forcedMode = (process.env.VITE_SITE_MODE ?? "").trim().toLowerCase();

const isMarketingProject =
  forcedMode === "marketing" ||
  project.includes("baytmiftah-marketing") ||
  project.includes("marketing");

const script = isMarketingProject ? "build:marketing" : "build:web";

console.log(
  `[vercel-build] project=${project || "(unknown)"} mode=${isMarketingProject ? "marketing" : "app"} → npm run ${script}`,
);

const result = spawnSync("npm", ["run", script], {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);

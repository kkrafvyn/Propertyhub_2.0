#!/usr/bin/env node
/**
 * Pilot flow load probe — measures latency and error rate for key public routes.
 *
 * Usage:
 *   npm run load:pilot
 *   npm run load:pilot -- --url https://app.baytmiftah.com --concurrency 10 --iterations 50
 */
const args = process.argv.slice(2);

function getArg(name, fallback) {
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return fallback;
}

const baseUrl = (getArg("--url", process.env.LOAD_TEST_BASE_URL || "https://app.baytmiftah.com")).replace(
  /\/+$/,
  "",
);
const concurrency = Number(getArg("--concurrency", "5"));
const iterations = Number(getArg("--iterations", "30"));

const ROUTES = [
  "/",
  "/search",
  "/login",
  "/legal/terms",
  "/legal/privacy",
];

async function fetchRoute(path) {
  const start = performance.now();
  try {
    const res = await fetch(`${baseUrl}${path}`, { redirect: "follow" });
    const ms = performance.now() - start;
    const ok = res.status >= 200 && res.status < 500;
    return { path, status: res.status, ms, ok };
  } catch (error) {
    return { path, status: 0, ms: performance.now() - start, ok: false, error: String(error) };
  }
}

function isNetworkFailure(result) {
  return result.status === 0 && result.error;
}

async function runBatch() {
  const picks = Array.from({ length: concurrency }, (_, i) => ROUTES[i % ROUTES.length]);
  return Promise.all(picks.map((path) => fetchRoute(path)));
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function main() {
  console.log(`Load probe: ${baseUrl} (concurrency=${concurrency}, iterations=${iterations})`);
  const results = [];

  for (let i = 0; i < iterations; i += concurrency) {
    const batch = await runBatch();
    results.push(...batch);
  }

  const latencies = results.map((r) => r.ms);
  const errors = results.filter((r) => !r.ok);
  const byRoute = Object.fromEntries(
    ROUTES.map((path) => {
      const subset = results.filter((r) => r.path === path);
      const lats = subset.map((r) => r.ms);
      return [
        path,
        {
          requests: subset.length,
          errors: subset.filter((r) => !r.ok).length,
          p50Ms: Math.round(percentile(lats, 50)),
          p95Ms: Math.round(percentile(lats, 95)),
        },
      ];
    }),
  );

  const summary = {
    baseUrl,
    totalRequests: results.length,
    errorCount: errors.length,
    errorRate: Number((errors.length / results.length).toFixed(4)),
    p50Ms: Math.round(percentile(latencies, 50)),
    p95Ms: Math.round(percentile(latencies, 95)),
    maxMs: Math.round(Math.max(...latencies)),
    byRoute,
    checkedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(summary, null, 2));

  const networkOnly = errors.length > 0 && errors.every(isNetworkFailure);
  if (networkOnly) {
    console.warn("All failures were network errors — run from a host with access to the target URL.");
    return;
  }

  const failThreshold = Number(process.env.LOAD_TEST_MAX_ERROR_RATE || "0.05");
  if (summary.errorRate > failThreshold) {
    console.error(`Error rate ${summary.errorRate} exceeds threshold ${failThreshold}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

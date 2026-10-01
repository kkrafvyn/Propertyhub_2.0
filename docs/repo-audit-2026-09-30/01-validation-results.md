# Validation results

## Final local results

| Check | Result | Notes |
| --- | --- | --- |
| `npm install` | Pass | Installed two Capacitor packages already declared in `package.json` and `package-lock.json`. |
| `npm run typecheck` | Pass | Completed with no TypeScript diagnostics. |
| `npm run build` | Pass with warnings | Built 2,986 modules in about 2m34s. Vite reported ineffective dynamic imports and chunks over 1,200 kB. |
| `npm test -- --reporter=dot` | Fail | 137/138 test files passed; 597 tests passed, one timed out, five skipped. |
| `npm audit --json` | Fail | Five vulnerable packages: four high and one moderate. No critical finding. |

## Dependency installation state

Immediately after pulling revision `c3cd5a8`, the local `node_modules` tree did not contain `@capacitor/app` or `@capacitor/browser`. That initially broke type-check, tests, and build at [native-oauth.ts](../../src/lib/native-oauth.ts). Both packages were already correctly declared and locked, so this was a stale local installation rather than a repository defect. `npm install` corrected it without changing tracked files.

The install also warned that install scripts for `@tailwindcss/oxide`, `better-sqlite3`, and `esbuild` have not been explicitly approved under the active npm script policy. Review this policy before depending on native Electron/SQLite packaging.

## Test failure

The failing test is [PropertyDetail.test.tsx](../../src/app/pages/PropertyDetail.test.tsx), inquiry-flow case beginning near line 171. It exceeds its 20-second timeout. This is a release signal even if it is only flaky: CI cannot reliably distinguish a regression from timing noise.

The run also emitted avoidable test-environment noise:

- repeated DNS attempts to `test.supabase.co`;
- an attempted Google Maps script load in Happy DOM;
- a CORS request to `https://example.com/webhook`;
- multiple Supabase `GoTrueClient` instances sharing the same storage key.

These indicate incomplete network isolation in unit tests and make real failures harder to spot.

## Dependency audit

`npm audit` reported:

- `electron` — direct dependency, high severity; installed range includes fixes available in newer releases;
- `axios` — transitive, high severity;
- `brace-expansion` — transitive, high severity;
- `undici` — transitive, high severity;
- `fast-uri` — transitive, moderate severity.

Do not apply `npm audit fix --force` blindly. Update the direct parents, inspect lockfile changes, then rerun unit, Electron packaging, security, and smoke checks.

## Build warnings and output

The build succeeds, but Vite reports modules that are both statically and dynamically imported. Those dynamic imports cannot produce useful split points. The broad static import graph around `supabase.ts` and `estate-operations.service.ts` is the most visible example.

Largest emitted assets include:

| Asset | Minified size |
| --- | ---: |
| `WorkspaceLayout-*.js` | 1,608.70 kB |
| `index-*.js` | 1,099.10 kB |
| `pdf-*.js` | 483.14 kB |
| application CSS | 483.15 kB |
| PDF worker | 1,265.41 kB |

The two main JavaScript chunks should be treated as a performance defect, especially on mobile networks.

# Quality and maintainability findings

## Oversized modules

The codebase has many page-sized monoliths that combine data access, workflow orchestration, state, and rendering. Highest-risk examples from the scan:

| File | Approximate lines |
| --- | ---: |
| `src/app/pages/user/Dashboard.tsx` | 1,923 |
| `src/app/pages/PropertyDetail.tsx` | 1,713 |
| `src/app/pages/workspace/WorkspaceLayout.tsx` | 1,630 |
| `src/app/pages/workspace/WorkspaceLeads.tsx` | 1,598 |
| `src/app/pages/workspace/EnterpriseOperations.tsx` | 1,591 |
| `src/app/pages/user/ConsumerPortalExtended.tsx` | 1,320 |
| `src/app/pages/admin/AdminLayout.tsx` | 1,315 |
| `src/app/pages/workspace/WorkspaceListings.tsx` | 1,214 |
| `src/app/pages/workspace/EstateOperations.tsx` | 1,186 |
| `src/app/pages/marketing/MarketingHome.tsx` | 1,176 |

Risk: changes have a large blast radius, review is difficult, tests tend toward slow full-page setup, and route-level code splitting is weakened.

Recommendation: extract page controllers/hooks, query adapters, form sections, and feature panels. Use route boundaries that import feature modules without a shared layout statically importing every workspace feature.

## Ineffective code splitting

Vite reports several modules as both dynamic and static imports, including `supabase.ts`, `estate-operations.service.ts`, `ai-tool-allowlist.service.ts`, and `MarketingHome.tsx`. A dynamic import cannot create a separate chunk when another reachable path imports the same module statically.

The resulting `WorkspaceLayout` chunk is about 1.61 MB minified, above the configured 1.2 MB warning threshold. This is likely to hurt first interaction and memory pressure on lower-end mobile devices.

Recommendation:

- remove feature-page imports from shared layouts and registries;
- lazy-load route definitions at the leaf level;
- keep shared service facades small and move feature implementations behind them;
- add CI bundle budgets for initial JavaScript and CSS.

## Test architecture

The repository has broad coverage by file count (138 test/spec files), but the default unit run performs real or attempted network work. That increases duration and flakiness. The inquiry test timeout demonstrates the consequence.

Recommendation:

- block unmocked network access in unit tests;
- use one deterministic Supabase/auth test harness;
- move live storage and tenant tests into a named integration project;
- remove arbitrary long timeouts in favor of awaited state transitions and fake timers where suitable;
- configure Vitest worker/environment reuse only after confirming isolation requirements.

## Dependency and release hygiene

`npm audit` is currently red. A direct Electron vulnerability is especially relevant because the project ships a desktop build. Transitive HTTP-client issues may affect scripts, tooling, or runtime dependencies depending on their parents.

Recommendation: update vulnerable dependency parents in a focused branch, generate desktop packages, run security checks, then exercise protocol handling and OAuth/deep-link flows. Keep the audit result attached to the release artifact.

## Error visibility

Many UI and service paths rely on `console.error`/`console.warn`. Logging itself is not a defect, and several flows also display user feedback, but the volume makes it likely that some failures are console-only.

Recommendation: standardize errors into user-safe messages plus structured monitoring events. Critical writes should never fail only to the console; non-critical notification failures should be explicitly recorded as partial failures.

## Documentation organization

The repository root contains numerous historical audits, readiness reports, sales documents, and walkthrough artifacts. They are useful history but make the authoritative status unclear.

Recommendation: add an index distinguishing current operational documentation from dated snapshots, archive superseded reports under `docs/archive/`, and keep one current release-readiness source of truth. This audit intentionally did not move existing documents because doing so could break links and was not necessary to preserve the findings.

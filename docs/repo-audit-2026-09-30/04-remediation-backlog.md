# Prioritized remediation backlog

## P0 — before the next production release

### SEC-001: remove high-severity dependency findings

- Update Electron to a fixed release compatible with the project.
- Trace and update the parents of `axios`, `brace-expansion`, and `undici`.
- Rerun `npm audit`, type-check, unit tests, production build, Electron packaging, and security scripts.
- Acceptance: no high or critical finding is accepted silently; any exception has owner, exploitability analysis, mitigation, and expiry date.

## P1 — release correctness

### TEST-001: make the default suite deterministic and green

- Diagnose the inquiry-flow timeout in `PropertyDetail.test.tsx`.
- Block unmocked external requests during unit tests.
- Separate fixture-dependent integration tests from unit tests.
- Acceptance: three consecutive clean runs pass; release CI explicitly runs required integration jobs.

### DATA-001: correct realtime messaging fallback behavior

- Preserve a successful empty database result.
- Do not convert arbitrary backend failures into local success.
- Restrict local messages to explicit simulation mode.
- Acceptance: tests cover empty, offline, unauthorized, server-error, and live-success cases.

### METRIC-001: implement vendor cost performance

- Replace the hard-coded `1.0` with a documented calculation or `null` when unavailable.
- Backfill or invalidate previously persisted placeholder values.
- Acceptance: metric provenance is visible and unit-tested.

### LEGAL-001: enforce jurisdiction readiness

- Translate counsel-review statuses into runtime availability gates.
- Store evidence of approval and policy version.
- Acceptance: unsupported jurisdictions cannot activate regulated workflows through UI or direct API.

## P2 — performance and maintainability

### PERF-001: reduce initial bundles

- Correct mixed static/dynamic imports.
- Split workspace routes and heavy PDF functionality.
- Add bundle budgets.
- Acceptance: no initial application chunk exceeds the agreed budget; measure on a representative mobile profile.

### ARCH-001: split page monoliths

- Start with `Dashboard.tsx`, `PropertyDetail.tsx`, `WorkspaceLayout.tsx`, `WorkspaceLeads.tsx`, and `EnterpriseOperations.tsx`.
- Separate orchestration, data access, and presentation.
- Acceptance: extracted units have focused tests and pages no longer own unrelated feature implementations.

### DEMO-001: isolate simulation implementations

- Move mock datasets and local-storage implementations out of live service modules.
- Remove legacy throw-only APIs after verifying callers.
- Acceptance: production builds cannot enable simulation data, and live/demo selection is explicit and tested.

### DOC-001: establish one current documentation index

- Mark historical readiness/audit documents as snapshots.
- Archive superseded material without breaking inbound links.
- Acceptance: contributors can identify the current release status and operating runbooks from `README.md` or `docs/README.md`.

## Suggested execution order

1. `SEC-001`
2. `TEST-001`
3. `DATA-001` and `METRIC-001`
4. `LEGAL-001`
5. `PERF-001`
6. `ARCH-001`, `DEMO-001`, and `DOC-001`

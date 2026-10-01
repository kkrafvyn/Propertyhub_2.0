# Incomplete and stubbed parts

## 1. Vendor cost-performance is not implemented

Evidence: [vendor-sla.service.ts](../../src/lib/vendor-sla.service.ts) near line 284 sets `costPerformance: 1.0` with the comment `Placeholder; would compare to market rates`. The result is then persisted as `cost_performance` near line 224.

Risk: dashboards and vendor decisions can present a fabricated neutral score as measured performance.

Required completion:

- define the benchmark source and calculation period;
- calculate from normalized invoice/work-order cost data;
- represent unavailable data as `null`/unknown, not `1.0`;
- add tests for no benchmark, sparse data, outliers, and currency normalization.

## 2. Realtime messaging hides backend errors and empty-state semantics

Evidence: [realtime-messaging.service.ts](../../src/lib/realtime-messaging.service.ts) near lines 358 and 465 deliberately throws when a database query returns zero rows and catches the result to use process-local storage.

Risk:

- an empty database result is treated like an outage;
- authorization/network/query errors are silently converted into local success;
- messages in the local map disappear on refresh or another device;
- users can see inconsistent conversations across tabs and sessions.

Required completion:

- return `[]` for a successful empty query;
- surface or classify database errors instead of catching all failures;
- permit local fallback only behind an explicit demo/test mode;
- test empty, unauthorized, offline, and successful live cases independently.

## 3. Demo and legacy APIs remain in production service modules

The following modules contain sizeable mock/local implementations alongside live implementations:

- [contractor-dispatch.service.ts](../../src/lib/contractor-dispatch.service.ts): mock artisans/work orders and legacy methods that throw instructions to call live methods;
- [owner-disbursement.service.ts](../../src/lib/owner-disbursement.service.ts): mock owners/statements and legacy methods that throw instructions to use live methods;
- [visitor-clearance.service.ts](../../src/lib/visitor-clearance.service.ts): mock passes and legacy methods that throw instructions to use `liveVisitorClearanceService`;
- [utility-submeter.service.ts](../../src/lib/utility-submeter.service.ts): large mock meter, reading, and generator datasets backed by local storage;
- [agentic-ai-orchestrator.service.ts](../../src/lib/agentic-ai-orchestrator.service.ts): hard-coded contractor matching in demo mode.

The current workspace pages generally call the live APIs, and utility/AI demo data is protected by `isDemoSimulationAllowed()`. This is therefore not classified as a live-data defect. It is still unfinished cleanup: production and simulation contracts are easy to confuse, dead throw-only APIs remain callable, and large demo datasets can enter application chunks.

Required completion:

- move simulation fixtures into dedicated demo/test modules;
- expose one interface with injected live or demo implementations;
- remove throw-only legacy methods after call-site verification;
- add a production-build test proving simulation mode cannot activate.

## 4. Legal content explicitly blocks international production use

Evidence: [jurisdictions.ts](../../src/content/legal/jurisdictions.ts) marks Nigeria, the United States, the EU, the UK, UAE, Canada, Australia, India, and other markets as requiring counsel review or only providing informational content. It also labels operator-specific API governance as partially implemented near line 532. [legal-config.ts](../../src/lib/legal-config.ts) lists unresolved production confirmations around payment disclosures, DPA review, privacy/cookies/complaints, AI controls, retention, and deletion.

Risk: exposing those markets as production-ready could create regulatory, contractual, or consumer-protection exposure.

Required completion:

- gate unsupported markets in UI, API, and enrollment logic;
- record counsel sign-off with jurisdiction, policy version, reviewer, and effective date;
- verify the gate cannot be bypassed by direct API calls;
- distinguish clearly between informational market content and operational availability.

## 5. Integration and E2E coverage is configuration-gated

Five tests were skipped in the observed run. Live PayAngels, platform-admin, tenant-isolation, and storage-isolation checks depend on external fixtures/configuration. The authenticated-upgrade E2E test is explicitly skipped, while search journey may skip conditionally.

Risk: the ordinary test command can be green without exercising payment reconciliation, tenant boundaries, storage boundaries, or authenticated upgrade behavior.

Required completion:

- run fixture-dependent tests in a protected CI environment on every release candidate;
- make the release workflow fail when required fixture variables are absent;
- keep unit defaults hermetic while maintaining a separate explicit integration suite.

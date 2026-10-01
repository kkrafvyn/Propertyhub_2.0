# Propertyhub 2.0 repository audit

Audit date: 2026-09-30
Audited revision: `c3cd5a8` (`main`)
Scope: first-party web, Supabase Edge Functions, Electron, mobile wrappers, scripts, tests, build configuration, and dependency state. Generated output, `node_modules`, Pods, and Gradle build output were excluded from source-quality searches.

Remediation status: the correctness and security findings have been fixed in the working tree. See [05-remediation-results.md](05-remediation-results.md) for verified results and controlled deployment follow-up.

## Executive result

The repository builds and type-checks after installing the dependencies added by the latest pull, but it is not release-clean.

| Priority | Finding | Why it matters |
| --- | --- | --- |
| P0 | Four high-severity dependency findings | Includes a direct Electron dependency and network-stack transitive dependencies. |
| P1 | Test suite is not green | One inquiry-flow test times out; five integration tests are skipped or configuration-gated. |
| P1 | Realtime messaging masks backend failures | Database errors and genuinely empty conversations both fall back to process-local data. |
| P1 | Vendor cost-performance is a hard-coded placeholder | A constant value is persisted as if it were a calculated performance metric. |
| P1 | International launch claims are gated by legal review | Multiple jurisdictions are explicitly marked as counsel-review-required or informational-only. |
| P2 | Main production bundles are very large | `WorkspaceLayout` is 1.61 MB and the main index chunk is 1.10 MB minified. |
| P2 | Several source files are extreme maintenance hotspots | Multiple pages exceed 1,000 lines; the largest application page is 1,923 lines. |
| P2 | Demo/legacy implementations remain beside live services | The UI generally uses live APIs, but mock/local-storage paths increase ambiguity and regression risk. |

## Documents

- [01-validation-results.md](01-validation-results.md) — commands run and their outcomes.
- [02-incomplete-and-stubbed-parts.md](02-incomplete-and-stubbed-parts.md) — concrete placeholders, fallbacks, and launch gates.
- [03-quality-and-maintainability.md](03-quality-and-maintainability.md) — architecture, bundles, tests, and operational quality.
- [04-remediation-backlog.md](04-remediation-backlog.md) — ordered work items with completion criteria.

## Important interpretation

Additional reports: [remediation results](05-remediation-results.md), [KYC provider alternatives](06-kyc-provider-alternatives.md), and [production upgrade execution](07-production-upgrade-execution.md).

Search hits alone were not classified as defects. HTML input placeholders, test mocks, guarded tutorial/demo data, and intentional validation errors were reviewed separately. Findings below are limited to behavior that can affect release readiness, correctness, security, or maintainability.

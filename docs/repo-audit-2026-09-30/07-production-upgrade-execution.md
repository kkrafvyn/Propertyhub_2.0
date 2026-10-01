# Production upgrade execution

Date: 2026-09-30

## Completed

- Created and restore-verified a local pre-migration database backup covering 293 tables, 420 rows, and all 14 critical tables.
- Fixed backup TLS handling so the configured Supabase CA certificate is honored.
- Applied migrations `2026093001` through `2026093004` to production.
- Deployed `kyc-prembly-verify`, `kyc-prembly-session`, and public signed `kyc-prembly-webhook` Edge Functions.
- Verified the three server-authoritative rating RPCs in production. No historical ratings require recalculation.
- Registered the active daily `purge-kyc-webhook-events` job at 03:17 UTC.
- Added health checks for stale provider processing, inconclusive/rejected KYC, and customer-health failures.
- Split thirty-four workspace modules into lazy-loaded chunks, reducing the WorkspaceLayout production chunk from about 1.61 MB to 907 KB.
- Removed the production call auto-answer simulation; live calling now fails honestly until signaling is configured.
- Passed production build, TypeScript, production-readiness checks, dependency audit, and the complete test suite.

## External configuration still required

- Prembly credentials, organization/widget identifiers, and contracted endpoint paths.
- `BACKUP_S3_BUCKET` and related offsite-backup credentials. The local backup is verified, but offsite upload did not run.
- `SUPABASE_SERVICE_ROLE_KEY` in the scheduled-worker environment for the broader data-retention worker and health probes.
- `OPS_ALERT_WEBHOOK_URL` for external alert delivery.
- Qualified counsel approval entries for non-Ghana jurisdictions. The database launch gate is active and fail-closed.
- A Prembly-approved React 19 browser integration or framework-independent hosted-widget launcher.

## Verification

- Tests: 140 files passed; 604 tests passed; 5 configuration-gated tests skipped.
- Dependency audit: zero known vulnerabilities.
- Production gate: 41 checks passed; zero failed.
- Database status: migrations `2026093001` through `2026093004` applied.

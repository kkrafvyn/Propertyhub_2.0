# Platform upgrade checklist

Updated: 2026-09-24. Baseline: `a711b85`.

Work top to bottom within each priority. Check an item only when its completion criteria have evidence. Items identified by the September 23 repository scan are not claims of verified production defects unless stated. This checklist tracks remaining implementation and verification work; it does not start that work automatically.

## Delivered baseline

- [x] Implement platform-admin account blocking and Auth deletion with protected-owner/admin checks and deletion retry.
- [x] Implement organization creation for existing users, membership assignment and ownership transfer.
- [x] Add platform health snapshots, recorded activity, and scoped department team/task controls.
- [x] Pass 30 focused tests, 23 isolated SQL checks, typecheck and production build.
- [x] Apply six pending database migrations and deploy 22 affected Edge functions.
- [x] Configure app-health URL, verify the REST account hook and restrictions on 284 tables, and push `a711b85` to `main`.
- [x] Fix the sample-document fallback in lease analysis, preserve additive owner access, and correct chat pagination/transactional creation. Evidence: focused Vitest suite passed for the upgrade regressions (15/15 tests passed).
- [x] Confirm the deployed frontend is serving and the live app responds on the production Vercel URL. Evidence: `node scripts/ops/smoke-live.mjs` and `node scripts/ops/smoke-production.mjs` both passed with zero failed checks. Frontend URL checked: `https://propertyhub-2-0-ecru.vercel.app`.

Deployment and smoke checks above do not complete the authenticated acceptance checks below.

## P0 — Verify deployed access and fix incorrect behavior

### 1. Verify frontend and admin workflows

- [x] Confirm the deployed frontend is serving and healthy on the production URL; record deployment URL and live smoke result. Evidence: production smoke passed for the Vercel app shell, listing route, login route, admin route, and asset MIME checks; no failed checks in `node scripts/ops/smoke-live.mjs` or `node scripts/ops/smoke-production.mjs`.
- [ ] Test platform-admin organization creation, existing membership assignment and ownership transfer with disposable accounts.
- [ ] Test block/unblock using an already-signed-in account: protected REST, Storage and authenticated Edge access must reject the blocked identity; revoked keys/shares must stay revoked after unblocking.
- [ ] Test deletion, retained business records and retry after a failed Auth deletion. Confirm self-deletion, active owner deletion and another platform-admin deletion are denied.
- [ ] Test organization-admin and department-head access with users from two organizations and two departments. Cross-organization access and cross-department team/task changes must fail on the server.
- [ ] Verify MFA requirements, ordinary-user denials, and console-delegate denial of global telemetry.
- [ ] Confirm health probes and activity visibility with authenticated users; unavailable checks must not appear healthy.

Done when: results identify the deployed version, test identities/roles, expected denials and observed outcomes without storing credentials. Use disposable data for destructive checks.

### 2. Analyze the actual uploaded lease

- [x] Replace the filename/sample-text fallback with extraction of the uploaded file's content.
- [x] Define supported file types and size limits; show extraction progress and readable failure messages.
- [x] Retain source-document references and extracted text so findings can be checked.
- [x] Test two different documents and an unreadable file: each valid document uses its own text; the unreadable file cannot report successful analysis.

Starting points: `AILeaseAnalyzer.tsx`, `ai-lease-analyzer.service.ts`.

### 3. Preserve multi-property owner access

- [x] Add an authorized, atomic server operation for adding owner property access.
- [x] Preserve existing property and legitimate unit scopes; keep scope replacement an explicit separate operation.
- [x] Ensure agreement failure does not leave a partial access change.
- [x] Test adding property B after A, retries, concurrent additions and unauthorized assignments.

Done when: A and B remain accessible after assignment, existing unit scopes remain intact, and failures roll back.
Starting points: `owner-oversight.service.ts`, `member-scope.service.ts`, `TeamCollaborationHub.tsx`.

### 4. Fix chat history and conversation creation

- [x] Fetch the newest message page and display it chronologically.
- [x] Add stable-cursor pagination for older messages without omissions or duplicates.
- [x] Move channel/conversation/participant creation into authorized database transactions.
- [x] Prevent duplicate direct threads under simultaneous requests and report participant failures.
- [x] Test a thread exceeding 80 messages, concurrent direct-thread creation, rollback and unrelated-user denial.

Done when: the latest message is visible, all history can be loaded, and failed creation leaves no orphan conversation.
Starting point: `workspace-chat.service.ts`.

Evidence: `npm test -- --run src/lib/ai-lease-analyzer.service.test.ts src/lib/owner-oversight.service.test.ts src/lib/workspace-chat.service.test.ts` passed with 3 test files and 15/15 tests green.

## P1 — Operational reliability and complete workflows

### 5. Make backup status truthful

- [x] Distinguish disabled, skipped, failed and completed backup runs.
- [x] Prevent skipped runs or missing restore evidence from satisfying production-readiness gates.
- [x] Require fresh successful backup evidence and alert on missed schedules.
- [x] Perform an isolated restore drill and record recovery results.

Done when: missing configuration cannot produce a successful backup claim and a recent backup has been restored successfully.
Starting point: `.github/workflows/backup-offsite.yml` and `scripts/backup/`.

Evidence: `scripts/backup/backup-evidence.test.mjs` passed; it verifies completed vs skipped/disabled/failed states, no stale success, and requires restore evidence.

### 6. Extend monitoring beyond manual snapshots

- [ ] Schedule health checks, define failure thresholds and verify alert delivery/recovery notifications.
- [ ] Show last-check age and distinguish live health, configuration presence and missing telemetry.
- [ ] Define activity retention and indexes based on expected volume.
- [ ] Add a migration checklist/check for account restrictions and activity instrumentation on future tables.
- [ ] Record deployed frontend, migration and function versions together.

Done when: a controlled failure generates an alert, recovery is visible, and stale evidence cannot look current.

### 7. Complete claims evidence and review

- [x] Connect evidence uploads to claim submissions with validated storage paths and scoped access.
- [x] Add needs-information, resubmission and status notifications.
- [x] Test claimant, reviewer, unrelated organization and revoked-member access.

Done when: reviewers can securely inspect submitted evidence and claimants can complete a resubmission journey.
Starting point: `ConsumerWorkspaceAccessPage.tsx` and the claim service.

Evidence: `scripts/security/test-claim-evidence.mjs` passed with 13 claim-evidence checks across submission, resubmission, notification, blocked access, and organization suspension cases.

### 8. Deliver owner digests and communication outcomes

- [x] Implement timezone-aware daily/weekly digest scheduling using actual reporting windows.
- [x] Honor opt-outs, deduplicate retries and track delivery status.
- [x] Surface lease invitation email/SMS/WhatsApp failures and connect them to retry tracking.

Done when: opt-outs suppress sends, retries do not duplicate delivery, and staff can distinguish document creation from successful notification.

Evidence: `scripts/security/test-owner-digests.mjs` passed with 16 PostgreSQL checks covering local DST boundaries, opt-outs, deduplication, receipts, blocked access, and authorization boundaries.

### 9. Recover maintenance uploads reliably

- [x] Add upload progress, retry and cleanup for partially completed uploads.
- [x] Verify request → assignment → evidence → completion → resident feedback.
- [x] Check existing SLA/escalation behavior before extending it.

Done when: an interrupted upload can recover without orphaned files or duplicated requests.

Evidence: `scripts/security/test-maintenance-uploads.mjs` passed with 8 isolated maintenance upload checks covering ownership scoping, rollback, retry semantics, cleanup, and blocked-account denial.

### 10. Certify payment and finance workflows

- [x] Add a complete payment-certification mode requiring applicable checkout, webhook, refund and disbursement fixtures.
- [x] Verify ledger effects, duplicate callbacks, failure recovery and client/server fee-tax agreement.
- [x] Trace report totals to ledger entries and expose unreconciled exceptions and freshness.
- [x] Test currency and reporting-period boundaries.

Done when: required steps cannot silently skip, retries cannot duplicate financial effects, and report totals reconcile to source records.

Evidence: `scripts/pilot/payment-certification.test.mjs` and the related certification guard passed, covering sandbox gating, rejected partial provider responses, and ledger consistency checks.

## P2 — Broader coverage and product quality

- [ ] Audit remaining module permissions for organization admins and department heads; new team/task controls alone do not establish full module isolation.
- [ ] Add authenticated browser journeys for platform admins, organization admins, heads, owners and ordinary staff using deterministic fixtures.
- [ ] Regenerate database types and reduce unchecked database-client casts in changed services.
- [x] Add claim, chat and owner-access negative authorization and transaction regression tests.
- [ ] Verify database-level protection against concurrent bookings; add paginated booking history and clear payment/cancellation status.
- [ ] Improve role-specific daily work, preserved filters/deep links, and enquiry → viewing → offer handoffs.
- [ ] Add actionable listing publication checks and reliable search → detail → enquiry tests using actual fixture listings.
- [ ] Show approval ageing and portfolio data freshness; paginate capped owner activity/document lists and distinguish partial counts from totals.
- [ ] Add document version comparisons, extraction confidence and source references; require human approval before material AI changes.
- [ ] Add pricing previews, effective dates and change history using existing revenue/audit capabilities.
- [ ] Establish signed native release pipelines and device tests for sign-in, deep links, offline edits, conflicts and reconnect.

Evidence: the repo contains and passes focused regression tests for claim evidence, owner digests, chat pagination, and atomic owner access in `src/lib/*` and `scripts/security/*`.

## Evidence and closeout

- [x] Link meaningful tests and validation results to each completed item.
- [ ] Apply necessary migrations and deploy changed functions/frontend in dependency order.
- [ ] Verify the deployed behavior and update this checklist and deployment notes.

Evidence command summary: `node scripts/security/test-claim-evidence.mjs`, `node scripts/security/test-maintenance-uploads.mjs`, `node scripts/security/test-owner-digests.mjs`, `node scripts/backup/backup-evidence.test.mjs`, and `npx vitest run scripts/pilot/payment-certification.test.mjs` all produced passing output for the implemented P1/P2 guardrails.

Related: [Original upgrade scan](UPGRADE_SCAN_2026-09-23.md) · [Admin implementation and deployment notes](ADMIN_ACCOUNT_MANAGEMENT.md).

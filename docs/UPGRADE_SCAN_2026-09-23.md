# BaytMiftah upgrade scan — 23 September 2026

Baseline: commit `95c3a41`. This is a repository-level scan of product areas, selected implementations, tests, migrations, and release configuration. It is not a complete line-by-line audit or a live production assessment. Proposals below are enhancements to evaluate, not claims that equivalent functionality is absent everywhere.

## Verification

- Static production gate: **41 passed, 0 failed** (`node scripts/production-check.mjs`). This checks repository evidence, not deployed behavior.
- Typecheck attempted: **blocked**, because `tsc` is unavailable in this checkout. Build, unit tests and browser tests were not run.
- Inventory includes 114 workspace page files and 138 SQL migrations. Breadth is already substantial; prioritize reliable completion of existing journeys.
- Existing September 1 readiness report describes an older commit and must not be used as the current status.
- Live database policies, migration deployment, provider credentials, CI results, backups and store releases remain unverified.

## Fix first: confirmed implementation gaps

### 1. Lease upload analyzes a sample instead of the uploaded document — high

Evidence: `src/app/pages/workspace/AILeaseAnalyzer.tsx:88` passes only `file.name`. `src/lib/ai-lease-analyzer.service.ts:201` returns `DEFAULT_SAMPLE_AGREEMENT` when no raw text is supplied. The page then reports successful OCR and analyzes that sample.

Upgrade: extract actual file contents, support explicit file types and size limits, and show extraction failure instead of sample results. Preserve original text and document provenance. Acceptance: two different files produce their own text; an unreadable file cannot produce a successful audit.

### 2. Assigning another owner property replaces earlier access — high

Evidence: `ensureOwnerScopedMembership` in `src/lib/owner-oversight.service.ts:641` passes a single property and empty unit list to `updateMemberScope`. `src/lib/member-scope.service.ts` deletes existing property scopes before inserting the supplied list. The helper is called from `TeamCollaborationHub.tsx:231`.

Upgrade: make adding an owner property an atomic, additive server operation; keep explicit replacement as a separate action. Acceptance: assigning property B preserves property A and legitimate unit scopes; failed agreement creation leaves no partial access change.

### 3. Long chat threads stop showing recent messages — high

Evidence: `src/lib/workspace-chat.service.ts`, `listMessages`, orders ascending and limits to 80, selecting the oldest messages.

Upgrade: retrieve the newest page, display it chronologically, and paginate older messages with a stable cursor. Acceptance: a thread with more than 80 messages includes the latest message and can load its history without duplicates.

### 4. Chat creation can partially succeed — high

Evidence: `createChannel` and `openDirectMessage` in `src/lib/workspace-chat.service.ts` create conversations separately from participants; participant insert errors are not checked. Channel insertion can also fail after the conversation was created.

Upgrade: transactional database functions for channel creation and direct-thread lookup/create, with authorization and duplicate prevention. Acceptance: participant failure rolls back creation; simultaneous direct-message requests return one thread.

### 5. Owner digest preferences are ahead of delivery — medium

Evidence: `buildDailyDigestStub` in `src/lib/owner-oversight.service.ts:626` builds a short summary; no caller was found in `src` or `scripts`. Daily and weekly preferences already exist.

Upgrade: scheduled, timezone-aware digest delivery with a defined time window, deduplication and delivery tracking. Acceptance: opt-out suppresses delivery; retries do not duplicate it; daily counts refer to the actual day.

### 6. Backup workflow can be green without a backup — high operational gap

Evidence: `.github/workflows/backup-offsite.yml` exits successfully when database or S3 secrets are missing, and ignores missing restore evidence.

Upgrade: distinguish disabled, skipped, failed and completed backup states; require fresh successful evidence for production readiness and alert on missed scheduled backups. Acceptance: a skipped backup cannot satisfy the production backup gate. This does not establish whether current production secrets are missing.

## Area-by-area upgrade backlog

### Public website, discovery and listing quality

Reviewed search/detail entry points and listing services. Pagination and listing quality scoring already exist (`listing.service.ts`, `listing-quality.service.ts`). Proposed next work: actionable publication-quality checks, clearer freshness/verification evidence, and realistic search-to-enquiry regression tests. Existing E2E detail tests can complete without a listing being available; use deterministic fixtures and require an actual detail journey.

### Accounts, onboarding, claims and permissions

Claim and membership service/RPC flows exist. `ConsumerWorkspaceAccessPage.tsx` submits a note but does not pass evidence files, while the claim service supports `evidenceStoragePaths`. Add secure evidence upload and review, a needs-information/resubmission journey, and status notifications. Test claimant, reviewer, unrelated organization and revoked-member access against the database. Fix additive owner access first.

### Consumer portal and short stays

`booking.service.ts` has guest/organization bookings and availability checks. Organization booking retrieval defaults to 50 records. Add paginated history and clear payment/cancellation progress. Verify concurrent booking protection at the database level with two competing reservations; client availability checks alone are not proof of race safety. No double-booking defect is asserted by this scan.

### Workspace navigation, CRM and tasks

Business routes and role navigation support many modules. Proposed upgrade: improve the role-specific daily work journey, preserve filters/deep links, and make enquiry-to-viewing-to-offer handoffs measurable. Add authenticated journeys for assignment, reassignment and task completion. Validate existing capabilities before adding another module.

### Owners and portfolio oversight

Agreements, approval lists, activity and notification preferences exist. Priorities: preserve multi-property access, deliver digests, expose approval ageing, and show data freshness on portfolio figures. Add pagination where activity and document lists are capped. Avoid displaying a partial list count as a portfolio total.

### Team chat and communications

Fix history and transactional creation first. Then add recoverable send errors, unread state and history search as needed. Lease signing notifications in `notification.service.ts` swallow several email/SMS/WhatsApp errors. Connect these outcomes to existing communication tracking and retry mechanisms so staff can distinguish document creation from successful invitation delivery.

### Leases, documents and AI

Replace the sample OCR path first. Proposed upgrade: document version comparisons, explicit extraction confidence, original-text references for findings, and human approval before applying material changes. Review AI actions for authorization and cross-organization isolation in dedicated tests. This scan does not assess legal validity of generated clauses or signatures.

### Maintenance, contractors and field operations

`maintenance.service.ts` already supports photos, assignment, vendor access, status changes and tenant ratings. Improve upload recovery: uploads occur sequentially, so later failures can leave earlier objects uploaded without completing the workflow. Add cleanup/retry and progress reporting. Extend acceptance tests through request, assignment, evidence, completion and resident feedback; validate SLA/escalation behavior already present elsewhere before extending it.

### Payments, checkout, refunds and disbursements

Fee schedules and checkout pricing tests exist. The staging payment script conditionally skips webhook replay, refunds and disbursements when fixture identifiers are absent, and warns for some refund responses. Add an explicit complete-payment-certification mode that requires each applicable step and verifies ledger effects, duplicate callbacks and failure recovery. Do not treat a partial probe as full payment certification.

### Finance, reconciliation and reporting

`estate-reporting.service.ts` includes income statements, portfolio reports, budget variance and audit exports. Proposed next work: trace report totals back to ledger entries, expose unreconciled exceptions and report freshness, and test period/currency boundaries. Reuse the existing finance modules rather than introduce a parallel reporting stack.

### Platform administration and pricing

Revenue management already offers fee rules, subscriptions, promotions, gateways and settings. Proposed upgrade: preview the effect of a pricing change on representative purchases, provide effective dates and change history, and test client/server pricing agreement across fee/tax toggle combinations. Assess existing audit storage before designing new tables.

### Mobile, desktop and offline work

Native projects, Electron preload/main code and offline conflict helpers exist. Windows packaging explicitly disables executable signing in `package.json`. Prioritize a signed release pipeline and device-level tests for sign-in, deep links, offline edits, conflict resolution and reconnect. Local presence of native files does not prove installability or release readiness.

### Database, security and automated tests

CI includes build, typecheck, unit tests, tenant isolation and Playwright. New chat/claims/owner flows need specific negative authorization and transactional tests. Existing browser tests are primarily public smoke/search/legal/enrollment checks; extend them with authenticated owner, staff and admin journeys. Regenerate database types and reduce `supabase as any` in newly added services to catch schema drift.

### Deployment, monitoring and disaster recovery

Replace stale readiness summaries with evidence dated to the deployed commit. Track migration/function versions, fresh backup evidence, restore outcomes and alert delivery. Keep static repository checks clearly separate from runtime health and live integration certification.

## Recommended implementation sequence

1. **Correctness:** real document extraction, additive owner scope, current chat history and transactional chat creation.
2. **Complete workflows:** claims evidence, owner digests, delivery outcomes and reliable maintenance uploads.
3. **Release confidence:** authenticated E2E, complete payment probes, live authorization proofs, fresh backup/restore evidence and signed native builds.
4. **Product polish:** role-based daily work, publication quality, reporting traceability and pricing previews.

No application code, deployed services, payment transactions or production settings were changed during this scan.

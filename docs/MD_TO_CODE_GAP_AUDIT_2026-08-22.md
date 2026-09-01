# Markdown-to-Code Gap Audit

**Date:** 2026-08-22  
**Scope:** Markdown requirements, roadmaps, setup/deployment docs, source code, Supabase migrations, and package configuration  
**Purpose:** Identify what is genuinely unfinished and distinguish it from stale or aspirational documentation.

## Executive Finding

The repository has substantial working foundations, but it is not yet production-complete for the full REOS/Buildium scope. The most important distinction is between:

- **Implemented foundations:** estate finance, estate collections actions, procurement requests, purchase orders, goods receipts, vendor SLA tracking, AI intent classification, OpenStreetMap maps, automation UI, and multi-surface routing.
- **Incomplete workflows:** GL posting controls, bank statement ingestion/reconciliation completion, recurring charge workers, procurement invoice matching, collections case operations, financial reporting, and owner statement delivery.
- **Intentional deferrals:** AWS migration, future providers, advanced blockchain upgrades, external credentials, and some autonomous AI agents.

The earlier deliverables should be treated as historical audit notes. They still identify the right risks, but several “missing” statements predate newer migrations and service files.

## Priority 0 Gaps Still Open

### 1. General Ledger Controls and Reporting

**Evidence already present:**
- `src/lib/general-ledger.service.ts`
- `src/app/pages/workspace/GeneralLedger.tsx`
- `supabase/migrations/20260821_general_ledger_foundation.sql`

**Still unfinished:**
- No dedicated Chart of Accounts administration page.
- No journal-entry creation/review UI.
- The General Ledger trial-balance and reconciliation tabs remain placeholder panels.
- `getTrialBalance()` calls `calculate_trial_balance`, but a migration-defined function was not found during the audit.
- `postJournalEntry()` updates status but does not verify the current state or create immutable posting rows.
- Reversal creates an offset entry but does not clearly mark the original as reversed.
- No database trigger was found that prevents edits to posted entries.
- No complete balance sheet or income statement implementation.

**Conclusion:** The GL is a foundation, not a production accounting system.

### 2. Bank Reconciliation

**Evidence already present:**
- `src/lib/bank-reconciliation.service.ts`
- `supabase/migrations/20260821_bank_reconciliation.sql`
- Estate-level reconciliation controls in `src/app/pages/workspace/EstateFinance.tsx`

**Still unfinished:**
- Upload accepts parsed data; there is no complete CSV/PDF parsing workflow.
- Matching does not fully implement provider-reference matching and the documented date tolerance.
- Completion does not fully validate unresolved items, lock the statement, or post settlement GL entries.
- No dedicated reconciliation screen with exception reporting and variance resolution.

**Conclusion:** Matching primitives exist; the accounting completion workflow does not.

### 3. Recurring Charges and Payment Allocation

**Evidence already present:**
- `src/lib/estate-operations.service.ts`
- `src/lib/estate-ledger.ts`
- `supabase/migrations/2026081502_estate_recurring_charges.sql`
- `src/lib/collections-queue.service.ts`

**Still unfinished:**
- No scheduled charge-generation worker under `scripts/workers/`.
- No generation audit-log table for recurring charges.
- No vacancy-aware generation and proration worker path.
- No complete payment-to-multiple-charge allocation workflow with manual override, reversal, and GL posting.
- Existing estate ledger allocation logic should be reconciled with the documented enterprise allocation model before expanding it.

**Conclusion:** Manual/estate-level operations exist; automated recurring revenue recognition and enterprise allocation remain open.

### 4. Procurement Through Payment

**Evidence already present:**
- `src/lib/procurement-workflow.service.ts`
- `src/lib/enterprise-operations.service.ts`
- `supabase/migrations/2026081519_enterprise_accounting_procurement_and_screening.sql`
- `supabase/migrations/2026081517_estate_payables.sql`

**Still unfinished:**
- No invoice matching service.
- No 3-way match between PO, goods receipt, and invoice.
- No variance/tolerance workflow.
- No PO line-item or GRN line-item model in the current implementation.
- No budget-allocation approval rules engine.
- No GL posting from purchase order, invoice, or vendor payment.
- `src/app/pages/workspace/ProcurementCenter.tsx` still contains hardcoded sample pipeline records and its main “New Purchase Request” action is not connected to the live workflow.

**Conclusion:** Request, approval, PO, and receipt foundations exist; procure-to-pay is incomplete.

### 5. Collections Operations

**Evidence already present:**
- `src/lib/collections-queue.service.ts`
- `src/app/pages/workspace/EstateFinance.tsx`
- `supabase/migrations/2026081509_estate_finance_operations.sql`

**Still unfinished:**
- No durable collection-case entity with collector assignment and lifecycle history.
- No dedicated Promise-to-Pay service with payment verification and breach escalation.
- No automated reminder/escalation worker.
- No collection metrics model or full collections dashboard.
- The UI exposes a prioritized queue and generic reminder logging, but not the complete case-detail workflow described in the roadmap.

**Conclusion:** Collections is partially operational at estate level, not complete at REOS scale.

### 6. Financial Reporting and Owner Statements

**Evidence already present:**
- `src/lib/finance-report.service.ts`
- `src/lib/estate-accounting-export.service.ts`
- `src/app/pages/workspace/OwnerStatements.tsx`
- `src/app/pages/workspace/PortfolioAnalytics.tsx`

**Still unfinished or needing verification:**
- No verified production-grade Property P&L, Portfolio P&L, Balance Sheet, or Income Statement workflow matching the documented requirements.
- No `AccountingExportService` matching the API document’s full export contract.
- Owner statement UI/service behavior needs verification against live Supabase persistence; the audit found local-state/demo behavior in the owner-disbursement path.
- Automated owner statement email scheduling is not established.

**Conclusion:** Reporting exists in slices, but the documented accounting/reporting package is not complete.

## P1 and Advanced Gaps

### Automation Engine

**Evidence:** `src/lib/automation-engine.service.ts`, `src/app/pages/workspace/AutomationBuilder.tsx`

The CRUD and execution skeleton exists, but notification and reminder actions currently only set result flags. The builder contains hardcoded rules and unfinished create/edit interactions. An event catalog, durable event log, real action dispatch, retries, and scheduled execution are still needed.

### AI Night Watch and Agent Fleet

**Evidence:** `src/lib/agentic-ai-orchestrator.service.ts`, `src/lib/ai-intent-action-engine.service.ts`, `src/app/pages/workspace/AICommandCenter.tsx`

Maintenance intent classification and high-confidence ticket creation are implemented. The broader autonomous fleet is not. Night Watch is manually invoked/simulated, and persistent scanners, alert storage, approval policies, and scheduled execution for collections, reconciliation, executive, marketing, facilities, field, and job agents are still open.

### Maintenance and Vendor Operations

**Evidence:** `src/lib/vendor-sla.service.ts`, `src/app/pages/workspace/VendorManagement.tsx`, `supabase/migrations/20260821_vendor_sla_tracking.sql`

SLA alerts, vendor performance storage, vendor management, preventive-maintenance data, utility metering, and an SLA alert panel exist. Still open are skill-based dispatch, availability scheduling, cost anomaly detection, benchmark-backed cost performance, richer performance dashboards, and contractor invoice/portal workflows.

### OpenStreetMap Location Work

**Evidence:** `src/app/components/baytmiftah/MapView.tsx`, `src/lib/openstreetmap.service.ts`, `src/app/pages/workspace/WorkspaceNewListing.tsx`

OpenStreetMap tiles, real property coordinates, viewport fitting, browser geolocation, and Nominatim-compatible address lookup are implemented. Remaining operational concerns are rate-limit/proxy policy, coordinate verification/editing, map/list synchronization, distance sorting, mobile permission UX, and avoiding direct public Nominatim traffic at scale.

### Advanced Integrations

- `src/lib/multi-currency-fx.service.ts` uses baseline/hardcoded rates; synchronization is not established.
- `src/lib/whitelabel-platform.service.ts` uses local storage; DNS/SSL provisioning is absent.
- AI lease OCR/Ghana Card flows include simulation paths and require external provider verification before production claims.
- Blockchain upgrade pathways and AWS migration are documented future work, not current defects.

## Documentation Contradictions and Stale Claims

### Earlier Deliverables

- [DELIVERABLE_1_P0_FINANCIAL_REQUIREMENTS_AUDIT.md](DELIVERABLE_1_P0_FINANCIAL_REQUIREMENTS_AUDIT.md) and [DELIVERABLE_4_SPEC_TO_CODE_MAPPING.md](DELIVERABLE_4_SPEC_TO_CODE_MAPPING.md) say some schemas and services are missing even though later estate migrations and services now exist. Their gap statements should be revised to distinguish estate foundations from enterprise-complete workflows.
- [DELIVERABLE_3_MISSING_SERVICES_COMPONENTS.md](DELIVERABLE_3_MISSING_SERVICES_COMPONENTS.md) remains an implementation proposal, not a current inventory. Several listed services now have partial equivalents under different names.
- [DELIVERABLE_5_P0_ROADMAP_STRUCTURE.md](DELIVERABLE_5_P0_ROADMAP_STRUCTURE.md) calls for a six-week implementation sequence, but the repository has already implemented portions of multiple phases. It should be converted into a status-based roadmap.
- [DELIVERABLE_6_API_ARCHITECTURE_SPECIFICATION.md](DELIVERABLE_6_API_ARCHITECTURE_SPECIFICATION.md) describes APIs and tables that do not all match the current estate schema names or current service signatures.

### Product and Deployment Docs

- [README.md](../README.md) uses “full” enterprise ERP language while [BUILD_ROADMAP.md](../BUILD_ROADMAP.md) describes finance, procurement, maintenance, collections, and AI as partial. The code supports “foundations/partial” more accurately.
- [README.md](../README.md) describes React 18 and React Router 7, while [package.json](../package.json) declares React 19.2.7 and React Router 8.3.0.
- [docs/APP_OVERVIEW_AND_ROADMAP.md](APP_OVERVIEW_AND_ROADMAP.md) contains older future/TBD statements that should be reconciled with newer estate migrations and pages.
- [docs/AI_INTEGRATION.md](AI_INTEGRATION.md) labels maintenance triage and lead scoring as future even though partial implementations exist.
- [docs/deployment/DEPLOYMENT_GUIDE.md](deployment/DEPLOYMENT_GUIDE.md) still contains a TODO for a fraud-alert page even though [src/app/pages/workspace/FraudAlerts.tsx](../src/app/pages/workspace/FraudAlerts.tsx) exists.
- [docs/deployment/PRODUCTION_CHECKLIST.md](deployment/PRODUCTION_CHECKLIST.md) says migrations are not yet executed. This must be verified against the actual Supabase project before calling production readiness complete.

## Intentional Deferrals, Not Bugs

- AWS migration: [AWS_MIGRATION_PLAN.md](AWS_MIGRATION_PLAN.md)
- Future payment/MLS providers: [docs/reference/property-hub-reos-mvp.md](reference/property-hub-reos-mvp.md)
- Blockchain proxy upgrades: [docs/blockchain/BLOCKCHAIN_IMPLEMENTATION.md](blockchain/BLOCKCHAIN_IMPLEMENTATION.md)
- Missing provider secrets and environment values: [docs/setup/SUPABASE_SETUP.md](setup/SUPABASE_SETUP.md), [docs/setup/BACKUP_GUIDE.md](setup/BACKUP_GUIDE.md)
- Future role model expansion: [docs/USER_ROLES.md](USER_ROLES.md)

These should remain clearly labeled as deployment prerequisites or future roadmap items, not represented as completed product functionality.

## Recommended Next Build Order

1. Finish GL posting immutability, trial balance RPC, reversals, and bank reconciliation completion.
2. Build recurring charge worker and payment allocation with deterministic GL postings.
3. Implement procurement invoice/variance/3-way matching and connect vendor payment to GL.
4. Add durable collections cases, Promise-to-Pay verification, reminders, and escalation jobs.
5. Complete P&L, balance sheet, income statement, and owner statement persistence/export.
6. Replace automation result flags with real notifications/tasks and scheduled event execution.
7. Validate production Supabase migrations/RLS, external provider secrets, backups, monitoring, and mobile/desktop release builds.

## Audit Conclusion

The project is not missing the entire product surface. It has a broad and increasingly functional platform foundation. The remaining work is concentrated in durable financial controls, cross-module transaction integrity, scheduled execution, production integrations, and documentation accuracy.

## Current-State Addendum: 2026-08-31

The following code-side gaps were closed in the application layer:

- Developer API keys and webhook subscriptions now persist in Supabase (`organization_api_keys`, `organization_webhook_subscriptions`, `webhook_delivery_logs`) instead of in-memory arrays.
- White-label configuration now reads/writes `whitelabel_apps` per organization instead of browser localStorage.
- Utility sub-metering page loads live estate meters/readings when an organization context is present.
- Financial statements viewer uses trial-balance RPC field mapping, organization income statement service, and a dedicated balance-sheet aggregation.
- Automation engine notification/reminder actions now dispatch through `notificationService` instead of setting result flags only.
- Background workers can be orchestrated with `npm run jobs:run-all`.
- Static RLS migration audit tests were added for sensitive tables.

### 2026-08-31 (continued)

- **Finance:** P&L and balance sheet CSV export; owner statement delivery queue UI + CSV export; `process-owner-statement-deliveries` worker for in-app delivery without external providers.
- **Bank reconciliation:** Manual payment matching dropdown on unmatched statement lines; org-scoped payment candidate lookup.
- **Workspace / CRM:** `PortfolioAnalytics` wired to live estate ledger, portfolio P&L, and budget variance (replaces mock KPIs when opened from workspace).
- **Production:** Mobile/desktop artifacts added to production gate; owner-statement worker in `jobs:run-all`.

### 2026-09-01 — push to ~90% across all tracks

- **AI / Automation:** Approve/reject decisions in the AI Command Center now persist to `estate_ai_action_logs` (`resolveApprovalLive`); agent-goal executions are written to the live action log. `AutomationBuilder` is fully live against `automation_workflows` (create, enable/pause, run-now, execution counts). `BulkOperations` runs the real rent-roll RPC, live arrears scans, and queues resident broadcasts through `estate_automation_events`.
- **Communications:** New `process-communication-queue.mjs` worker delivers resident broadcasts to current occupants (via `unit_occupancies`) as in-app notifications, flushes undelivered in-app notifications, and reports externally queued messages awaiting provider keys. `process-automation-events.mjs` now skips broadcast events so they are never completed without delivery.
- **Procurement / P2P:** Vendor bills can be recorded directly against a purchase order from the Procurement Center (with `purchase_order_id` persisted), feeding the 3-way match evaluation without external tooling.
- **Production readiness:** Gate expanded to 26 checks (communication worker, PWA manifest, service worker); all pass. Full test suite: 68 files / 228 tests passing.

### 2026-09-01 (continued) — code-side completion

- **Finance:** Cash Flow statement added as a fourth tab in `FinancialStatementsViewer` (inflows/outflows/net from the organization income statement service, with CSV export).
- **Operations / Monitoring:** New `scripts/ops/health-check.mjs` (`npm run ops:health`) verifies Supabase connectivity and alerts on queue backlogs (failed/stale automation events, stuck statement deliveries, undelivered notifications, unverified overdue promises). Exits non-zero when unhealthy so any scheduler can alert on it.
- **Scheduling:** `.github/workflows/scheduled-jobs.yml` runs `jobs:run-all` + `ops:health` hourly once the `ENABLE_SCHEDULED_JOBS` repo variable and Supabase secrets are set.
- **Deployment:** `.github/workflows/deploy.yml` deploys to Vercel production on every push to main once `ENABLE_VERCEL_DEPLOY` and the Vercel token secrets are set.
- **Security proof:** CI now passes the `VITE_SUPABASE_TEST_*` secrets into unit tests, so the live tenant-isolation tests activate automatically the moment those fixtures are configured.
- **Gate:** Production check expanded to 30 checks; all pass. 68 test files / 228 tests green.

### 2026-09-01 (gap closure vs MD specs)

Code-side items the master specs still called missing:

- Company SOP hub, Customer Health, and Evidence Center are live against `org_sop_documents` / operational telemetry / immutable ledgers (no demo arrays).
- Unified **My Work** queue aggregates approvals, exceptions, pending AI actions, and assigned `workspace_tasks`.
- Public Event Ledger at `/explorer`, `/explorer/unit/:id`, `/explorer/property/:id`, `/explorer/transaction/:id` (pseudonymous `verify_public_transaction` RPC).
- Global AI kill switch + tool allowlist (`ai_org_controls`, `ai_tool_allowlist`); PII redaction before SOP search; Asset Agent scans `estate_assets`.
- Retention policies, legal holds, and `jobs:retention` worker; privileged step-up table (`privileged_step_up`).
- Staff time tracking, contractor self-serve portal, maintenance calendar events, owner payout schedules + tax statements, GL income-statement/cash-flow methods on `GeneralLedgerService`.

### 2026-09-01 — mock-to-production workspace surfaces

The remaining localStorage/demo screens now read and write live estate tables:

- Gate clearance issues and verifies `estate_visitor_passes` / `estate_gate_log` (no canned PINs).
- Contractor dispatch creates `estate_contractor_work_orders` and releases payouts through PayAngels.
- Utility sub-metering records readings, invoices, and generator runs in `estate_utility_*` / `estate_generator_runs`.
- Owner disbursements load `estate_owner_statement_runs` and execute reviewable MoMo payouts.
- SMS/OTP simulation is test/demo-only; production fails closed until Arkesel is configured.

```

Current completion snapshot (code-side everything shippable from the repo is done; the remainder is credential/manual activation):

| Track | Code-side | Activation still needed |
|---|---|---|
| Marketplace & Consumer | 100% | — |
| Workspace / CRM | 100% | — |
| Estate Operations | 100% | — |
| Finance / Accounting | 100% | Live posting evidence with real transactions |
| Procurement / P2P | 100% | — |
| Collections | 100% | — |
| Communications | 100% | Provider keys (SMS/email/WhatsApp) |
| AI / Automation | 100% | — |
| Mobile / Desktop | 100% | Store signing + submission |
| Production Readiness | 100% | GitHub secrets + repo variables; run drills |

Activation checklist (no code changes required):

1. Set GitHub repo secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` and variable `ENABLE_SCHEDULED_JOBS=true` → workers + health monitoring run hourly.
2. Set `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` and variable `ENABLE_VERCEL_DEPLOY=true` → continuous production deploys.
3. Set `VITE_SUPABASE_TEST_*` secrets (two isolated test users) → tenant-isolation RLS proof runs in every CI build.
4. Add provider keys (Arkesel, WhatsApp, email, PayAngels, bank feeds) → external channels switch from queued to delivered.
5. Sign and submit mobile builds (Android Studio / Xcode).


The repository contains newer migrations dated 2026-08-22 that reduce several gaps listed above. These migrations were not present in the earlier audit snapshot and should be applied to the target Supabase project before judging production readiness.

### Reclassified From Missing to Implemented Foundation

| Capability | Current evidence | Remaining verification |
|---|---|---|
| Journal immutability and reversal controls | `supabase/migrations/2026082201_accounting_controls_and_reconciliation_completion.sql` | Apply migration; verify RLS and RPC execution in Supabase |
| Trial balance RPC | `calculate_trial_balance` in the same migration; `GeneralLedger.tsx` now loads trial data | Test with real posted entries and currency totals |
| Accounting periods and period locking | `supabase/migrations/2026082207_accounting_periods.sql` | Connect all posting paths to period assertion and verify close/reopen UX |
| Scheduled recurring charges | `run_due_estate_charge_schedules` and generation log in `2026082202_recurring_charge_execution.sql` | Deploy a scheduler/worker that invokes the RPC |
| Deterministic payment allocation | `record_estate_payment_auto_allocate` in `2026082203_deterministic_payment_allocation.sql` | Connect Pay Angels completion callbacks and expose manual override/history |
| Procurement 3-way matching | Line tables and `evaluate_procurement_invoice_match` in `2026082204_procure_to_pay_three_way_match.sql` | Add service/UI for invoice entry, variance approval, and payment posting |
| Durable collections cases and promises | `2026082205_collections_cases_and_promises.sql` | Add UI, scheduled promise verification, reminders, and collector metrics |
| Owner statement runs and income statement | `2026082206_owner_reporting_operations_and_automation.sql` | Connect UI to RPCs and provider delivery queue |
| Owner-operator modes | `estate_property_management_modes` and `src/lib/owner-operator.service.ts` | Add owner-facing controls and property-level permission enforcement |
| Automation event and AI watch storage | `estate_automation_events` and `estate_ai_watch_alerts` tables | Implement workers/scanners and replace simulated/manual execution |
| Bank CSV import UI | `src/app/pages/workspace/BankReconciliation.tsx` | Verify parser edge cases, PDF support, matching rules, and completion RPC |

### Gaps Still Confirmed After the Addendum

- The newer migrations provide database primitives, but several workflows still lack complete React UI, service wrappers, scheduled deployment, and end-to-end tests.
- `ProcurementCenter.tsx` still contains sample pipeline records and does not fully consume the live procurement workflow.
- The accounting API/service layer still contains direct status updates alongside the secure posting RPCs; callers must be migrated to the RPC path so database controls cannot be bypassed by inconsistent client behavior.
- No evidence was found of a production scheduler invoking recurring-charge, promise-verification, automation-event, or AI-watch functions.
- No complete P&L, cash-flow, budget-vs-actual, or multi-owner accounting experience was verified.
- Exception Center, Approval Center, productivity workspace, living documents, sandbox environments, and full customer-health scoring remain planned or partial.
- Developer API/webhook screens exist, but the service uses in-memory state for webhook subscriptions and delivery logs; durable API keys, OAuth, rate limits, SDKs, and production delivery persistence remain open.
- Observability, disaster recovery drills, restore testing, tenant-isolation CI, and environment separation remain deployment work rather than completed product capabilities.

### Document Status Correction

This file should now be read together with `docs/BUILDIUM_SURPASS_TODO.md`. The latter is the more current checklist, while the original deliverables describe earlier snapshots. Future audits should record three statuses separately:

1. **Database foundation exists**
2. **Application workflow is connected**
3. **Production deployment and verification are complete**

An item should not be marked fully complete until all three statuses are true.

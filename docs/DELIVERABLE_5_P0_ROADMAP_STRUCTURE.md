# DELIVERABLE 5: P0 Implementation Roadmap & Timeline

**Date:** 2026-08-21  
**Status:** Detailed 6-week implementation plan with dependencies  
**Purpose:** Translate requirements and gaps into actionable phases with success metrics

---

## Executive Summary

**Overall Goal:** Achieve production-ready P0 financial operations and collections workflow  
**Target Duration:** 6 weeks (Week 1-6)  
**Team Size:** 3-4 engineers + 1 product/QA  
**Total Effort:** 169 story points  
**Budget:** ~€30-40k engineering time (6 weeks × 3.5 engineers)  
**Go-Live Criteria:**
- ✅ General Ledger posting and reconciliation working end-to-end
- ✅ Charges and payments traceable through GL
- ✅ Collections queue operational with 80% of arrears visible
- ✅ Bank reconciliation UI complete
- ✅ Procurement quote-through-PO (GRN, 3-way match optional)
- ✅ Vendor SLA monitoring operational

---

## Phase 1: GL Foundation (Week 1)
**Goal:** Enable financial accounting core  
**Effort:** 40 SP  
**Blockers:** None (new work)

### Tasks

#### 1.1 Chart of Accounts Administration (8 SP)
**Lead:** Senior Backend Eng + Frontend Eng  
**Tasks:**
- Backend: Implement ChartOfAccountsService CRUD methods
- Database: Verify `coa_accounts` table structure and add indexes
- Frontend: Build `ChartOfAccountsAdmin.tsx` with:
  - COA list with type/balance type/status filtering
  - Add/edit/archive account modal
  - Account hierarchy visualization (parent-child tree)
  - Account code validation (unique per org)
  - Search and bulk operations
- Tests: Service unit tests (CRUD operations, validation, balance calculation)
- RLS: Verify organization-scoped data isolation

**Definition of Done:**
- Can create/edit/archive accounts via UI
- Account codes enforced unique per organization
- Hierarchy validated (no orphaned parents)
- Account balance calculated correctly
- Audit trail records all changes

**Location:** `src/lib/chart-of-accounts.service.ts`, `src/app/pages/workspace/ChartOfAccountsAdmin.tsx`

---

#### 1.2 Journal Entry Posting (8 SP)
**Lead:** Senior Backend Eng + Frontend Eng  
**Tasks:**
- Backend: Complete JournalEntryService methods (currently partial):
  - `createJournalEntry()` with multi-line support
  - `validateJournalEntry()` (debit = credit)
  - `postJournalEntry()` (GL posting + immutability)
  - `reverseJournalEntry()` (create reversing entry)
- Database: Verify `journal_entries` and `je_lines` schema
- Frontend: Build `JournalEntryManager.tsx` with:
  - Multi-line entry form (add/remove lines, auto-calculate)
  - Account lookup with search
  - Amount entry with validation (debit/credit columns)
  - Entry status workflow (Draft → Posted → Reversed)
  - Review screen before posting
  - Posting confirmation with GL posting audit trail
- Tests: Integration test for full posting workflow

**Definition of Done:**
- Can create multi-line journal entries
- Cannot post unbalanced entries
- Posted entries are immutable
- Reversals create auditable trail
- GL accounts updated correctly

**Location:** `src/lib/journal-entry.service.ts`, `src/app/pages/workspace/JournalEntryManager.tsx`

---

#### 1.3 Ledger Reversal Service (8 SP)
**Lead:** Senior Backend Eng  
**Tasks:**
- Backend: Implement LedgerReversalService:
  - Reverse journal entries (create offset entry)
  - Reverse GL postings (audit trail)
  - Validation (no re-reversal, audit trail)
  - Audit log for all reversals
- Database: Add `reversal_reason` and audit fields to JE/GL tables
- Tests: Unit tests for reversal logic and validation

**Definition of Done:**
- Can reverse any posted journal entry
- Reversal creates new offset JE (original preserved)
- Cannot reverse a reversal
- Audit trail complete

**Location:** `src/lib/ledger-reversal.service.ts`

---

#### 1.4 GL Display & Trial Balance (8 SP)
**Lead:** Frontend Eng + Backend Eng  
**Tasks:**
- Backend: Implement `getTrialBalance()` and `getGeneralLedger()` queries
  - Trial balance as of date (all accounts with debit/credit)
  - GL detail ledger with filtering (date range, account, type)
  - Balance validation (total debits = total credits)
- Frontend: Build enhanced `GeneralLedger.tsx`:
  - Replace sample data with live GL data
  - Chart of Accounts table (code, name, type, balance, status)
  - Journal Entries ledger (date, description, debit/credit by account)
  - Trial Balance tab (all accounts, totals, validation)
  - GL Detail tab with date/account filtering
  - Export to CSV
- Tests: GL balance calculation tests

**Definition of Done:**
- Trial balance always balances (total debits = total credits)
- GL display accurate for all transactions
- Filtering works (by date, account, amount)
- Export includes all GL data

**Location:** `src/app/pages/workspace/GeneralLedger.tsx`, `src/lib/general-ledger.service.ts`

---

#### 1.5 Financial Period Management (5 SP)
**Lead:** Backend Eng  
**Tasks:**
- Backend: Implement FinancialPeriodService:
  - Create periods (monthly, quarterly, annual)
  - Close period (lock from new entries)
  - Reopen period (admin only, with reason)
  - Validate no GL entries after period close date
- Database: Add `financial_periods` and `period_close_log` tables
- Tests: Period close/reopen logic

**Definition of Done:**
- Can create accounting periods
- Cannot post entries after period close
- Reopen audit trail recorded

**Location:** `src/lib/financial-period.service.ts`

---

### Week 1 Milestones
- Monday: Chart of Accounts and Journal Entry services + basic tests
- Wednesday: UI for COA admin + JE manager
- Friday: GL display, trial balance, period management
- **By end of week:** Can post GL entries and view ledger

---

## Phase 2: Payment Allocation & Charge Generation (Week 2)
**Goal:** Connect payments to charges via GL posting  
**Effort:** 31 SP  
**Blockers:** Phase 1 complete

### Tasks

#### 2.1 Payment Allocation Service (13 SP)
**Lead:** Senior Backend Eng  
**Tasks:**
- Backend: Implement PaymentAllocationService:
  - `allocatePayment()` with strategy (oldest_first, priority, manual)
  - `suggestAllocation()` (AI or rule-based)
  - `applyAllocation()` (create charge satisfactions + GL posting)
  - `reverseAllocation()` (undo application)
  - Multi-charge satisfaction (payment splits across charges)
- Database: Add `payment_allocations` and `charge_satisfactions` tables
- GL Integration: Post GL entries:
  - Debit: Payment clearing account
  - Credit: Charge revenue account
- Tests: Allocation algorithm tests, GL posting validation

**Definition of Done:**
- Can allocate payment to one or more charges
- Suggested allocation shown before apply
- GL entries posted correctly
- Reversal un-does all GL posting
- Payment-to-charge traceability complete

**Location:** `src/lib/payment-allocation.service.ts`

---

#### 2.2 Charge Generation Service & Worker (13 SP)
**Lead:** Senior Backend Eng + DevOps  
**Tasks:**
- Backend: Implement ChargeGenerationService:
  - `generateChargesForLease()` (from templates for month)
  - `generateChargesForOrganization()` (bulk, run daily)
  - `checkVacancyAndSkip()` (occupancy check)
  - `prorateCharge()` (move-in/out partial months)
  - Audit logging
- Database: Add `charge_generation_logs` table
- Worker: Create `scripts/workers/charge-generation-worker.ts`:
  - Daily scheduled job (e.g., 10 PM)
  - Call `generateChargesForOrganization()` for each org
  - Error handling + retry
  - Audit log + notification on failure
- DevOps: Deploy worker to serverless (AWS Lambda or similar)
- Tests: Charge generation logic (prorating, vacancy, frequency)

**Definition of Done:**
- Charges generated automatically daily
- Charges linked to correct leases/units
- Prorating applied correctly
- Vacant units skip charge generation
- Audit trail shows what was generated

**Location:** `src/lib/charge-generation.service.ts`, `scripts/workers/charge-generation-worker.ts`

---

#### 2.3 Payment to GL Integration (5 SP)
**Lead:** Backend Eng  
**Tasks:**
- Backend: Update `paymentService.ts` to call `PaymentAllocationService`:
  - When payment completes (provider webhook), allocate to charges
  - If allocation succeeds, post GL entries
  - If allocation fails (no matching charges), hold for manual review
- Tests: End-to-end payment → GL flow

**Definition of Done:**
- Payment completion triggers charge allocation
- GL entries posted when allocation applied
- Audit trail links payment → allocation → GL

**Location:** `src/lib/payment.service.ts`

---

### Week 2 Milestones
- Monday: Payment Allocation service complete + tests
- Wednesday: Charge Generation service + worker deployed
- Friday: End-to-end payment → charge → GL working
- **By end of week:** New charges created daily, payments allocated to charges

---

## Phase 3: Bank Reconciliation & Collections Queue (Week 3)
**Goal:** Complete financial transaction matching and arrears prioritization  
**Effort:** 38 SP  
**Blockers:** Phase 1 & 2 complete

### Tasks

#### 3.1 Bank Reconciliation UI (8 SP)
**Lead:** Frontend Eng + Backend Eng  
**Tasks:**
- Frontend: Build `BankReconciliationUI.tsx`:
  - Statement upload form (CSV/PDF)
  - Transaction list from statement
  - Payment list for matching
  - Drag-to-match interface (statement txn → payment)
  - Auto-match results display (with match confidence)
  - Manual override capability
  - Variance tracking (over/under/unmatched)
  - Reconciliation completion button
  - GL posting confirmation
- Backend: Enhance BankReconciliationService:
  - Support manual match update
  - Record unmatched variances
  - Complete reconciliation flow
- Tests: Reconciliation workflow tests

**Definition of Done:**
- Can upload bank statement
- Auto-match shows results
- Can manually override/add matches
- Variances recorded
- Completion posts settlement GL entries

**Location:** `src/app/pages/workspace/BankReconciliationUI.tsx`

---

#### 3.2 Collections Queue Service & UI (13 SP)
**Lead:** Backend Eng + Frontend Eng  
**Tasks:**
- Backend: Implement CollectionsQueueService:
  - Get queue (prioritized by aging × amount × history)
  - Calculate priority score (complex formula)
  - Log contact attempt (method, outcome, follow-up)
  - Update case status
  - Get case detail with full history
  - Assign case to collector
  - Get collections metrics
- Database: Add `collection_cases`, `contact_attempts` tables
- Frontend: Build `CollectionsQueue.tsx`:
  - Priority queue view (sorted by age/amount)
  - Aging bucket filter (1-30, 31-60, 61-90, 90+)
  - Status/assignee filtering
  - Click to open case detail
  - Bulk assign feature
- Frontend: Build `CollectionsCaseDetail.tsx`:
  - Customer info + occupancy
  - Outstanding charges (aged breakdown)
  - Payment history
  - Contact attempt log with forms
  - Next follow-up date
  - Quick actions (create promise-to-pay, create payment plan, escalate)
- Tests: Priority scoring, case workflow

**Definition of Done:**
- Queue shows 80%+ of arrears
- Priority scoring works (high-risk cases first)
- Contact attempts logged
- Case assignment working
- Metrics calculated

**Location:** `src/lib/collections-queue.service.ts`, `src/app/pages/workspace/CollectionsQueue.tsx`, `src/app/pages/workspace/CollectionsCaseDetail.tsx`

---

#### 3.3 Promise-to-Pay Tracking (8 SP)
**Lead:** Backend Eng + Frontend Eng  
**Tasks:**
- Backend: Implement PromiseToPayService:
  - Record promise (amount, date, customer, officer)
  - Verify promise kept (link to payment)
  - Escalate promise breach
  - Get promise history + statistics
- Database: Add `promises_to_pay` table
- Frontend: Add to `CollectionsCaseDetail.tsx`:
  - Promise-to-pay form (amount, date, notes)
  - Verify promise UI (link payment)
  - Promise history list
- Worker: Create scheduled job to check for breached promises (daily)
- Tests: Promise verification logic

**Definition of Done:**
- Can record promise-to-pay
- Promise linked to payment verification
- Breached promises detected daily
- Statistics accurate

**Location:** `src/lib/promise-to-pay.service.ts`

---

#### 3.4 Payment Plan Service & UI (5 SP)
**Lead:** Backend Eng + Frontend Eng  
**Tasks:**
- Backend: Implement PaymentPlanService:
  - Create plan from arrears balance
  - Generate installment schedule
  - Record installment payments
  - Track installment status
  - Plan compliance metrics
- Database: Add `payment_plans`, `installments` tables
- Frontend: Add to `CollectionsCaseDetail.tsx`:
  - Create payment plan wizard (amount, frequency, count)
  - Installment schedule preview
  - Record payments against installments
  - Plan status view
- Tests: Installment calculation, plan workflow

**Definition of Done:**
- Can create payment plans from cases
- Installment schedule accurate
- Payments linked to installments
- Plan compliance tracked

**Location:** `src/lib/payment-plan.service.ts`

---

#### 3.5 Collections Dashboard (4 SP)
**Lead:** Frontend Eng  
**Tasks:**
- Frontend: Build `CollectionsDashboard.tsx`:
  - Total overdue by aging bucket (chart)
  - Collection rate (this month, YTD)
  - Average follow-up time
  - Top reasons for arrears
  - Cases by status (new, contacted, promise, plan)
  - Collections team performance (cases handled, $ recovered)
- Data: Query collections metrics from services
- Tests: Dashboard rendering

**Definition of Done:**
- Dashboard shows current collections status
- Metrics accurate
- Drill-down to queue working

**Location:** `src/app/pages/workspace/CollectionsDashboard.tsx`

---

### Week 3 Milestones
- Monday: Bank Reconciliation UI complete
- Tuesday: Collections Queue service + UI
- Thursday: Promise-to-pay and payment plan services
- Friday: Collections Dashboard + metrics
- **By end of week:** Full collections workflow operational (queue → attempt → promise/plan → verify)

---

## Phase 4: Procurement & 3-Way Match (Week 4)
**Goal:** Complete procurement cycle from request through payment  
**Effort:** 35 SP  
**Blockers:** Phase 1 (GL for posting), Phase 3 (payment processing)

### Tasks

#### 4.1 Purchase Request & Approval Workflow (8 SP)
**Lead:** Backend Eng + Frontend Eng  
**Tasks:**
- Backend: Implement ProcurementApprovalService:
  - Route request based on amount thresholds
  - Get approval thresholds (org-specific)
  - Record approval/rejection
  - Validate budget available
  - Get pending approvals for user
- Database: Add `purchase_requests`, `purchase_approvals`, `budget_allocations` tables
- Frontend: Build `PurchaseRequestForm.tsx`:
  - Request creation (title, description, amount, department, linked job)
  - Budget validation (display available budget)
  - Preview of approval routing (who will approve)
  - Approval notification workflow
  - Request status tracking
- Frontend: Build `ProcurementApprovals.tsx`:
  - Pending approval list
  - Detail view (request details, budget impact)
  - Approve/reject with amount
  - Audit trail of approvals
- Tests: Approval routing logic, budget validation

**Definition of Done:**
- Can submit purchase requests
- Approval routing shows correct approvers
- Can approve/reject with audit trail
- Budget validation prevents over-spending

**Location:** `src/lib/procurement-approval.service.ts`, `src/app/pages/workspace/PurchaseRequestForm.tsx`, `src/app/pages/workspace/ProcurementApprovals.tsx`

---

#### 4.2 Purchase Order & Goods Receipt (13 SP)
**Lead:** Backend Eng + Frontend Eng  
**Tasks:**
- Backend: Implement PurchaseOrderService:
  - Create PO from approved request
  - Auto-generate PO number
  - Send PO to vendor (email)
  - Update PO status
  - Post GL entry (asset/prepaid debit, AP credit)
  - List POs by status
  - Link to maintenance job
- Backend: Implement GoodsReceiptService:
  - Create GRN from PO
  - Auto-generate GRN number
  - Record discrepancies (over/under/damaged)
  - Close GRN
- Database: Add `purchase_orders`, `purchase_order_items`, `goods_receipt_notes`, `grn_items`, `receipt_discrepancies` tables
- Frontend: Build `PurchaseOrderUI.tsx`:
  - PO creation from approved request (pre-filled)
  - Item entry (description, qty, unit price)
  - PO detail view
  - Send to vendor button
  - PO list by status
- Frontend: Build `GoodsReceiptUI.tsx`:
  - GRN creation from PO (show line items)
  - Received quantity entry
  - Discrepancy recording (type, qty, notes)
  - Photo upload capability
  - GRN detail view
- Tests: PO creation, GRN workflow, GL posting

**Definition of Done:**
- Can create PO from approved request
- GL entries posted correctly
- Can record goods receipt
- Discrepancies tracked
- GRN completes receipt workflow

**Location:** `src/lib/purchase-order.service.ts`, `src/lib/goods-receipt.service.ts`, `src/app/pages/workspace/PurchaseOrderUI.tsx`, `src/app/pages/workspace/GoodsReceiptUI.tsx`

---

#### 4.3 Invoice Matching & Posting (8 SP)
**Lead:** Backend Eng + Frontend Eng  
**Tasks:**
- Backend: Implement InvoiceMatchingService:
  - Record vendor invoice
  - 3-way match (PO qty = GRN qty ≈ Invoice amount)
  - Flag variances (tolerance %)
  - Record variance resolution
  - Approve match (enables payment)
  - Post GL entry (asset/prepaid reversal, expense)
  - Get pending matches
  - Match compliance metrics
- Database: Add `vendor_invoices`, `invoice_matching`, `invoice_variances` tables
- Frontend: Build `InvoiceMatchingUI.tsx`:
  - Invoice entry (upload/manual)
  - 3-way match display (PO vs GRN vs Invoice)
  - Variance highlighting
  - Approval workflow
  - Match status list
- Tests: 3-way match logic, variance tolerance

**Definition of Done:**
- Can record vendor invoices
- 3-way match compares correctly
- Variances flagged with tolerance rules
- Approval enables payment
- GL entries reverse prepaid

**Location:** `src/lib/invoice-matching.service.ts`, `src/app/pages/workspace/InvoiceMatchingUI.tsx`

---

#### 4.4 Procurement Dashboard (6 SP)
**Lead:** Frontend Eng  
**Tasks:**
- Frontend: Build `ProcurementDashboard.tsx`:
  - Pipeline stage breakdown (Request, Approved, PO, GRN, Invoice, Matched, Paid)
  - Vendor metrics (on-time delivery %, quote speed, price index)
  - Budget tracking (allocated, spent, committed)
  - 3-way match compliance (% perfect matches, variances)
  - Average cycle time (request → payment)
- Data: Query from procurement services
- Tests: Dashboard data accuracy

**Definition of Done:**
- Dashboard shows procurement pipeline status
- Vendor performance visible
- Budget tracking accurate

**Location:** `src/app/pages/workspace/ProcurementDashboard.tsx`

---

### Week 4 Milestones
- Monday: Purchase Request + Approval services complete
- Tuesday: PO + GRN services and UI
- Thursday: Invoice Matching service and workflow
- Friday: Procurement Dashboard + end-to-end PO-GRN-Match-Pay tested
- **By end of week:** Full procurement workflow operational (request → approval → PO → receipt → invoice → match → payment)

---

## Phase 5: Vendor SLA & Performance (Week 5)
**Goal:** Monitor maintenance quality and vendor accountability  
**Effort:** 19 SP  
**Blockers:** Phase 4 (for vendor payment traceability)

### Tasks

#### 5.1 Vendor Performance Enhancements (8 SP)
**Lead:** Backend Eng  
**Tasks:**
- Backend: Enhance VendorPerformanceService (exists, needs completion):
  - Calculate monthly performance metrics (on-time %, cost variance, quality)
  - Get performance history (multi-month trends)
  - Recommend action (renew/review/replace)
  - Get vendor scorecard
  - Benchmark against peers
  - Cost trend analysis
  - Quality issue tracking
  - Vendor comparison for quotes
- Database: Ensure `vendor_performance_metrics` table supports tracking over time
- Tests: Performance calculation, benchmarking logic

**Definition of Done:**
- Can calculate performance for any vendor/month
- Historical performance tracked
- Performance recommendation shows reasoning
- Scorecard comprehensive

**Location:** `src/lib/vendor-performance.service.ts` (enhance existing)

---

#### 5.2 Vendor Performance Dashboard & UI (8 SP)
**Lead:** Frontend Eng  
**Tasks:**
- Frontend: Build `VendorPerformanceDashboard.tsx`:
  - Vendor list with scorecard (on-time %, response time, quality score)
  - Performance trend chart (3-6 months)
  - Comparison to peer average
  - Recommendation indicator (green/yellow/red)
  - Click to vendor detail
  - Benchmark table (vendor vs category average)
- Frontend: Build vendor detail page:
  - Full scorecard metrics
  - Performance history chart
  - Quality issues list (with links to jobs)
  - Cost trend analysis
  - Recommendation with reasoning
  - Action button (renew contract, start replacement process)
- Tests: Dashboard rendering, data accuracy

**Definition of Done:**
- Can view any vendor performance
- Trends visible
- Peer benchmark shown
- Recommendation clear

**Location:** `src/app/pages/workspace/VendorPerformanceDashboard.tsx`, vendor detail enhancement

---

#### 5.3 SLA Alert Dashboard & Escalation (3 SP)
**Lead:** Frontend Eng  
**Tasks:**
- Frontend: Build/enhance `SLAAlertDashboard.tsx`:
  - Active SLA alerts (by severity)
  - Breach countdown (time remaining)
  - Acknowledge button
  - Escalation history
  - Link to job/issue
- Tests: Alert display, acknowledge workflow

**Definition of Done:**
- Active SLAs shown with breach status
- Can acknowledge SLA
- Escalation history visible

**Location:** `src/app/pages/workspace/SLAAlertDashboard.tsx`

---

### Week 5 Milestones
- Monday: Vendor Performance service enhancements complete
- Wednesday: Vendor Performance Dashboard + detail pages
- Friday: SLA Alert UI + integration
- **By end of week:** Full vendor performance monitoring operational

---

## Phase 6: Financial Reporting & Go-Live Prep (Week 6)
**Goal:** Complete reporting, documentation, and launch preparation  
**Effort:** 15 SP  
**Blockers:** All prior phases complete

### Tasks

#### 6.1 Financial Statements & Export (8 SP)
**Lead:** Backend Eng + Frontend Eng  
**Tasks:**
- Backend: Implement AccountingExportService:
  - Export general ledger (CSV, Excel, JSON)
  - Export chart of accounts
  - Export journal entries with supporting docs
  - Export trial balance
  - Export balance sheet (standard + comparative)
  - Export income statement
  - Comprehensive audit package
- Frontend: Build `FinancialStatementsViewer.tsx`:
  - Period selector (date range)
  - Statement type selector (Trial Balance, Balance Sheet, Income Statement)
  - Comparative period option (YoY, MTD vs last month)
  - Display formatted statement (with totals, subtotals)
  - Export button (CSV, Excel, PDF)
- Tests: Export data validation, formatting

**Definition of Done:**
- Can export GL, COA, Trial Balance, Balance Sheet, Income Statement
- Comparative statements work
- Format options available (CSV, Excel, PDF)
- Audit package complete for external audit

**Location:** `src/lib/accounting-export.service.ts`, `src/app/pages/workspace/FinancialStatementsViewer.tsx`

---

#### 6.2 Collections Automation & Escalation (4 SP)
**Lead:** Backend Eng  
**Tasks:**
- Backend: Implement CollectionsAutomationService:
  - Define automation rules (trigger → action)
  - Evaluate rules daily
  - Execute actions (SMS, email, escalate, task)
  - Get rule execution audit log
  - Simulate rules (dry run)
- Database: Add `collections_automation_rules`, `automation_execution_log` tables
- Worker: Create scheduled job to evaluate rules daily
- Tests: Rule evaluation, action execution

**Definition of Done:**
- Can define collections automation rules
- Rules evaluated daily
- Actions executed automatically
- Audit trail complete

**Location:** `src/lib/collections-automation.service.ts`, `scripts/workers/collections-automation-worker.ts`

---

#### 6.3 Documentation, Training & QA (3 SP)
**Lead:** Product Manager + QA  
**Tasks:**
- Document: GL operations manual (how to post entries, close periods)
- Document: Collections workflow guide (priority scoring, follow-up process)
- Document: Procurement cycle (request through payment, 3-way match)
- Training: Conduct sessions for finance team, collections team, procurement team
- QA: Full end-to-end testing:
  - Create charges → payments → GL reconciliation → bank rec → GL trial balance
  - Create arrears → collections queue → contact attempt → promise → escalation
  - Create purchase request → approval → PO → GRN → invoice → match → payment
  - Vendor performance scoring
- Runbooks: Create incident response guides (GL imbalance, payment failure, collection failure)

**Definition of Done:**
- Team trained on all workflows
- End-to-end testing passed
- Runbooks published
- Go-live readiness confirmed

---

### Week 6 Milestones
- Monday: Financial statements and export complete
- Wednesday: Collections automation rules engine deployed
- Thursday: Team training completed
- Friday: Go-live readiness review + launch
- **By end of week:** Production launch

---

## Dependency Diagram

```
Phase 1: GL Foundation
  ├─ ChartOfAccountsAdmin
  ├─ JournalEntryPosting
  ├─ LedgerReversal
  ├─ GLDisplay & TrialBalance
  └─ FinancialPeriods
      │
      ├──→ Phase 2: Payment Allocation & Charges
      │       ├─ PaymentAllocationService
      │       ├─ ChargeGenerationWorker
      │       └─ GL Integration
      │           │
      │           ├──→ Phase 3: Bank Reconciliation & Collections
      │           │       ├─ BankReconciliationUI
      │           │       ├─ CollectionsQueueService
      │           │       ├─ PromiseToPayService
      │           │       ├─ PaymentPlanService
      │           │       └─ CollectionsDashboard
      │           │
      │           └──→ Phase 4: Procurement
      │                   ├─ PurchaseRequestApproval
      │                   ├─ PurchaseOrderGRN
      │                   ├─ InvoiceMatching
      │                   └─ ProcurementDashboard
      │
      └──→ Phase 5: Vendor SLA (dep: Phases 1-4)
              ├─ VendorPerformance
              ├─ PerformanceDashboard
              └─ SLAAlerts

Phase 6: Reporting & Launch (dep: Phases 1-5)
  ├─ FinancialStatementsExport
  ├─ CollectionsAutomation
  └─ GoLivePrep
```

---

## Resource Allocation Plan

**Team Composition:**
- 1x Senior Backend Engineer (GL, Payment, Bank Rec, Collections, Procurement owner)
- 1x Mid-Level Backend Engineer (Charge generation, Vendor SLA, Automation)
- 1x Frontend Engineer (UI for all modules)
- 1x QA Engineer (testing, end-to-end validation)
- 0.5x Product Manager (roadmap, requirements clarification)
- 0.5x DevOps Engineer (worker deployment, infrastructure)

**Weekly Allocation:**

| Week | Phase | Eng 1 | Eng 2 | FE Eng | QA | PM |
|------|-------|-------|-------|--------|----|----|
| 1 | GL Foundation | 75% | 25% | 100% | 50% | 100% |
| 2 | Payment/Charges | 100% | 75% | 100% | 50% | 50% |
| 3 | Bank Rec/Collections | 75% | 50% | 100% | 75% | 75% |
| 4 | Procurement | 100% | 50% | 100% | 100% | 50% |
| 5 | Vendor SLA | 25% | 75% | 100% | 100% | 25% |
| 6 | Reporting/Launch | 50% | 50% | 100% | 100% | 100% |

---

## Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| GL balance imbalance in production | Medium | Critical | Automated daily reconciliation check, audit trail, reversal workflow |
| Payment allocation fails silently | Medium | Critical | Detailed logging, failed allocation queue with manual review, monitoring |
| Collections queue missing arrears | Low | High | Comprehensive arrears query test, daily metric validation |
| Procurement PO-GRN mismatch | Medium | High | 3-way match strict validation, discrepancy queue with resolution tracking |
| Bank reconciliation variance too large | Low | High | Variance tolerance configurable, escalation workflow for large gaps |
| Team not trained before launch | Medium | High | Hands-on training during development, runbooks, post-launch support plan |
| Database performance degrades | Low | High | Query optimization, indexes on key fields, load testing in staging |

**Mitigation Plan:**
- Daily automated checks (GL balance, payment allocation, arrears completeness, 3-way match compliance)
- Staging environment testing with 10x production data volume
- Post-launch support team on standby for first week
- Rollback plan available if critical issues found

---

## Success Criteria & Metrics

### Functional Completeness
- ✅ All P0 services implemented (16 services across 6 phases)
- ✅ All UI components for P0 operations
- ✅ End-to-end testing passed for each workflow

### Financial Accuracy
- ✅ GL always balances (total debits = total credits)
- ✅ Trial balance reconciles to organization wallet
- ✅ Payment allocations account for 100% of payment amount
- ✅ Charges generated daily with 100% accuracy

### Operational Metrics
- ✅ Collections queue shows 80%+ of overdue accounts
- ✅ Bank reconciliation completes within 1 hour of statement upload
- ✅ Procurement cycle time < 5 business days (request → payment)
- ✅ Vendor performance calculated monthly

### Quality Metrics
- ✅ Zero critical bugs in financial workflows
- ✅ Code coverage 80%+ for finance services
- ✅ All data transactions auditable
- ✅ RLS policies enforced (organization isolation)

### User Experience
- ✅ Finance team can perform GL operations without developer help
- ✅ Collections officer can work queue in less than 30 mins/case
- ✅ Procurement manager can route requests in under 2 minutes
- ✅ Vendor performance dashboard loads in under 3 seconds

---

## Post-Launch Roadmap (P1)

**Week 7-8: Stabilization & Optimization**
- Monitor P0 financials for accuracy
- Performance tuning for large organizations
- User feedback collection

**Week 9-12: P1 Features**
- Advanced GL reporting (cash flow, depreciation)
- AI Collections Agent (intent → case creation)
- Multi-currency support
- Contractor portal (quote submission, invoice upload)
- Preventive maintenance scheduling
- Utilities meter reading & forecasting

**Week 13-16: P2 Features**
- Natural language command interface
- Workflow automation builder (event → action)
- Advanced vendor analytics
- Asset management portal
- Custom reporting

---

## Go-Live Checklist

### Infrastructure
- [ ] Database backups automated
- [ ] Monitoring alerts configured (GL imbalance, payment failure)
- [ ] Scheduled jobs deployed (charge generation, collections automation)
- [ ] Disaster recovery plan documented

### Team
- [ ] Finance team trained (4+ hours)
- [ ] Collections team trained (4+ hours)
- [ ] Procurement team trained (4+ hours)
- [ ] Support team trained on escalation processes
- [ ] On-call support roster assigned for first 2 weeks

### Testing
- [ ] Unit tests passing (90%+ coverage)
- [ ] Integration tests for all workflows
- [ ] End-to-end testing with production data snapshot
- [ ] Performance testing (1000+ organizations)
- [ ] Security testing (RLS, data isolation)

### Documentation
- [ ] GL operations manual published
- [ ] Collections workflow guide published
- [ ] Procurement cycle guide published
- [ ] API documentation (services)
- [ ] Incident response runbooks
- [ ] Known limitations documented

### Customer Comms
- [ ] Release notes published
- [ ] Feature announcement (email + in-app)
- [ ] Training video links shared
- [ ] Support contact info updated

---

## Conclusion

This 6-week roadmap delivers production-ready P0 financial operations for BaytMiftah:
- **GL Foundation:** Accounting ledger with posting, reversal, reconciliation
- **Payment Operations:** Charges, payments, allocation to GL
- **Collections Workflow:** Arrears queue, follow-up tracking, payment plans, escalation
- **Procurement Cycle:** Request through 3-way match and payment
- **Vendor Management:** SLA monitoring, performance metrics, scorecards

**Total Effort:** 169 story points across 6 weeks with 3-4 engineers.  
**Go-Live Target:** End of Week 6.  
**Post-Launch:** Stabilization week 7-8, then P1 roadmap execution.

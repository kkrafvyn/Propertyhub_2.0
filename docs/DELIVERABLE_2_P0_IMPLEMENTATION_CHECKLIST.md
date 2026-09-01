# DELIVERABLE 2: P0 Implementation Priority Checklist

**Date:** 2026-08-21  
**Status:** Living checklist for P0 financial completeness  
**Owner:** Engineering Lead

---

## P0 Block 1: General Ledger Foundation (BLOCKS ALL FINANCE)

### Phase 1.1: Chart of Accounts Administration

- [ ] **GL-001** Create `COAAdminService` class
  - Methods: `createAccount()`, `updateAccount()`, `archiveAccount()`, `getChartOfAccounts(orgId)`
  - Support account types: Asset, Liability, Equity, Revenue, Expense
  - Support balance types: Debit, Credit
  - Enforce immutability: accounts cannot be deleted, only archived
  - Link: `src/lib/chart-of-accounts.service.ts`

- [ ] **GL-002** Build Chart of Accounts Admin UI page
  - Location: Business Desktop → Finance → Chart of Accounts
  - Features:
    - Add new account (modal)
    - Edit account details (not code; code is permanent)
    - Archive account (soft delete)
    - Search/filter by type, status, parent account
    - Bulk archive action
  - Link: `src/app/pages/workspace/ChartOfAccountsAdmin.tsx`

- [ ] **GL-003** Add default COA templates for Ghana property companies
  - Residential property template (30 accounts)
  - Commercial property template (35 accounts)
  - Mixed-use template (45 accounts)
  - Support templates on org creation
  - Link: `src/lib/coa-templates.ts`

### Phase 1.2: Journal Entry Management

- [ ] **GL-004** Verify `GeneralLedgerService.createJournalEntry()` is complete
  - Accepts organization_id, entry_date, description, reference_number
  - Creates DRAFT entry with auto-numbering
  - Debit/credit balance validation before posting
  - Status: DRAFT → POSTED → REVERSED
  - Link: `src/lib/general-ledger.service.ts`

- [ ] **GL-005** Implement `GeneralLedgerService.postJournalEntry()`
  - State transition: DRAFT → POSTED
  - Audit trail: posted_by, posted_at
  - Lock entry from editing once posted
  - Create immutable ledger entries
  - Link: `src/lib/general-ledger.service.ts`

- [ ] **GL-006** Implement `GeneralLedgerService.reverseJournalEntry()`
  - Create offset entry (debit ↔ credit swap)
  - Link original and reversal with foreign key
  - Reason/notes required
  - Original entry remains immutable
  - Link: `src/lib/general-ledger.service.ts`

- [ ] **GL-007** Build Journal Entry UI page
  - Location: Business Desktop → Finance → Journal Entries
  - Features:
    - Create entry (multi-line)
    - Edit DRAFT entries only
    - Post entry (state change)
    - Reverse posted entry (creates new entry)
    - View entry history and reversals
    - Filter by date, account, status
  - Link: `src/app/pages/workspace/JournalEntryManager.tsx`

### Phase 1.3: Trial Balance & Balance Sheet

- [ ] **GL-008** Implement `GeneralLedgerService.getTrialBalance(orgId, asOfDate)`
  - Group posted entries by account
  - Calculate debit/credit totals per account
  - Validate debits = credits (trial balance must balance)
  - Return error if unbalanced
  - Support date range queries

- [ ] **GL-009** Implement `GeneralLedgerService.getBalanceSheet(orgId, asOfDate)`
  - Filter accounts by type (Asset, Liability, Equity)
  - Calculate net positions
  - Support multi-period comparison
  - Format: standard accounting layout (Assets = Liabilities + Equity)

- [ ] **GL-010** Implement `GeneralLedgerService.getIncomeStatement(orgId, periodStart, periodEnd)`
  - Filter accounts by type (Revenue, Expense)
  - Group by category
  - Calculate net income (Revenue - Expense)
  - Support YTD and period comparisons

- [ ] **GL-011** Build Trial Balance / Financial Statements UI
  - Location: Business Desktop → Finance → Statements
  - Display:
    - Trial balance with balance verification
    - Balance sheet snapshot
    - Income statement for period
    - Export to CSV/PDF
  - Link: `src/app/pages/workspace/FinancialStatementsViewer.tsx`

---

## P0 Block 2: Payment & Charge Management

### Phase 2.1: Charge Template Administration

- [ ] **CH-001** Create `ChargeTemplateService`
  - Methods: `createTemplate()`, `updateTemplate()`, `listTemplates(orgId)`, `archiveTemplate()`
  - Fields: name, type (rent/service/utility/penalty/custom), gl_account_id, amount_minor, frequency
  - Support property-level and unit-level defaults
  - Link: `src/lib/charge-template.service.ts`

- [ ] **CH-002** Build Charge Template Admin UI
  - Location: Business Web → Property Settings → Charge Types
  - Features:
    - Create new charge type
    - Set GL account mapping for each charge type
    - Set default amounts per property/unit
    - Archive unused charge types
  - Link: `src/app/pages/workspace/ChargeTemplateAdmin.tsx`

- [ ] **CH-003** Implement automated charge generation worker
  - Trigger: Daily or scheduled
  - For each active lease with recurring charges:
    - Check if charge due in period
    - Generate charge entry
    - Post to GL (debit AR, credit Revenue)
    - Create payment obligation
  - Handle vacancies (skip charges if unit vacant)
  - Handle prorating (partial month moves)
  - Link: `scripts/workers/charge-generation-worker.ts`

### Phase 2.2: Payment Allocation Engine

- [ ] **PA-001** Create `PaymentAllocationService`
  - Methods: `allocatePayment(paymentId, allocationStrategy)`
  - Strategies:
    - `oldest_first`: Apply to oldest charges first
    - `priority_order`: Apply by charge type priority (penalties first)
    - `manual`: User specifies allocation
  - Calculate remaining balance after each charge satisfaction
  - Support partial allocations (payment doesn't fully cover one charge)
  - Link: `src/lib/payment-allocation.service.ts`

- [ ] **PA-002** Implement payment-to-GL posting
  - On payment allocation:
    - Debit bank account (or cash clearing)
    - Credit A/R or revenue based on charge type
    - Post to ledger immediately (immutable)
    - Reference payment ID for audit trail
  - Reconciliation flag for pending bank verification

- [ ] **PA-003** Build Payment Allocation UI
  - Location: Business Web → Payments → Payment Detail
  - Show:
    - Outstanding charges (aging bucket display)
    - Allocated amount per charge
    - Remaining balance
    - Allocation strategy selector (if manual override needed)
    - Save button to confirm allocation
  - Link: Component in `WorkspacePayments.tsx`

- [ ] **PA-004** Implement payment reversal workflow
  - On reversal:
    - Create reverse allocation entry
    - Post reverse GL transaction (debit Revenue, credit A/R)
    - Mark original payment as reversed
    - Return charges to open status
    - Reason/notes required
  - Link: `PaymentAllocationService.reversePayment()`

---

## P0 Block 3: Bank Reconciliation

### Phase 3.1: Bank Statement Upload & Matching

- [ ] **BR-001** Verify `BankReconciliationService.uploadBankStatement()` is complete
  - Accept CSV/PDF bank statement
  - Parse: date, description, amount, running balance
  - Create statement record
  - Create bank transactions from statement lines
  - Calculate opening/closing balances
  - Link: `src/lib/bank-reconciliation.service.ts`

- [ ] **BR-002** Implement `BankReconciliationService.autoMatchTransactions()`
  - Match bank txn to payment by:
    - Amount (exact match in minor units)
    - Date (within 3 days)
    - Metadata (provider reference if available)
  - Flag ambiguous matches (multiple payments same amount same day)
  - Report match rate and unmatched count
  - Link: `src/lib/bank-reconciliation.service.ts`

- [ ] **BR-003** Implement `BankReconciliationService.manualMatchTransaction()`
  - User selects bank txn and payment
  - Confirm match
  - Record matched_by, matched_at
  - Update reconciliation status
  - Link: `src/lib/bank-reconciliation.service.ts`

- [ ] **BR-004** Build Bank Reconciliation UI
  - Location: Business Desktop → Finance → Bank Reconciliation
  - Features:
    - Upload bank statement
    - View statement detail (opening, closing, total)
    - Auto-match transactions (show results)
    - Manual match interface (drag or click to match)
    - Matched/unmatched count
    - Unmatched transactions list (investigate)
    - Complete reconciliation button
  - Link: `src/app/pages/workspace/BankReconciliationUI.tsx`

### Phase 3.2: Variance & Reconciliation Completion

- [ ] **BR-005** Implement `BankReconciliationService.recordReconciliationVariance()`
  - For unmatched txn, create variance record
  - Types: timing (not yet cleared), lost (missing), unexplained (error)
  - Track investigation status
  - Support resolution notes
  - Link: `src/lib/bank-reconciliation.service.ts`

- [ ] **BR-006** Implement `BankReconciliationService.completeReconciliation()`
  - Check: all transactions matched or variance recorded
  - Reconciled by user, timestamp
  - Lock statement from further edits
  - Post reconciliation GL entry (clear transit accounts)
  - Link: `src/lib/bank-reconciliation.service.ts`

- [ ] **BR-007** Build Variance Investigation UI
  - Show unmatched bank transactions
  - Variance type dropdown
  - Investigation notes
  - Resolution status tracking
  - Link to variance in ledger for audit trail

---

## P0 Block 4: Arrears & Collections

### Phase 4.1: Collections Queue & Follow-up

- [ ] **AR-001** Create `CollectionsQueueService`
  - Methods: `getCollectionsCases(orgId)`, `updateCaseStatus()`, `logContactAttempt()`
  - Priority scoring: days overdue × amount × frequency
  - Filter by aging bucket (30/60/90+)
  - Assign to collections officer
  - Link: `src/lib/collections-queue.service.ts`

- [ ] **AR-002** Implement contact attempt logging
  - Record: contact method (call, SMS, in-person, email), outcome, notes, next_followup_date
  - Support multiple attempts per case
  - Calculate touch frequency (how often contacted)
  - Track promised vs actual payment
  - Link: `CollectionsQueueService.logContactAttempt()`

- [ ] **AR-003** Build Collections Queue UI
  - Location: Business Web → Collections → Overdue Accounts
  - Display:
    - Customer name, unit, amount overdue, days overdue
    - Priority score / color code
    - Contact attempt history (timeline)
    - Status (new, contacted, promise_to_pay, payment_plan, escalated)
    - Next follow-up date
    - Action buttons (log call, schedule follow-up, mark as paid)
  - Link: `src/app/pages/workspace/CollectionsQueue.tsx`

### Phase 4.2: Promise-to-Pay & Payment Plans

- [ ] **AR-004** Create `PromiseToPayService`
  - Record promise details: date, amount, promised_date, status
  - Trigger follow-up if promise missed
  - Mark promise as kept or broken
  - Support multiple promises per account
  - Link: `src/lib/promise-to-pay.service.ts`

- [ ] **AR-005** Create `PaymentPlanService`
  - Create plan: total, installment count, frequency, terms
  - Generate installments with due dates
  - Track installment payment
  - Escalation if installment missed
  - Link: `src/lib/payment-plan.service.ts`

- [ ] **AR-006** Build Payment Plan Creation UI
  - Modal in Collections Queue
  - Show: overdue amount, suggested installments (3/6/12 months)
  - Allow custom terms
  - Generate installment schedule (preview)
  - Confirm and save
  - Send SMS/notification to customer

### Phase 4.3: Collections Automation & Escalation

- [ ] **AR-007** Create collections automation rules
  - Trigger: No payment X days, promise missed, installment missed
  - Actions: Send reminder SMS, escalate to manager, flag for manual review
  - Support configurable timings per organization
  - Audit trail of automated actions
  - Link: `src/lib/collections-automation.service.ts`

- [ ] **AR-008** Build Collections Dashboard
  - Location: Business Web → Collections → Dashboard
  - Show:
    - Total overdue amount (by aging bucket)
    - Cases in progress (contacted, promise, payment plan)
    - Collection rate (% of 90+ collected this month)
    - Follow-up completion rate
    - Top reasons for arrears (customizable)
  - Link: `src/app/pages/workspace/CollectionsDashboard.tsx`

---

## P0 Block 5: Procurement Workflow

### Phase 5.1: Purchase Request → Purchase Order

- [ ] **PC-001** Create database schema
  - `purchase_requests`: id, org_id, requester_id, title, description, budget_amount, status, created_at
  - `purchase_orders`: id, request_id, vendor_id, quoted_amount, approved_amount, status, created_at
  - `purchase_order_items`: id, po_id, item_description, quantity, unit_price, amount
  - `goods_receipt_notes`: id, po_id, received_date, received_by, status
  - `vendor_invoices`: id, po_id, invoice_number, invoice_date, amount, status
  - `invoice_matching`: id, po_id, grn_id, invoice_id, match_status (3_way_match, partial, unmatched)
  - Link: `supabase/migrations/2026082101_procurement.sql`

- [ ] **PC-002** Create `ProcurementApprovalService`
  - Check budget vs available
  - Route to appropriate approver (manager, director, CFO based on amount)
  - Record approval with approver_id, timestamp, notes
  - Support approval workflows (sequential, parallel)
  - Link: `src/lib/procurement-approval.service.ts`

- [ ] **PC-003** Build Purchase Request UI
  - Location: Business Web/Desktop → Procurement → New Request
  - Fields: Title, description, budget, priority, requestor notes
  - Link to maintenance job/asset if applicable
  - Submit for approval workflow
  - Link: `src/app/pages/workspace/PurchaseRequestForm.tsx`

### Phase 5.2: Quote Comparison & PO Approval

- [ ] **PC-004** Verify `agenticAIOrchestratorService.generateQuoteComparisonMatrix()` displays:
  - Multiple vendors
  - Price per unit
  - Total amount
  - Delivery time
  - Quality score
  - Recommendation

- [ ] **PC-005** Build Quote Comparison UI
  - Location: Business Desktop → Procurement → Quote Approval
  - Display matrix from AI agent
  - Allow finance team to override recommendation
  - Accept/reject vendor quote
  - Generate PO from selected quote
  - Link: Component in `ProcurementCenter.tsx`

- [ ] **PC-006** Implement `PurchaseOrderService`
  - Create PO from approved quote
  - Generate PO number
  - Post GL entry: debit Prepaid/Asset, credit A/P
  - Send PO to vendor (notification)
  - Track PO status: sent, acknowledged, in_progress, partial_received, received, closed
  - Link: `src/lib/purchase-order.service.ts`

### Phase 5.3: Goods Receipt & 3-Way Match

- [ ] **PC-007** Implement `GoodsReceiptService`
  - Create GRN record for PO
  - Line-by-line receipt (qty received vs qty ordered)
  - Discrepancy handling (over/under delivery)
  - Received by user, timestamp
  - Photo evidence support
  - Link: `src/lib/goods-receipt.service.ts`

- [ ] **PC-008** Implement `InvoiceMatchingService`
  - 3-way match: PO amount = GRN qty × invoice price ≈ expected
  - Flag discrepancies (price variance > 2%, qty mismatch, missing docs)
  - Match status: matched, variance, rejected
  - Variance reason tracking
  - Link: `src/lib/invoice-matching.service.ts`

- [ ] **PC-009** Implement matched invoice GL posting
  - On 3-way match approval:
    - Move from Prepaid to Expense (or Asset if capitalized)
    - Credit A/P (vendor payable)
    - Post to ledger
    - Flag for payment processing

- [ ] **PC-010** Build GRN & Invoice Match UI
  - Location: Business Desktop → Procurement → Goods Receipt
  - View PO line items
  - Enter qty received per line
  - Upload GRN document
  - View invoice details
  - Show match status and variances
  - Approve/reject match
  - Link: `src/app/pages/workspace/GoodsReceiptUI.tsx` + matching component

---

## P0 Block 6: Vendor SLA & Performance

### Phase 6.1: SLA Monitoring & Alerts

- [ ] **SLA-001** Verify `VendorSLAService.checkAndCreateSLAAlerts()` detects:
  - ACK (acknowledgment) SLA breaches (e.g., 2 hours)
  - Resolution SLA breaches (e.g., 24 hours for urgent)
  - Create alert record with severity
  - Escalate if SLA near breach
  - Link: `src/lib/vendor-sla.service.ts`

- [ ] **SLA-002** Implement `VendorSLAService.getSLAAlerts()`
  - Return alerts filtered by type, severity, acknowledged status
  - Support pagination and sorting
  - Include vendor/job/issue context
  - Link: `src/lib/vendor-sla.service.ts`

- [ ] **SLA-003** Implement `VendorSLAService.acknowledgeSLAAlert()`
  - Record acknowledgment (acknowledged_by, acknowledged_at)
  - Remove from escalation queue
  - Log in audit trail
  - Link: `src/lib/vendor-sla.service.ts`

- [ ] **SLA-004** Build SLA Alert Dashboard
  - Location: Business Web/Desktop → Maintenance → SLA Alerts
  - Display:
    - Active SLA breaches (red)
    - SLA near breach (yellow)
    - Acknowledged alerts (gray)
    - Filter by severity, type, vendor
    - Acknowledge button
    - Escalate button (manual escalation)
  - Link: `src/app/pages/workspace/SLAAlertDashboard.tsx`

### Phase 6.2: Vendor Performance Metrics

- [ ] **SLA-005** Implement `VendorSLAService.updateVendorPerformance()`
  - Calculate monthly metrics:
    - On-time completion %
    - Average response time (hours)
    - Average resolution time (hours)
    - Quality rating (based on rework/callbacks)
  - Update VendorPerformance table
  - Support multi-month historical tracking
  - Link: `src/lib/vendor-sla.service.ts`

- [ ] **SLA-006** Implement `VendorSLAService.getVendorPerformance()`
  - Return performance metrics for vendor
  - Support date range (monthly history)
  - Include trend data
  - Link: `src/lib/vendor-sla.service.ts`

- [ ] **SLA-007** Build Vendor Performance UI
  - Location: Business Desktop → Procurement → Vendor Performance
  - Display:
    - Vendor scorecard (on-time %, response time, quality)
    - Performance trend chart (6-month)
    - Total jobs assigned
    - Completed on-time vs late
    - Quality issues (rework count)
    - Cost trend
    - Recommendation: renew / review / replace
  - Link: `src/app/pages/workspace/VendorPerformanceDashboard.tsx`

### Phase 6.3: SLA Dashboard & Escalation

- [ ] **SLA-008** Build SLA Dashboard for Finance Lead
  - Location: Business Web → Dashboard or Maintenance → SLA Dashboard
  - Show:
    - Count of active breaches (by severity)
    - On-time performance trend (company avg)
    - Top problematic vendors
    - Escalation activity (actions taken this week)
    - Cost impact of SLA breaches (rework charges)

- [ ] **SLA-009** Implement configurable escalation rules
  - By organization: Define escalation chain
  - Support time-based (notify manager after 2 hrs, director after 4 hrs)
  - Support severity-based (critical → immediate escalation)
  - Auto-create escalation task
  - Send notification (in-app, SMS, email)
  - Audit log all escalations
  - Link: `src/lib/escalation-rules.service.ts`

---

## P0 Block 7: Financial Reporting

### Phase 7.1: Period Management

- [ ] **RPT-001** Create `FinancialPeriodService`
  - Define accounting periods (monthly, quarterly, annual)
  - Close period (lock from new entries, enable reporting)
  - Reopen period (if needed for corrections)
  - Support multi-year comparative analysis
  - Link: `src/lib/financial-period.service.ts`

- [ ] **RPT-002** Build Period Management UI
  - Location: Business Desktop → Finance → Period Management
  - Create new period
  - Set period dates
  - View open/closed periods
  - Close button (preview impact before confirm)
  - Reopen button (restricted to admin)

### Phase 7.2: Financial Statement Export

- [ ] **RPT-003** Implement financial statement export
  - Format options: PDF, Excel, JSON
  - Include: trial balance, balance sheet, income statement
  - Multi-period comparison
  - Timestamp and sign-off fields
  - Link: `FinancialStatementsViewer.tsx`

- [ ] **RPT-004** Implement accounting export for external audit
  - General ledger detail export (all transactions)
  - Chart of accounts export
  - Journal entry export (with supporting docs)
  - Trial balance export
  - Format: CSV/Excel suitable for auditor import
  - Link: `src/lib/accounting-export.service.ts`

---

## Implementation Sequence (Recommended)

**Week 1:**
- GL-001 to GL-003: Chart of Accounts foundation
- CH-001 to CH-003: Charge templates and automation
- PA-001 to PA-003: Payment allocation

**Week 2:**
- GL-004 to GL-007: Journal entry workflows
- BR-001 to BR-004: Bank reconciliation UI
- AR-001 to AR-003: Collections queue

**Week 3:**
- GL-008 to GL-011: Financial statements
- PC-001 to PC-006: Procurement workflow
- AR-004 to AR-008: Collections advanced

**Week 4:**
- PC-007 to PC-010: Procurement completion
- SLA-001 to SLA-009: Vendor SLA
- RPT-001 to RPT-004: Financial reporting

---

## Success Criteria

- ✅ All GL transactions immutable and reversible
- ✅ All charges and payments balanced to GL
- ✅ Bank reconciliation completes monthly
- ✅ Procurement 3-way match gates payment
- ✅ Vendor SLA breaches escalate automatically
- ✅ Collections queue prioritizes by risk
- ✅ Financial statements export cleanly
- ✅ Audit trail 100% complete for all finance operations

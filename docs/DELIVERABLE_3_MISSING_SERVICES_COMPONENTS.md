# DELIVERABLE 3: Missing Service Classes & Components

**Date:** 2026-08-21  
**Status:** Specification audit; implementation plan for missing services  
**Purpose:** Identify all service classes and UI components required by spec but not yet in codebase

---

## Critical Missing Services (Blocking P0)

### Tier 1: Financial Core (DO FIRST)

#### 1. ChartOfAccountsService
**Purpose:** CRUD operations for Chart of Accounts (COA), parent-child relationships, archiving  
**Status:** ❌ Missing

**Required methods:**
```typescript
class ChartOfAccountsService {
  // Create account with type (Asset/Liability/Equity/Revenue/Expense)
  createAccount(input: {
    organizationId: string;
    accountCode: string;
    accountName: string;
    accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    balanceType: 'debit' | 'credit';
    description?: string;
    parentAccountId?: string;
  }): Promise<CoaAccount>;

  // List all accounts, optionally filtered
  listAccounts(organizationId: string, filters?: {
    accountType?: string;
    status?: 'active' | 'archived';
    parentAccountId?: string;
  }): Promise<CoaAccount[]>;

  // Get single account detail
  getAccount(accountId: string): Promise<CoaAccount>;

  // Update account (name, description only; code is immutable)
  updateAccount(accountId: string, update: {
    accountName?: string;
    description?: string;
  }): Promise<CoaAccount>;

  // Archive account (soft delete)
  archiveAccount(accountId: string, reason: string): Promise<void>;

  // Get account balance as of date
  getAccountBalance(accountId: string, asOfDate: Date): Promise<{
    accountId: string;
    debitBalance: number;
    creditBalance: number;
    netBalance: number;
  }>;

  // Validate account structure (no orphaned parents, codes unique)
  validateChartStructure(organizationId: string): Promise<ValidationResult>;
}
```

**Location:** `src/lib/chart-of-accounts.service.ts`  
**Database:** Uses `coa_accounts` table (already exists in migration)  
**Dependency:** `src/lib/general-ledger.service.ts` for balance queries

---

#### 2. PaymentAllocationService
**Purpose:** Match payments to charges using configurable strategies, GL posting  
**Status:** ❌ Missing

**Required methods:**
```typescript
type AllocationStrategy = 'oldest_first' | 'priority_order' | 'manual';

class PaymentAllocationService {
  // Allocate payment to charges
  allocatePayment(input: {
    paymentId: string;
    organizationId: string;
    strategy: AllocationStrategy;
    manualAllocations?: Array<{ chargeId: string; allocatedAmount: number }>;
  }): Promise<AllocationResult>;

  // Get suggested allocation (AI-driven or rule-based)
  suggestAllocation(paymentId: string, strategy: AllocationStrategy): Promise<SuggestedAllocation>;

  // Apply allocation and post GL entries
  applyAllocation(allocationId: string, approvedBy: string): Promise<void>;

  // Reverse an allocation (undo payment application)
  reverseAllocation(input: {
    allocationId: string;
    reason: string;
    reversedBy: string;
  }): Promise<void>;

  // Get payment allocation history
  getAllocationHistory(paymentId: string): Promise<PaymentAllocation[]>;

  // Reconcile actual vs allocated for variance tracking
  reconcileAllocations(organizationId: string, periodEnd: Date): Promise<AllocationReconciliation>;
}
```

**Location:** `src/lib/payment-allocation.service.ts`  
**Database:** 
- `payment_allocations` table (new)
- `charge_satisfactions` table (new, many-to-many)
- GL posting to `organization_ledger`

---

#### 3. ChargeGenerationService
**Purpose:** Automated recurring charge creation from templates on schedule  
**Status:** ❌ Missing

**Required methods:**
```typescript
class ChargeGenerationService {
  // Generate charges for a specific lease
  generateChargesForLease(input: {
    leaseId: string;
    chargeTemplateIds: string[];
    forMonth: Date; // e.g., 2026-08-01 means generate for August
  }): Promise<GeneratedCharges>;

  // Bulk generate for organization (run daily/monthly)
  generateChargesForOrganization(organizationId: string, forMonth: Date): Promise<BulkGenerationResult>;

  // Handle vacancy: skip charge generation for vacant units
  checkVacancyAndSkip(unitId: string, chargeDate: Date): Promise<boolean>;

  // Prorate charge for partial-month occupancy
  prorateCharge(input: {
    baseAmount: number;
    moveInDate?: Date;
    moveOutDate?: Date;
    monthDays: number;
  }): Promise<number>;

  // Get next generation schedule
  getNextGenerationDate(organizationId: string): Promise<Date>;

  // Audit trail: what charges were generated
  getGenerationAuditLog(organizationId: string, forMonth: Date): Promise<ChargeAuditLog[]>;
}
```

**Location:** `src/lib/charge-generation.service.ts`  
**Worker:** `scripts/workers/charge-generation-worker.ts` (scheduled job)  
**Database:** 
- `charge_generation_logs` table (audit trail)
- Updates `charges` table with new charge entries

---

#### 4. BankReconciliationUIService
**Purpose:** Support complex multi-transaction matching and variance tracking  
**Status:** ⚠️ Partial (core logic exists, UI missing)

**Existing but needs completion:**
- Auto-matching logic ✅
- Manual matching ✅
- **Missing:** UI state management, variance recording, completion flow

**Location:** Service exists, needs UI enhancements  
**UI Component:** `src/app/pages/workspace/BankReconciliationUI.tsx` (new or enhance existing)

---

#### 5. LedgerReversalService
**Purpose:** Post reversing entries for GL corrections without deleting originals  
**Status:** ❌ Missing

**Required methods:**
```typescript
class LedgerReversalService {
  // Create reversing entry for posted journal entry
  reverseJournalEntry(input: {
    originalEntryId: string;
    reason: string;
    reversedBy: string;
    reversalDate: Date;
  }): Promise<JournalEntry>;

  // Create reversing entry for erroneous GL posting
  reverseGLPosting(input: {
    postingId: string;
    reason: string;
    reversedBy: string;
  }): Promise<void>;

  // Validate reversal doesn't create imbalance
  validateReversalImpact(originalEntryId: string): Promise<ValidationResult>;

  // Get reversal audit trail
  getReversalHistory(originalEntryId: string): Promise<ReversalRecord[]>;

  // Deprecation: auto-reverse entries (scheduled job)
  autoReverseDeprecatedEntries(organizationId: string): Promise<number>;
}
```

**Location:** `src/lib/ledger-reversal.service.ts`  
**Database:** Uses `journal_entries` with `reversed_entry_id` foreign key

---

### Tier 2: Collections & Arrears (BLOCKS REVENUE OPERATIONS)

#### 6. CollectionsQueueService
**Purpose:** Priority queue for overdue accounts, contact tracking, follow-up management  
**Status:** ❌ Missing

**Required methods:**
```typescript
class CollectionsQueueService {
  // Get collections queue filtered by priority/aging
  getCollectionsQueue(organizationId: string, filters?: {
    agingBucket?: '1_30' | '31_60' | '61_90' | '90_plus';
    assignedTo?: string;
    status?: 'new' | 'contacted' | 'promise' | 'plan' | 'escalated';
    limit?: number;
    offset?: number;
  }): Promise<CollectionCase[]>;

  // Calculate priority score for sorting
  calculateCasePriority(caseData: {
    daysOverdue: number;
    amount: number;
    previousAttempts: number;
    escalationLevel: number;
  }): number;

  // Log contact attempt
  logContactAttempt(input: {
    caseId: string;
    method: 'call' | 'sms' | 'email' | 'in_person' | 'whatsapp';
    outcome: 'connected' | 'no_answer' | 'promised' | 'paid_partial' | 'declined';
    notes?: string;
    nextFollowUp?: Date;
    loggedBy: string;
  }): Promise<ContactAttempt>;

  // Update case status
  updateCaseStatus(caseId: string, status: string, notes?: string): Promise<void>;

  // Get case detail with full history
  getCaseDetail(caseId: string): Promise<CollectionCaseDetail>;

  // Assign case to collections officer
  assignCase(caseId: string, assignedToUserId: string): Promise<void>;

  // Get collections metrics
  getCollectionsMetrics(organizationId: string, period: 'week' | 'month' | 'quarter'): Promise<{
    totalOverdue: number;
    casesInProgress: number;
    collectionsRate: number;
    averageFollowUpTime: number;
    topReasonsForArrears: Array<{ reason: string; count: number }>;
  }>;
}
```

**Location:** `src/lib/collections-queue.service.ts`  
**Database:**
- `collection_cases` table (new)
- `contact_attempts` table (new)
- Links to `lease_charges`, `payments`, `customers`

---

#### 7. PromiseToPayService
**Purpose:** Track and verify customer payment promises, escalate if missed  
**Status:** ❌ Missing

**Required methods:**
```typescript
class PromiseToPayService {
  // Record a promise-to-pay commitment
  recordPromise(input: {
    caseId: string;
    promisedAmount: number;
    promisedDate: Date;
    promisedBy: string; // customer name
    verifiedBy: string; // collections officer
  }): Promise<PromiseToPayRecord>;

  // Verify promise was kept (payment received)
  verifyPromiseKept(promiseId: string, paymentId: string): Promise<void>;

  // Escalate if promise broken
  escalatePromiseBreach(promiseId: string, escalationReason: string): Promise<void>;

  // Get promise history for case
  getPromiseHistory(caseId: string): Promise<PromiseToPayRecord[]>;

  // Identify broken promises for today
  getBreachedPromises(organizationId: string): Promise<BreachiPromises[]>;

  // Statistics: promise-to-payment conversion rate
  getPromiseMetrics(organizationId: string): Promise<{
    totalPromises: number;
    promptlyKept: number;
    latePayments: number;
    brokenPromises: number;
    conversionRate: number;
  }>;
}
```

**Location:** `src/lib/promise-to-pay.service.ts`  
**Database:**
- `promises_to_pay` table (new)
- Links to `collection_cases`, `payments`

---

#### 8. PaymentPlanService
**Purpose:** Create structured payment plans for arrears, track installments  
**Status:** ❌ Missing

**Required methods:**
```typescript
class PaymentPlanService {
  // Create payment plan from outstanding balance
  createPaymentPlan(input: {
    caseId: string;
    totalAmount: number;
    installmentCount: number;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    startDate: Date;
    createdBy: string;
  }): Promise<PaymentPlan>;

  // Generate installment schedule
  generateInstallmentSchedule(totalAmount: number, installmentCount: number, frequency: string, startDate: Date): Promise<Installment[]>;

  // Get plan details
  getPlan(planId: string): Promise<PaymentPlan>;

  // Get installments for plan
  getPlanInstallments(planId: string): Promise<Installment[]>;

  // Record installment payment
  recordInstallmentPayment(installmentId: string, paymentId: string, amountPaid: number): Promise<void>;

  // Track installment status
  updateInstallmentStatus(installmentId: string, status: 'upcoming' | 'due' | 'paid' | 'overdue' | 'waived'): Promise<void>;

  // Check for missed installments
  getMissedInstallments(organizationId: string): Promise<Installment[]>;

  // Statistics: plan compliance rate
  getPlanMetrics(organizationId: string): Promise<{
    activePlans: number;
    completedPlans: number;
    defaultedPlans: number;
    complianceRate: number;
  }>;
}
```

**Location:** `src/lib/payment-plan.service.ts`  
**Database:**
- `payment_plans` table (new)
- `installments` table (new)
- Links to `collection_cases`

---

#### 9. CollectionsAutomationService
**Purpose:** Rule-based automation for collections workflow (reminders, escalation, communication)  
**Status:** ❌ Missing

**Required methods:**
```typescript
class CollectionsAutomationService {
  // Define automation rule
  createRule(input: {
    organizationId: string;
    triggerType: 'no_payment' | 'promise_missed' | 'installment_missed' | 'days_overdue';
    triggerValue?: number; // days or threshold
    action: 'send_sms' | 'send_email' | 'escalate_to_manager' | 'create_task' | 'flag_for_review';
    actionDetails?: object; // message template, recipient, etc
    isActive: boolean;
  }): Promise<AutomationRule>;

  // Evaluate rules and execute actions
  evaluateAndExecuteRules(organizationId: string): Promise<ExecutionLog[]>;

  // Get active rules for organization
  listRules(organizationId: string): Promise<AutomationRule[]>;

  // Update rule
  updateRule(ruleId: string, updates: Partial<AutomationRule>): Promise<void>;

  // Delete rule
  deleteRule(ruleId: string): Promise<void>;

  // Get audit log of rule executions
  getRuleExecutionLog(organizationId: string, ruleId?: string): Promise<ExecutionLog[]>;

  // Simulate rule evaluation (dry run)
  simulateRules(organizationId: string): Promise<SimulationResult>;
}
```

**Location:** `src/lib/collections-automation.service.ts`  
**Worker:** Can be integrated into Collections Queue or separate scheduled job  
**Database:**
- `collections_automation_rules` table (new)
- `automation_execution_log` table (new)

---

### Tier 3: Procurement (BLOCKS MAINTENANCE PAYMENTS)

#### 10. ProcurementApprovalService
**Purpose:** Route purchase requests through approval chain based on amount/type  
**Status:** ❌ Missing

**Required methods:**
```typescript
class ProcurementApprovalService {
  // Route request to approver based on amount and thresholds
  routeForApproval(requestId: string): Promise<ApprovalRouting>;

  // Get approval thresholds for organization
  getApprovalThresholds(organizationId: string): Promise<{
    manager: number; // amount in minor units
    director: number;
    cfo: number;
  }>;

  // Record approval
  recordApproval(input: {
    requestId: string;
    approvedBy: string;
    approvedAmount: number;
    notes?: string;
  }): Promise<void>;

  // Record rejection
  recordRejection(input: {
    requestId: string;
    rejectedBy: string;
    reason: string;
  }): Promise<void>;

  // Get approval status
  getApprovalStatus(requestId: string): Promise<ApprovalStatus>;

  // Validate budget available
  validateBudget(input: {
    organizationId: string;
    departmentId?: string;
    requestedAmount: number;
    periodMonth: Date;
  }): Promise<{
    approved: boolean;
    availableBudget: number;
    spentThisMonth: number;
  }>;

  // Get pending approvals for user
  getPendingApprovals(userId: string): Promise<ApprovalRequest[]>;
}
```

**Location:** `src/lib/procurement-approval.service.ts`  
**Database:**
- `purchase_requests` table (new)
- `purchase_approvals` table (new)
- `budget_allocations` table (links to GL accounts)

---

#### 11. PurchaseOrderService
**Purpose:** Generate, track, and manage purchase orders through fulfillment  
**Status:** ⚠️ Partial (referenced in UI, needs full implementation)

**Required methods:**
```typescript
class PurchaseOrderService {
  // Create PO from approved request/quote
  createPurchaseOrder(input: {
    requestId: string;
    vendorId: string;
    quotedAmount: number;
    expectedDeliveryDate: Date;
    poItems: Array<{ itemDescription: string; quantity: number; unitPrice: number }>;
    createdBy: string;
  }): Promise<PurchaseOrder>;

  // Generate PO number (auto-increment)
  generatePONumber(organizationId: string): Promise<string>;

  // Send PO to vendor (notification)
  sendPOToVendor(poId: string, vendorEmail: string): Promise<void>;

  // Update PO status
  updatePOStatus(poId: string, status: 'sent' | 'acknowledged' | 'in_progress' | 'partial' | 'received' | 'closed'): Promise<void>;

  // Post GL entry for PO
  postGLEntry(poId: string): Promise<void>; // Debit Prepaid/Asset, Credit A/P

  // Get PO with items
  getPurchaseOrder(poId: string): Promise<PurchaseOrderDetail>;

  // List POs by status
  listPurchaseOrders(organizationId: string, filters?: { status?: string; vendorId?: string }): Promise<PurchaseOrder[]>;

  // Link to maintenance job (for traceability)
  linkToMaintenanceJob(poId: string, jobId: string): Promise<void>;
}
```

**Location:** `src/lib/purchase-order.service.ts`  
**Database:**
- `purchase_orders` table (new)
- `purchase_order_items` table (new)
- `purchase_order_gl_postings` table (for GL audit trail)

---

#### 12. GoodsReceiptService
**Purpose:** Record received goods, track discrepancies vs PO  
**Status:** ❌ Missing

**Required methods:**
```typescript
class GoodsReceiptService {
  // Create GRN from PO
  createGoodsReceipt(input: {
    poId: string;
    receivedDate: Date;
    receivedBy: string;
    grItems: Array<{
      poLineId: string;
      quantityReceived: number;
      conditionNotes?: string;
    }>;
    photoEvidenceUrls?: string[];
  }): Promise<GoodsReceiptNote>;

  // Generate GRN number
  generateGRNNumber(organizationId: string): Promise<string>;

  // Record discrepancy (over/under delivery)
  recordDiscrepancy(input: {
    grnId: string;
    lineId: string;
    discrepancyType: 'over_delivery' | 'under_delivery' | 'damaged' | 'wrong_item';
    quantity: number;
    notes: string;
  }): Promise<void>;

  // Get GRN details
  getGoodsReceipt(grnId: string): Promise<GoodsReceiptDetail>;

  // List GRNs by status
  listGoodsReceipts(organizationId: string, filters?: { status?: string; poId?: string }): Promise<GoodsReceiptNote[]>;

  // Close GRN (receipt complete)
  closeGoodsReceipt(grnId: string): Promise<void>;

  // Get discrepancies for invoice matching
  getGRNDiscrepancies(grnId: string): Promise<Discrepancy[]>;
}
```

**Location:** `src/lib/goods-receipt.service.ts`  
**Database:**
- `goods_receipt_notes` table (new)
- `grn_items` table (new)
- `receipt_discrepancies` table (new)

---

#### 13. InvoiceMatchingService
**Purpose:** 3-way match (PO = GRN ≈ Invoice), flag variances, GL posting  
**Status:** ❌ Missing

**Required methods:**
```typescript
class InvoiceMatchingService {
  // Record vendor invoice
  recordInvoice(input: {
    poId: string;
    invoiceNumber: string;
    invoiceDate: Date;
    invoiceAmount: number;
    vendorName: string;
    receivedDate?: Date;
  }): Promise<VendorInvoice>;

  // 3-way match: validate PO qty = GRN qty ≈ Invoice price
  performThreeWayMatch(input: {
    poId: string;
    grnId: string;
    invoiceId: string;
  }): Promise<MatchResult>;

  // Flag variance and determine resolution
  recordVariance(input: {
    matchId: string;
    varianceType: 'price_variance' | 'quantity_mismatch' | 'missing_doc' | 'other';
    varianceAmount?: number;
    tolerancePercent?: number; // e.g., 2% price variance acceptable
    resolution: 'approve' | 'reject' | 'hold_for_review';
    notes: string;
  }): Promise<void>;

  // Approve match (enables payment)
  approveMatch(matchId: string, approvedBy: string): Promise<void>;

  // Post GL entry for matched invoice
  postGLEntry(matchId: string): Promise<void>; // Move from Prepaid to Expense, Credit A/P

  // Get match detail
  getMatchDetail(matchId: string): Promise<MatchDetail>;

  // List matches pending approval
  getPendingMatches(organizationId: string): Promise<PendingMatch[]>;

  // Statistics: match compliance
  getMatchMetrics(organizationId: string, period: 'month' | 'quarter'): Promise<{
    totalInvoices: number;
    perfectMatches: number;
    varianceMatches: number;
    rejectedMatches: number;
    complianceRate: number;
  }>;
}
```

**Location:** `src/lib/invoice-matching.service.ts`  
**Database:**
- `vendor_invoices` table (new)
- `invoice_matching` table (new, many-to-one with PO/GRN/Invoice)
- `invoice_variances` table (new)

---

### Tier 4: Vendor SLA & Performance (SUPPORTS MAINTENANCE QUALITY)

#### 14. VendorPerformanceService
**Purpose:** Calculate vendor metrics, track performance trends, provide recommendations  
**Status:** ⚠️ Partial (exists but needs completion)

**Enhanced methods needed:**
```typescript
class VendorPerformanceService {
  // Calculate performance for vendor for a month
  calculateMonthlyPerformance(input: {
    vendorId: string;
    organizationId: string;
    periodMonth: Date;
  }): Promise<VendorPerformanceMetrics>;

  // Get historical performance (multi-month)
  getPerformanceHistory(vendorId: string, monthsBack?: number): Promise<PerformanceTimeseries>;

  // Recommend action (renew/review/replace)
  getPerformanceRecommendation(vendorId: string): Promise<{
    recommendation: 'renew' | 'review' | 'replace';
    reasoning: string;
    scorecard: PerformanceScorecard;
  }>;

  // Get vendor scorecard
  getScorecard(vendorId: string, period: 'month' | 'quarter' | 'year'): Promise<PerformanceScorecard>;

  // Benchmark vendor against peers
  benchmarkVendor(vendorId: string, tradeType?: string): Promise<BenchmarkResult>;

  // Cost trend analysis
  getCostTrend(vendorId: string, monthsBack?: number): Promise<CostTrendAnalysis>;

  // Quality issue tracking
  getQualityIssues(vendorId: string): Promise<QualityIssue[]>;

  // Vendor comparison for quote evaluation
  compareVendors(tradeType: string, organizationId: string): Promise<VendorComparison[]>;
}
```

**Location:** `src/lib/vendor-performance.service.ts` (extends existing)

---

### Tier 5: Financial Reporting & Automation

#### 15. FinancialPeriodService
**Purpose:** Define accounting periods, lock/unlock for reporting, support multi-year comparisons  
**Status:** ❌ Missing

**Required methods:**
```typescript
class FinancialPeriodService {
  // Create accounting period
  createPeriod(input: {
    organizationId: string;
    periodType: 'monthly' | 'quarterly' | 'annual';
    periodStart: Date;
    periodEnd: Date;
  }): Promise<FinancialPeriod>;

  // Close period (lock from new entries, enable reporting)
  closePeriod(periodId: string, closedBy: string): Promise<void>;

  // Reopen period (restricted to admin only)
  reopenPeriod(periodId: string, reason: string, reopenedBy: string): Promise<void>;

  // Get period status
  getPeriodStatus(periodId: string): Promise<{
    isOpen: boolean;
    canReceiveEntries: boolean;
    canBeReopened: boolean;
    lastModified: Date;
  }>;

  // Get current/active period
  getCurrentPeriod(organizationId: string): Promise<FinancialPeriod>;

  // List periods for organization
  listPeriods(organizationId: string, filters?: { status?: 'open' | 'closed' }): Promise<FinancialPeriod[]>;

  // Support multi-year comparative analysis
  comparePeriods(periods: FinancialPeriod[]): Promise<PeriodComparison>;
}
```

**Location:** `src/lib/financial-period.service.ts`  
**Database:**
- `financial_periods` table (new)
- `period_close_logs` table (audit trail)

---

#### 16. AccountingExportService
**Purpose:** Export GL data in formats suitable for auditors (CSV, Excel, JSON)  
**Status:** ❌ Missing

**Required methods:**
```typescript
class AccountingExportService {
  // Export general ledger detail
  exportGeneralLedger(input: {
    organizationId: string;
    startDate: Date;
    endDate: Date;
    format: 'csv' | 'excel' | 'json';
  }): Promise<ExportResult>;

  // Export chart of accounts
  exportChartOfAccounts(organizationId: string, format: 'csv' | 'excel' | 'json'): Promise<ExportResult>;

  // Export journal entries with supporting docs
  exportJournalEntries(input: {
    organizationId: string;
    startDate: Date;
    endDate: Date;
    includeReversals: boolean;
    format: 'csv' | 'excel' | 'json';
  }): Promise<ExportResult>;

  // Export trial balance
  exportTrialBalance(input: {
    organizationId: string;
    asOfDate: Date;
    format: 'csv' | 'excel' | 'json';
  }): Promise<ExportResult>;

  // Export balance sheet
  exportBalanceSheet(input: {
    organizationId: string;
    asOfDate: Date;
    comparativePeriod?: Date;
    format: 'csv' | 'excel' | 'pdf';
  }): Promise<ExportResult>;

  // Export income statement
  exportIncomeStatement(input: {
    organizationId: string;
    periodStart: Date;
    periodEnd: Date;
    format: 'csv' | 'excel' | 'pdf';
  }): Promise<ExportResult>;

  // Export for auditor (comprehensive package)
  exportAuditPackage(organizationId: string, periodEnd: Date): Promise<AuditPackage>;

  // Validate export (check for data integrity)
  validateExport(exportData: any): Promise<ValidationResult>;
}
```

**Location:** `src/lib/accounting-export.service.ts`

---

## Missing UI Components

### Financial Dashboard & Administration

1. **ChartOfAccountsAdminUI**
   - Location: `src/app/pages/workspace/ChartOfAccountsAdmin.tsx`
   - Purpose: CRUD for Chart of Accounts
   - Features: Add/edit/archive accounts, hierarchy view, search

2. **JournalEntryManagerUI**
   - Location: `src/app/pages/workspace/JournalEntryManager.tsx`
   - Purpose: Create/post/reverse journal entries
   - Features: Multi-line entry form, posting workflow, reversal tracking

3. **BankReconciliationUI**
   - Location: `src/app/pages/workspace/BankReconciliationUI.tsx`
   - Purpose: Statement upload, transaction matching, variance tracking
   - Features: Drag-to-match interface, auto-match display, completion workflow

4. **FinancialStatementsViewerUI**
   - Location: `src/app/pages/workspace/FinancialStatementsViewer.tsx`
   - Purpose: View/export trial balance, balance sheet, income statement
   - Features: Period selector, multi-period comparison, PDF/Excel export

### Collections & Arrears

5. **CollectionsQueueUI**
   - Location: `src/app/pages/workspace/CollectionsQueue.tsx`
   - Purpose: Priority queue for overdue accounts
   - Features: Aging buckets, priority scoring, contact attempt logging, follow-up tracking

6. **CollectionsCaseDetailUI**
   - Location: `src/app/pages/workspace/CollectionsCaseDetail.tsx`
   - Purpose: Detailed view of single collections case
   - Features: Payment history, contact attempts, promise-to-pay, payment plan creation

7. **CollectionsDashboardUI**
   - Location: `src/app/pages/workspace/CollectionsDashboard.tsx`
   - Purpose: High-level metrics and trends
   - Features: Aging analysis, collection rate, touch frequency, top reasons for arrears

### Procurement Workflow

8. **PurchaseRequestFormUI**
   - Location: `src/app/pages/workspace/PurchaseRequestForm.tsx`
   - Purpose: Create/submit purchase request
   - Features: Budget checking, approval routing preview, links to maintenance jobs

9. **QuoteComparisonUI**
   - Location: `src/app/pages/workspace/QuoteComparisonUI.tsx`
   - Purpose: Display quotes from multiple vendors
   - Features: Price comparison, quality metrics, recommendation, accept/reject

10. **GoodsReceiptUI**
    - Location: `src/app/pages/workspace/GoodsReceiptUI.tsx`
    - Purpose: Record received goods against PO
    - Features: Line-by-line receipt, discrepancy recording, photo upload, GRN generation

11. **InvoiceMatchingUI**
    - Location: `src/app/pages/workspace/InvoiceMatchingUI.tsx`
    - Purpose: 3-way match display and variance handling
    - Features: Match status indicator, variance details, approve/reject, GL posting audit

12. **ProcurementDashboardUI**
    - Location: `src/app/pages/workspace/ProcurementDashboard.tsx`
    - Purpose: Overview of procurement pipeline
    - Features: Stage breakdown, vendor metrics, budget tracking, 3-way match status

### Vendor SLA & Performance

13. **VendorPerformanceDashboardUI**
    - Location: `src/app/pages/workspace/VendorPerformanceDashboard.tsx`
    - Purpose: Vendor scorecard and performance trends
    - Features: On-time %, response time, quality score, recommendation, benchmark

14. **SLAAlertDashboardUI**
    - Location: `src/app/pages/workspace/SLAAlertDashboard.tsx`
    - Purpose: Display active/breached SLAs
    - Features: Breach severity display, acknowledge button, escalation history

---

## Database Schema Additions Required

```sql
-- Financial Core
CREATE TABLE coa_accounts (id, organization_id, account_code, account_name, account_type, balance_type, parent_account_id, is_active, ...);
CREATE TABLE journal_entries (id, organization_id, entry_date, description, status, reversed_entry_id, ...);
CREATE TABLE je_lines (id, journal_entry_id, account_id, debit_amount_minor, credit_amount_minor, ...);

-- Charges & Payments
CREATE TABLE charge_templates (id, organization_id, charge_type, gl_account_id, base_amount, frequency, ...);
CREATE TABLE charges (id, unit_id, charge_template_id, due_date, amount_minor, status, ...);
CREATE TABLE payment_allocations (id, payment_id, allocation_strategy, created_at, ...);
CREATE TABLE charge_satisfactions (id, allocation_id, charge_id, allocated_amount_minor, ...);

-- Collections
CREATE TABLE collection_cases (id, organization_id, customer_id, unit_id, total_amount_minor, status, ...);
CREATE TABLE contact_attempts (id, case_id, method, outcome, next_followup_date, ...);
CREATE TABLE promises_to_pay (id, case_id, promised_amount, promised_date, status, ...);
CREATE TABLE payment_plans (id, case_id, total_amount, installment_count, start_date, ...);
CREATE TABLE installments (id, plan_id, due_date, amount_minor, status, ...);

-- Procurement
CREATE TABLE purchase_requests (id, organization_id, requester_id, title, amount, status, ...);
CREATE TABLE purchase_approvals (id, request_id, approver_id, approved_amount, notes, ...);
CREATE TABLE purchase_orders (id, request_id, vendor_id, amount_minor, status, po_number, ...);
CREATE TABLE purchase_order_items (id, po_id, description, quantity, unit_price, ...);
CREATE TABLE goods_receipt_notes (id, po_id, received_date, received_by, status, grn_number, ...);
CREATE TABLE grn_items (id, grn_id, po_line_id, qty_received, notes, ...);
CREATE TABLE vendor_invoices (id, po_id, invoice_number, invoice_date, amount_minor, ...);
CREATE TABLE invoice_matching (id, po_id, grn_id, invoice_id, match_status, ...);

-- Financial Periods
CREATE TABLE financial_periods (id, organization_id, period_type, start_date, end_date, status, ...);
```

---

## Implementation Priority by Blocking Risk

**CRITICAL (Do First):**
- ChartOfAccountsService
- PaymentAllocationService
- ChargeGenerationService
- LedgerReversalService

**HIGH (Do Next):**
- CollectionsQueueService
- ProcurementApprovalService
- PurchaseOrderService
- GoodsReceiptService
- InvoiceMatchingService

**MEDIUM (Do After):**
- PromiseToPayService
- PaymentPlanService
- CollectionsAutomationService
- VendorPerformanceService
- FinancialPeriodService

**LOW (Do Last):**
- AccountingExportService
- Supporting UI components

---

## Estimated Effort (Story Points)

| Service | Complexity | SP |
|---------|-----------|-----|
| ChartOfAccountsService | Medium | 8 |
| PaymentAllocationService | High | 13 |
| ChargeGenerationService | High | 13 |
| LedgerReversalService | Medium | 8 |
| CollectionsQueueService | High | 13 |
| PromiseToPayService | Medium | 8 |
| PaymentPlanService | Medium | 8 |
| CollectionsAutomationService | High | 13 |
| ProcurementApprovalService | Medium | 8 |
| PurchaseOrderService | High | 13 |
| GoodsReceiptService | High | 13 |
| InvoiceMatchingService | High | 13 |
| VendorPerformanceService | Medium | 8 |
| FinancialPeriodService | Low | 5 |
| AccountingExportService | Medium | 8 |
| **Total** | | **169 SP** |

---

## Next Action

Begin with Tier 1 services (ChartOfAccountsService, PaymentAllocationService, ChargeGenerationService, LedgerReversalService). These form the foundation for all P0 finance operations.

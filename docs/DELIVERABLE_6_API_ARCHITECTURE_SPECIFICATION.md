# DELIVERABLE 6: API & Architecture Specification

**Date:** 2026-08-21  
**Status:** Complete service API signatures and system architecture  
**Purpose:** Technical specification for implementation and integration

---

## Part 1: Service API Specifications

### Core Financial Services

#### ChartOfAccountsService
**Location:** `src/lib/chart-of-accounts.service.ts`

```typescript
interface CoaAccount {
  id: string;
  organizationId: string;
  accountCode: string; // Unique per organization
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balanceType: 'debit' | 'credit'; // Normal balance direction
  description?: string;
  parentAccountId?: string; // For account hierarchy
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AccountBalance {
  accountId: string;
  debitBalance: number; // in minor units
  creditBalance: number;
  netBalance: number;
  asOfDate: Date;
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{ field: string; message: string }>;
}

class ChartOfAccountsService {
  // Create account with validation
  async createAccount(input: {
    organizationId: string;
    accountCode: string;
    accountName: string;
    accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    balanceType: 'debit' | 'credit';
    description?: string;
    parentAccountId?: string;
  }): Promise<CoaAccount>;

  // Get all accounts for organization
  async listAccounts(
    organizationId: string,
    filters?: {
      accountType?: string;
      status?: 'active' | 'archived';
      parentAccountId?: string;
    }
  ): Promise<CoaAccount[]>;

  // Get single account
  async getAccount(accountId: string): Promise<CoaAccount>;

  // Update account (name, description only)
  async updateAccount(
    accountId: string,
    update: {
      accountName?: string;
      description?: string;
    }
  ): Promise<CoaAccount>;

  // Soft delete (archive)
  async archiveAccount(accountId: string, reason: string): Promise<void>;

  // Get balance as of date
  async getAccountBalance(
    accountId: string,
    asOfDate: Date
  ): Promise<AccountBalance>;

  // Validate hierarchy integrity
  async validateChartStructure(
    organizationId: string
  ): Promise<ValidationResult>;

  // Get account with balance
  async getAccountWithBalance(
    accountId: string,
    asOfDate: Date
  ): Promise<CoaAccount & AccountBalance>;
}
```

**Database Tables:**
```sql
CREATE TABLE coa_accounts (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  account_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL, -- asset, liability, equity, revenue, expense
  balance_type VARCHAR(10) NOT NULL, -- debit, credit
  description TEXT,
  parent_account_id UUID REFERENCES coa_accounts(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, account_code),
  CONSTRAINT account_type_valid CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  CONSTRAINT balance_type_valid CHECK (balance_type IN ('debit', 'credit'))
);

CREATE INDEX idx_coa_organization_active ON coa_accounts(organization_id, is_active);
CREATE INDEX idx_coa_parent ON coa_accounts(parent_account_id);
```

**Error Handling:**
- AccountCodeNotUniqueError: Account code already exists for org
- ParentAccountNotFoundError: Parent account ID doesn't exist
- InvalidAccountTypeError: Account type not in allowed list
- ArchiveActiveAccountsError: Cannot archive account with sub-accounts

---

#### GeneralLedgerService
**Location:** `src/lib/general-ledger.service.ts`

```typescript
interface JournalEntry {
  id: string;
  organizationId: string;
  entryDate: Date;
  description: string;
  status: 'draft' | 'posted' | 'reversed';
  reversedEntryId?: string; // If this is a reversal
  createdBy: string; // User ID
  postedBy?: string;
  postedAt?: Date;
  lines: JELine[];
  createdAt: Date;
  updatedAt: Date;
}

interface JELine {
  id: string;
  journalEntryId: string;
  accountId: string;
  debitAmountMinor: number; // 0 if credit
  creditAmountMinor: number; // 0 if debit
  description?: string;
}

interface PostingResult {
  success: boolean;
  journalEntryId: string;
  glPostingId?: string;
  error?: string;
}

interface TrialBalance {
  organizationId: string;
  asOfDate: Date;
  accounts: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    accountType: string;
    debitTotal: number;
    creditTotal: number;
    netBalance: number;
  }>;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

class GeneralLedgerService {
  // Create draft journal entry
  async createJournalEntry(input: {
    organizationId: string;
    entryDate: Date;
    description: string;
    lines: Array<{
      accountId: string;
      debitAmountMinor?: number;
      creditAmountMinor?: number;
      description?: string;
    }>;
    createdBy: string;
  }): Promise<JournalEntry>;

  // Validate entry (debit = credit)
  async validateJournalEntry(entryId: string): Promise<ValidationResult>;

  // Post entry to GL (moves from draft to posted, immutable)
  async postJournalEntry(
    entryId: string,
    postedBy: string
  ): Promise<PostingResult>;

  // Reverse posted entry (create offset entry)
  async reverseJournalEntry(input: {
    originalEntryId: string;
    reason: string;
    reversedBy: string;
    reversalDate: Date;
  }): Promise<JournalEntry>;

  // Get entry with lines
  async getJournalEntry(entryId: string): Promise<JournalEntry>;

  // List entries for organization
  async listJournalEntries(
    organizationId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      status?: 'draft' | 'posted' | 'reversed';
      accountId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<JournalEntry[]>;

  // Get GL detail ledger (all postings for account)
  async getGeneralLedger(
    organizationId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      accountId?: string;
    }
  ): Promise<Array<{
    postingDate: Date;
    description: string;
    accountCode: string;
    debit: number;
    credit: number;
    balance: number;
    referenceType: string; // journal_entry, payment, charge, etc
    referenceId: string;
  }>>;

  // Get trial balance as of date
  async getTrialBalance(
    organizationId: string,
    asOfDate: Date
  ): Promise<TrialBalance>;

  // Verify GL is balanced
  async verifyGLBalance(organizationId: string): Promise<{
    isBalanced: boolean;
    totalDebits: number;
    totalCredits: number;
    difference: number;
  }>;

  // Get account balance as of date
  async getAccountBalance(
    accountId: string,
    asOfDate: Date
  ): Promise<{ debit: number; credit: number; net: number }>;
}
```

**Database Tables:**
```sql
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entry_date DATE NOT NULL,
  description VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL, -- draft, posted, reversed
  reversed_entry_id UUID REFERENCES journal_entries(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT status_valid CHECK (status IN ('draft', 'posted', 'reversed'))
);

CREATE TABLE je_lines (
  id UUID PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES coa_accounts(id),
  debit_amount_minor BIGINT DEFAULT 0,
  credit_amount_minor BIGINT DEFAULT 0,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT amount_valid CHECK (debit_amount_minor = 0 OR credit_amount_minor = 0)
);

CREATE TABLE gl_postings (
  id UUID PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id),
  account_id UUID NOT NULL REFERENCES coa_accounts(id),
  posting_date DATE NOT NULL,
  debit_amount_minor BIGINT DEFAULT 0,
  credit_amount_minor BIGINT DEFAULT 0,
  balance_after_posting BIGINT, -- running balance for account
  reference_type VARCHAR(100), -- payment, charge, reversal
  reference_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_je_organization_status ON journal_entries(organization_id, status);
CREATE INDEX idx_je_lines_account ON je_lines(account_id);
CREATE INDEX idx_gl_postings_account_date ON gl_postings(account_id, posting_date);
```

**Error Handling:**
- JournalEntryUnbalancedError: Debits ≠ Credits
- JournalEntryAlreadyPostedError: Cannot modify posted entry
- AccountNotFoundError: Account ID doesn't exist
- TrialBalanceImbalancedError: GL is out of balance

---

#### PaymentAllocationService
**Location:** `src/lib/payment-allocation.service.ts`

```typescript
type AllocationStrategy = 'oldest_first' | 'priority_order' | 'manual';

interface PaymentAllocation {
  id: string;
  paymentId: string;
  organizationId: string;
  strategy: AllocationStrategy;
  status: 'suggested' | 'approved' | 'applied' | 'reversed';
  totalAllocatedMinor: number;
  createdAt: Date;
  appliedAt?: Date;
  appliedBy?: string;
}

interface ChargeSatisfaction {
  id: string;
  allocationId: string;
  chargeId: string;
  allocatedAmountMinor: number;
  remainingBalanceMinor: number;
}

interface SuggestedAllocation {
  strategy: AllocationStrategy;
  suggestedAllocations: Array<{
    chargeId: string;
    chargeDescription: string;
    amountDueMinor: number;
    suggestedAllocationMinor: number;
    priority: number; // 1 = highest priority
  }>;
}

interface AllocationResult {
  paymentId: string;
  allocationId: string;
  allocatedCharges: Array<{
    chargeId: string;
    allocatedAmountMinor: number;
  }>;
  unallocatedAmountMinor: number;
  glPostingId?: string;
}

class PaymentAllocationService {
  // Allocate payment to charges
  async allocatePayment(input: {
    paymentId: string;
    organizationId: string;
    strategy: AllocationStrategy;
    manualAllocations?: Array<{ chargeId: string; allocatedAmount: number }>;
  }): Promise<AllocationResult>;

  // Get suggested allocation
  async suggestAllocation(
    paymentId: string,
    strategy: AllocationStrategy
  ): Promise<SuggestedAllocation>;

  // Apply allocation (post GL entries)
  async applyAllocation(
    allocationId: string,
    approvedBy: string
  ): Promise<void>;

  // Reverse allocation (undo posting)
  async reverseAllocation(input: {
    allocationId: string;
    reason: string;
    reversedBy: string;
  }): Promise<void>;

  // Get allocation history for payment
  async getAllocationHistory(paymentId: string): Promise<PaymentAllocation[]>;

  // Get charge satisfactions (what charged against what)
  async getChargeSatisfactions(
    chargeId: string
  ): Promise<ChargeSatisfaction[]>;

  // Reconcile allocations for period
  async reconcileAllocations(
    organizationId: string,
    periodEnd: Date
  ): Promise<{
    totalPayments: number;
    allocatedAmount: number;
    unallocatedAmount: number;
    variance: number;
    variancePercent: number;
  }>;
}
```

**Database Tables:**
```sql
CREATE TABLE payment_allocations (
  id UUID PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES payments(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  strategy VARCHAR(50) NOT NULL, -- oldest_first, priority_order, manual
  status VARCHAR(50) NOT NULL, -- suggested, approved, applied, reversed
  total_allocated_minor BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  applied_at TIMESTAMP,
  applied_by UUID REFERENCES auth.users(id),
  reversed_at TIMESTAMP,
  reversed_by UUID REFERENCES auth.users(id),
  reversal_reason VARCHAR(500)
);

CREATE TABLE charge_satisfactions (
  id UUID PRIMARY KEY,
  allocation_id UUID NOT NULL REFERENCES payment_allocations(id),
  charge_id UUID NOT NULL REFERENCES charges(id),
  allocated_amount_minor BIGINT NOT NULL,
  remaining_balance_minor BIGINT NOT NULL, -- charge balance after allocation
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_organization_status ON payment_allocations(organization_id, status);
CREATE INDEX idx_charge_satisfactions_charge ON charge_satisfactions(charge_id);
```

---

#### ChargeGenerationService
**Location:** `src/lib/charge-generation.service.ts`

```typescript
interface GeneratedCharge {
  chargeId: string;
  leaseId: string;
  unitId: string;
  chargeType: string;
  amountMinor: number;
  dueDate: Date;
  period: string; // YYYY-MM
}

interface BulkGenerationResult {
  organizationId: string;
  period: string;
  chargesCreated: number;
  chargesSkipped: number;
  totalAmountMinor: number;
  errors: Array<{
    leaseId: string;
    error: string;
  }>;
}

interface ChargeAuditLog {
  id: string;
  organizationId: string;
  period: string;
  chargeCount: number;
  totalAmountMinor: number;
  generatedAt: Date;
  generatedBy: string; // worker or user
}

class ChargeGenerationService {
  // Generate charges for specific lease
  async generateChargesForLease(input: {
    leaseId: string;
    chargeTemplateIds: string[];
    forMonth: Date; // 1st of month
  }): Promise<GeneratedCharge[]>;

  // Bulk generate for entire organization
  async generateChargesForOrganization(
    organizationId: string,
    forMonth: Date
  ): Promise<BulkGenerationResult>;

  // Check if unit is vacant (skip charge generation)
  async checkVacancyAndSkip(
    unitId: string,
    chargeDate: Date
  ): Promise<boolean>;

  // Prorate charge for partial month
  async prorateCharge(input: {
    baseAmountMinor: number;
    moveInDate?: Date;
    moveOutDate?: Date;
    monthDays: number;
  }): Promise<number>;

  // Get next scheduled generation date
  async getNextGenerationDate(organizationId: string): Promise<Date>;

  // Get generation audit log
  async getGenerationAuditLog(
    organizationId: string,
    forMonth: Date
  ): Promise<ChargeAuditLog[]>;

  // Get generation log with details
  async getGenerationDetail(
    auditLogId: string
  ): Promise<ChargeAuditLog & { charges: GeneratedCharge[] }>;
}
```

**Database Tables:**
```sql
CREATE TABLE charge_templates (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  charge_type VARCHAR(100) NOT NULL, -- rent, service_charge, water, electricity, etc
  description VARCHAR(255),
  base_amount_minor BIGINT NOT NULL,
  frequency VARCHAR(50), -- monthly, quarterly, annual
  gl_account_id UUID NOT NULL REFERENCES coa_accounts(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE charge_generation_logs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  period VARCHAR(7) NOT NULL, -- YYYY-MM
  charge_count INTEGER NOT NULL,
  total_amount_minor BIGINT NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by VARCHAR(100), -- 'worker' or user_id
  errors JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_charge_templates_organization ON charge_templates(organization_id);
CREATE INDEX idx_charge_generation_logs_organization_period ON charge_generation_logs(organization_id, period);
```

**Worker Implementation:**
```typescript
// scripts/workers/charge-generation-worker.ts
export async function chargeGenerationWorker() {
  const orgs = await getOrganizations();
  
  for (const org of orgs) {
    try {
      const forMonth = getFirstOfCurrentMonth();
      const result = await chargeGenerationService.generateChargesForOrganization(
        org.id,
        forMonth
      );
      
      logResult(result);
      notifyIfErrors(org.id, result.errors);
    } catch (error) {
      logError(org.id, error);
      notifyAdmins(org.id, error);
    }
  }
}

// Scheduled: 10 PM daily via cron or serverless trigger
```

---

#### BankReconciliationService
**Location:** `src/lib/bank-reconciliation.service.ts`

```typescript
interface BankAccount {
  id: string;
  organizationId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  currency: string;
  currentBalanceMinor: number;
  lastReconciliationDate?: Date;
  glAccountId: string;
}

interface BankStatement {
  id: string;
  bankAccountId: string;
  statementDate: Date;
  openingBalanceMinor: number;
  closingBalanceMinor: number;
  statementItems: Array<{
    transactionDate: Date;
    description: string;
    amountMinor: number;
    type: 'debit' | 'credit';
  }>;
}

interface TransactionMatch {
  id: string;
  statementItemId: string;
  paymentId: string;
  matchedAmount: number;
  matchType: 'auto' | 'manual';
  matchedAt: Date;
  matchedBy?: string;
}

interface ReconciliationVariance {
  id: string;
  statementId: string;
  varianceType: 'unmatched_payment' | 'unmatched_statement' | 'amount_mismatch';
  amountMinor: number;
  description: string;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

interface ReconciliationResult {
  bankAccountId: string;
  statementDate: Date;
  openingBalance: number;
  closingBalance: number;
  bankBalance: number;
  reconciled: boolean;
  matchedAmount: number;
  unmatchedAmount: number;
  variances: ReconciliationVariance[];
}

class BankReconciliationService {
  // Get bank accounts for organization
  async getBankAccounts(organizationId: string): Promise<BankAccount[]>;

  // Upload bank statement
  async uploadBankStatement(input: {
    bankAccountId: string;
    statementDate: Date;
    openingBalanceMinor: number;
    closingBalanceMinor: number;
    csvData: string; // CSV with transaction lines
  }): Promise<BankStatement>;

  // Auto-match statement items to payments
  async autoMatchTransactions(
    statementId: string
  ): Promise<{
    matchCount: number;
    matchedAmount: number;
    unmatchedItems: number;
  }>;

  // Manual match statement item to payment
  async manualMatchTransaction(input: {
    statementItemId: string;
    paymentId: string;
    matchedBy: string;
  }): Promise<TransactionMatch>;

  // Unmatch a transaction
  async unmatchTransaction(matchId: string): Promise<void>;

  // Record variance
  async recordVariance(input: {
    statementId: string;
    varianceType: string;
    amountMinor: number;
    description: string;
  }): Promise<ReconciliationVariance>;

  // Resolve variance
  async resolveVariance(input: {
    varianceId: string;
    resolution: string;
    resolvedBy: string;
  }): Promise<void>;

  // Complete reconciliation
  async completeReconciliation(
    statementId: string,
    completedBy: string
  ): Promise<ReconciliationResult>;

  // Get reconciliation status
  async getReconciliationStatus(
    statementId: string
  ): Promise<ReconciliationResult>;

  // Post GL entries for reconciliation
  async postReconciliationGL(statementId: string): Promise<void>;
}
```

**Database Tables:**
```sql
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  current_balance_minor BIGINT NOT NULL,
  gl_account_id UUID NOT NULL REFERENCES coa_accounts(id),
  last_reconciliation_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bank_statements (
  id UUID PRIMARY KEY,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  statement_date DATE NOT NULL,
  opening_balance_minor BIGINT NOT NULL,
  closing_balance_minor BIGINT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id)
);

CREATE TABLE bank_statement_items (
  id UUID PRIMARY KEY,
  statement_id UUID NOT NULL REFERENCES bank_statements(id),
  transaction_date DATE NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount_minor BIGINT NOT NULL,
  type VARCHAR(10) NOT NULL, -- debit, credit
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transaction_matches (
  id UUID PRIMARY KEY,
  statement_item_id UUID NOT NULL REFERENCES bank_statement_items(id),
  payment_id UUID NOT NULL REFERENCES payments(id),
  matched_amount_minor BIGINT NOT NULL,
  match_type VARCHAR(20) NOT NULL, -- auto, manual
  matched_at TIMESTAMP DEFAULT NOW(),
  matched_by UUID REFERENCES auth.users(id)
);

CREATE TABLE reconciliation_variances (
  id UUID PRIMARY KEY,
  statement_id UUID NOT NULL REFERENCES bank_statements(id),
  variance_type VARCHAR(100) NOT NULL,
  amount_minor BIGINT NOT NULL,
  description VARCHAR(500),
  resolution VARCHAR(500),
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bank_statements_account_date ON bank_statements(bank_account_id, statement_date);
CREATE INDEX idx_transaction_matches_statement ON transaction_matches(statement_id);
```

---

### Collections Services

#### CollectionsQueueService
**Location:** `src/lib/collections-queue.service.ts`

```typescript
type CaseStatus = 'new' | 'contacted' | 'promise' | 'plan' | 'escalated' | 'resolved' | 'writeoff';
type ContactMethod = 'call' | 'sms' | 'email' | 'in_person' | 'whatsapp';
type ContactOutcome = 'connected' | 'no_answer' | 'promised' | 'paid_partial' | 'declined' | 'invalid_contact';

interface CollectionCase {
  id: string;
  organizationId: string;
  customerId: string;
  unitId: string;
  leaseId: string;
  totalOutstandingMinor: number;
  priorityScore: number; // 0-100, higher = more urgent
  agingBucket: '1_30' | '31_60' | '61_90' | '90_plus';
  status: CaseStatus;
  assignedToUserId?: string;
  attemptCount: number;
  lastAttemptDate?: Date;
  nextFollowUpDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CollectionCaseDetail extends CollectionCase {
  customer: { name: string; phone: string; email: string };
  unit: { address: string; unitNumber: string };
  charges: Array<{
    chargeId: string;
    chargeType: string;
    dueDate: Date;
    amountMinor: number;
    paidMinor: number;
    balanceMinor: number;
    daysOverdue: number;
  }>;
  contactAttempts: ContactAttempt[];
  promisesToPay: PromiseToPayRecord[];
  paymentPlans: PaymentPlan[];
}

interface ContactAttempt {
  id: string;
  caseId: string;
  method: ContactMethod;
  outcome: ContactOutcome;
  notes?: string;
  nextFollowUp?: Date;
  loggedBy: string;
  loggedAt: Date;
}

type PriorityFactors = {
  ageDaysWeight: number; // 30+ days = 40 points
  amountWeight: number; // per 1000 units = 1 point
  attemptWeight: number; // failed attempts = 10 each
  escalationWeight: number; // escalated = +30
};

class CollectionsQueueService {
  // Get queue with filtering
  async getCollectionsQueue(
    organizationId: string,
    filters?: {
      agingBucket?: '1_30' | '31_60' | '61_90' | '90_plus';
      assignedTo?: string;
      status?: CaseStatus;
      priorityMin?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<CollectionCase[]>;

  // Calculate priority score
  async calculateCasePriority(caseData: {
    daysOverdue: number;
    amountMinor: number;
    previousAttempts: number;
    escalationLevel: number;
  }): Promise<number>;

  // Log contact attempt
  async logContactAttempt(input: {
    caseId: string;
    method: ContactMethod;
    outcome: ContactOutcome;
    notes?: string;
    nextFollowUp?: Date;
    loggedBy: string;
  }): Promise<ContactAttempt>;

  // Update case status
  async updateCaseStatus(
    caseId: string,
    status: CaseStatus,
    notes?: string
  ): Promise<void>;

  // Get case detail
  async getCaseDetail(caseId: string): Promise<CollectionCaseDetail>;

  // Assign case to collector
  async assignCase(caseId: string, assignedToUserId: string): Promise<void>;

  // Bulk assign cases
  async bulkAssignCases(
    caseIds: string[],
    assignedToUserId: string
  ): Promise<void>;

  // Get collections metrics
  async getCollectionsMetrics(
    organizationId: string,
    period: 'week' | 'month' | 'quarter'
  ): Promise<{
    totalOverdueMinor: number;
    casesInProgress: number;
    casesResolved: number;
    collectionsRatePercent: number;
    averageFollowUpTimeMinutes: number;
    topReasonsForArrears: Array<{ reason: string; count: number }>;
    teamPerformance: Array<{
      userId: string;
      casesHandled: number;
      amountRecovered: number;
      averageTimePerCase: number;
    }>;
  }>;

  // Get collector workload
  async getCollectorWorkload(userId: string): Promise<{
    assignedCases: number;
    pendingFollowUps: number;
    contactedToday: number;
    contactedThisWeek: number;
  }>;
}
```

**Database Tables:**
```sql
CREATE TABLE collection_cases (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  lease_id UUID NOT NULL REFERENCES leases(id),
  total_outstanding_minor BIGINT NOT NULL,
  priority_score INTEGER DEFAULT 0, -- 0-100
  aging_bucket VARCHAR(20) NOT NULL, -- 1_30, 31_60, 61_90, 90_plus
  status VARCHAR(50) NOT NULL, -- new, contacted, promise, plan, escalated, resolved, writeoff
  assigned_to_user_id UUID REFERENCES auth.users(id),
  attempt_count INTEGER DEFAULT 0,
  last_attempt_date TIMESTAMP,
  next_followup_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE contact_attempts (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES collection_cases(id),
  method VARCHAR(50) NOT NULL, -- call, sms, email, in_person, whatsapp
  outcome VARCHAR(50) NOT NULL,
  notes TEXT,
  next_followup TIMESTAMP,
  logged_by UUID NOT NULL REFERENCES auth.users(id),
  logged_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_collection_cases_organization_priority ON collection_cases(organization_id, priority_score DESC);
CREATE INDEX idx_collection_cases_assigned ON collection_cases(assigned_to_user_id, status);
CREATE INDEX idx_contact_attempts_case ON contact_attempts(case_id);
```

---

#### PromiseToPayService & PaymentPlanService
**(Abbreviated for space; see DELIVERABLE_3 for full signatures)**

```typescript
// PromiseToPayService
interface PromiseToPayRecord {
  id: string;
  caseId: string;
  promisedAmountMinor: number;
  promisedDate: Date;
  verificationStatus: 'pending' | 'kept' | 'broken';
  linkedPaymentId?: string;
  createdAt: Date;
}

class PromiseToPayService {
  async recordPromise(input: {
    caseId: string;
    promisedAmountMinor: number;
    promisedDate: Date;
    promisedBy: string;
    verifiedBy: string;
  }): Promise<PromiseToPayRecord>;

  async verifyPromiseKept(promiseId: string, paymentId: string): Promise<void>;

  async escalatePromiseBreach(promiseId: string, escalationReason: string): Promise<void>;

  async getPromiseHistory(caseId: string): Promise<PromiseToPayRecord[]>;

  async getBreachedPromises(organizationId: string): Promise<PromiseToPayRecord[]>;
}

// PaymentPlanService
interface PaymentPlan {
  id: string;
  caseId: string;
  totalAmountMinor: number;
  installmentCount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  startDate: Date;
  status: 'active' | 'completed' | 'defaulted';
}

interface Installment {
  id: string;
  planId: string;
  dueDate: Date;
  amountMinor: number;
  paidMinor: number;
  status: 'upcoming' | 'due' | 'paid' | 'overdue' | 'waived';
}

class PaymentPlanService {
  async createPaymentPlan(input: {
    caseId: string;
    totalAmountMinor: number;
    installmentCount: number;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    startDate: Date;
    createdBy: string;
  }): Promise<PaymentPlan>;

  async getPlanInstallments(planId: string): Promise<Installment[]>;

  async recordInstallmentPayment(
    installmentId: string,
    paymentId: string,
    amountPaid: number
  ): Promise<void>;
}
```

---

### Procurement Services

#### ProcurementApprovalService & PurchaseOrderService
**(Abbreviated for space)**

```typescript
interface PurchaseRequest {
  id: string;
  organizationId: string;
  requesterId: string;
  title: string;
  description: string;
  amountMinor: number;
  departmentId?: string;
  linkedMaintenanceJobId?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'po_created';
  createdAt: Date;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  requestId?: string;
  vendorId: string;
  amountMinor: number;
  status: 'sent' | 'acknowledged' | 'in_progress' | 'partial' | 'received' | 'closed';
  expectedDeliveryDate: Date;
  items: Array<{ description: string; quantity: number; unitPriceMinor: number }>;
  createdAt: Date;
}

class ProcurementApprovalService {
  async routeForApproval(requestId: string): Promise<ApprovalRouting>;

  async getApprovalThresholds(
    organizationId: string
  ): Promise<{ manager: number; director: number; cfo: number }>;

  async recordApproval(input: {
    requestId: string;
    approvedBy: string;
    approvedAmount: number;
    notes?: string;
  }): Promise<void>;

  async validateBudget(input: {
    organizationId: string;
    departmentId?: string;
    requestedAmount: number;
    periodMonth: Date;
  }): Promise<{ approved: boolean; availableBudget: number }>;
}

class PurchaseOrderService {
  async createPurchaseOrder(input: {
    requestId: string;
    vendorId: string;
    quotedAmount: number;
    expectedDeliveryDate: Date;
    poItems: Array<{
      itemDescription: string;
      quantity: number;
      unitPrice: number;
    }>;
    createdBy: string;
  }): Promise<PurchaseOrder>;

  async generatePONumber(organizationId: string): Promise<string>;

  async sendPOToVendor(poId: string, vendorEmail: string): Promise<void>;

  async updatePOStatus(poId: string, status: string): Promise<void>;

  async postGLEntry(poId: string): Promise<void>;

  async listPurchaseOrders(
    organizationId: string,
    filters?: { status?: string; vendorId?: string }
  ): Promise<PurchaseOrder[]>;
}
```

---

#### InvoiceMatchingService
**(Abbreviated for space)**

```typescript
interface VendorInvoice {
  id: string;
  poId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  amountMinor: number;
  vendorName: string;
  status: 'received' | 'matched' | 'variance_recorded' | 'approved' | 'paid';
}

interface InvoiceMatch {
  id: string;
  poId: string;
  grnId: string;
  invoiceId: string;
  matchStatus: 'perfect' | 'variance' | 'rejected';
  varianceAmountMinor?: number;
  variancePercent?: number;
}

class InvoiceMatchingService {
  async recordInvoice(input: {
    poId: string;
    invoiceNumber: string;
    invoiceDate: Date;
    invoiceAmount: number;
  }): Promise<VendorInvoice>;

  async performThreeWayMatch(input: {
    poId: string;
    grnId: string;
    invoiceId: string;
  }): Promise<InvoiceMatch>;

  async recordVariance(input: {
    matchId: string;
    varianceType: 'price_variance' | 'quantity_mismatch' | 'missing_doc';
    varianceAmountMinor?: number;
    tolerancePercent?: number;
    resolution: 'approve' | 'reject' | 'hold_for_review';
  }): Promise<void>;

  async approveMatch(matchId: string, approvedBy: string): Promise<void>;

  async postGLEntry(matchId: string): Promise<void>;

  async getMatchMetrics(organizationId: string, period: string): Promise<{
    totalInvoices: number;
    perfectMatches: number;
    varianceMatches: number;
    complianceRate: number;
  }>;
}
```

---

## Part 2: System Architecture

### Data Flow Diagrams

#### Payment-to-GL Flow
```
Payment Received (Provider Webhook)
    ↓
Payment Service (Record payment)
    ↓
Payment Allocation Service
    ├─ Suggest allocation (oldest_first | priority | manual)
    ├─ Create charge satisfactions
    └─ Apply allocation
        ↓
General Ledger Service
    └─ Post GL entries:
       • Dr. Payment Clearing Account
       • Cr. Revenue Account (charge revenue)
    ↓
Organization Wallet Service
    └─ Update available balance
    ↓
Trial Balance (GL always balances)
```

#### Charge-to-Receivables Flow
```
Charge Generation Worker (Daily, 10 PM)
    ↓
Charge Generation Service
    ├─ For each organization
    ├─ For each lease
    ├─ Check vacancy (skip if vacant)
    ├─ Apply prorating (move-in/out)
    └─ Create charge record
        ↓
Charge Record Created
    ├─ Linked to unit
    ├─ Linked to lease
    ├─ Due date = 1st of next month (or custom)
    └─ Amount = minor units (pesewas)
        ↓
Collection Service (calculates arrears daily)
    └─ Aging bucket: 1-30, 31-60, 61-90, 90+
    └─ Add to collections queue
```

#### Collections Workflow
```
Arrears Detected
    ↓
Collection Case Created (auto or manual)
    ├─ Priority score calculated (age + amount + history)
    ├─ Added to collections queue
    ├─ Aged breakdown shown
    └─ Case assigned to collector (manual or auto)
        ↓
Collections Queue UI (Collector views queue)
    ├─ Sorted by priority
    ├─ Click to open case
    └─ View all charges + payment history
        ↓
Log Contact Attempt
    ├─ Method: call, SMS, email, WhatsApp, in-person
    ├─ Outcome: connected, no answer, promised, paid partial, declined
    └─ Next follow-up date
        ↓
[If Promised] Record Promise-to-Pay
    ├─ Amount, date, customer name
    └─ Verify against linked payment
        ↓
[If Needs Payment Plan] Create Payment Plan
    ├─ Total amount, installment count, frequency
    ├─ Generate installment schedule
    └─ Track each installment payment
        ↓
Escalation (if no progress)
    └─ Notify manager, escalate case status
```

#### Procurement Cycle (Request → Payment)
```
Purchase Request Submitted
    ├─ Title, description, amount, linked job
    ├─ Budget check (available budget > request)
    └─ Status: DRAFT
        ↓
Approval Routing
    ├─ <$1k: Manager approval
    ├─ $1k-$10k: Director approval
    ├─ >$10k: CFO approval
    └─ Status: APPROVED (or REJECTED)
        ↓
Quote Comparison
    ├─ Get quotes from vendors
    ├─ AI compares price, quality, delivery time
    └─ Select winning vendor
        ↓
Purchase Order Created
    ├─ PO# auto-generated
    ├─ GL posting: Dr. Prepaid Expense / Cr. A/P
    └─ Send PO to vendor (email)
        ↓
Goods Receipt
    ├─ GRN# auto-generated
    ├─ Record items received
    ├─ Note discrepancies
    └─ Link to maintenance job (if applicable)
        ↓
Vendor Invoice Received
    ├─ Record invoice
    ├─ 3-way match: PO qty = GRN qty ≈ Invoice price
    ├─ Flag variances (if >tolerance %)
    └─ Approve match (enables payment)
        ↓
GL Posting
    ├─ Dr. Maintenance Expense (for repair)
    ├─ Cr. Prepaid Expense (reverse)
        ↓
Payment Processing
    ├─ Allocate to invoice
    └─ Update A/P balance
```

### RLS Policy Architecture

```
┌─────────────────────────────────────────────────┐
│           Supabase Auth Users                   │
│  (Firebase auth or custom JWT)                  │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│      organization_members (join table)          │
│  - user_id (auth.users)                         │
│  - organization_id (organizations)              │
│  - role (property_manager, finance_officer...)  │
│  - permissions (JSON) [future]                  │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│  RLS Policies: SELECT/INSERT/UPDATE/DELETE      │
│  applied to all financial tables                │
│  USING (organization_id = org_id_from_session) │
└─────────────────────────────────────────────────┘

Example Policy (general_ledger schema):
CREATE POLICY "Users can see GL of their org"
  ON journal_entries
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );
```

### GL Posting Rules

```
CHARGE REVENUE (when charge created):
  Dr. Receivable (Accounts Receivable) / Cr. Rent Revenue

PAYMENT ALLOCATION (when payment applied to charge):
  Dr. Payment Clearing / Cr. Receivable (matches charge)

WRITE-OFF (when charge waived):
  Dr. Bad Debt Expense / Cr. Receivable

COLLECTION (when amortized or paid):
  Dr. Cash / Cr. Payment Clearing

VENDOR INVOICE (when PO issued):
  Dr. Prepaid Expense / Cr. A/P

GOODS RECEIPT (when matched):
  Dr. Maintenance Expense (or asset) / Cr. Prepaid

PAYMENT TO VENDOR:
  Dr. A/P / Cr. Cash
```

### Database Indexes

**Critical Indexes (for performance):**
```
coa_accounts(organization_id, is_active)
journal_entries(organization_id, status, posting_date)
je_lines(account_id)
gl_postings(account_id, posting_date)
bank_statements(bank_account_id, statement_date)
transaction_matches(statement_id)
charges(unit_id, due_date, status)
payments(organization_id, provider_reference, status)
payment_allocations(payment_id, status)
charge_satisfactions(charge_id)
collection_cases(organization_id, priority_score DESC, status)
contact_attempts(case_id, logged_at DESC)
purchase_requests(organization_id, status)
purchase_orders(po_number UNIQUE)
vendor_invoices(po_id, invoice_number)
```

### Error Handling & Recovery

**GL-Specific:**
- JournalEntryUnbalancedError: Cannot post unbalanced entry (auto-rejected)
- TrialBalanceImbalancedError: GL is out of balance (halt operations, investigate)
- DuplicatePaymentError: Payment already processed (provider ref check)

**Collections-Specific:**
- CollectionCaseNotFoundError: Case ID invalid
- PriorityCalculationError: Fallback to simple scoring

**Procurement-Specific:**
- POAlreadyExistsError: Cannot create duplicate PO
- ThreeWayMatchError: Qty/amount mismatch (flag variance, hold approval)

**Recovery:**
- Ledger reversal for any GL error
- Audit trail for all corrections
- Notifications to finance team on errors
- Manual override workflow for edge cases

### Audit & Compliance

**Audit Trail Tables:**
```
audit_logs
  - organization_id
  - user_id
  - action (create, update, delete, post, approve)
  - table_name (journal_entries, payments, etc)
  - record_id
  - old_values (JSON)
  - new_values (JSON)
  - timestamp
  - ip_address

payment_audit_trail
  - payment_id
  - state_change (pending → completed, etc)
  - provider_response
  - timestamp

gl_posting_audit
  - posting_id
  - journal_entry_id
  - reversal_reason (if reversed)
  - timestamp
  - approved_by
```

**Data Immutability:**
- Posted journal entries cannot be modified (only reversed)
- Charges cannot be deleted (only waived)
- Payments cannot be deleted (only reversed)
- GL postings are permanent (reversals create new offset entries)

**Compliance:**
- All money transactions use integer minor units
- Provider references checked for idempotency
- Bank reconciliation is authoritative
- Organization-scoped data isolation (RLS)

---

## Part 3: Integration Points

### Existing Services to Extend

| Service | Enhancement | Purpose |
|---------|-------------|---------|
| `paymentService.ts` | Call PaymentAllocationService on completion | Link payments to charges |
| `chargeService.ts` | Call ChargeGenerationService for new lease | Initialize charge generation |
| `leaseService.ts` | Link to charge generation on move-in | Auto-generate rent charges |
| `vendorService.ts` | Integration with VendorPerformanceService | Track vendor metrics |
| `maintenanceService.ts` | Link work orders to POs | Procurement traceability |
| `propertyService.ts` | Integration with collections queue | Arrears dashboard |
| `organizationWalletService.ts` | Reconcile with GL balances | Wallet = GL Equity |

### External Integrations

**Payment Processors:**
- Paystack: Payment webhooks, provider references
- Pay Angels: Card, bank transfer, mobile money

**Communication:**
- Twilio: SMS for collection reminders, follow-ups
- SendGrid: Email for invoices, statements, reminders
- WhatsApp API: Messages for Ghana market

**Reporting:**
- Stripe for analytics (if using Stripe payment processor)
- Custom dashboard (React + D3 for charts)

---

## Part 4: Deployment & Scaling

### Development Environment
- Local Supabase (Docker)
- Seed data with sample organizations, leases, charges
- Worker mock (simulate scheduled jobs)

### Staging Environment
- Full replica of production (encrypted backups)
- 10x production data volume for load testing
- Email/SMS to staging email (not customers)
- Read-write access for testing

### Production Environment
- Supabase managed cloud
- Automated backups (daily, 30-day retention)
- Read replicas for reporting queries
- Worker deployment: AWS Lambda + EventBridge
  - Charge generation: daily at 10 PM UTC
  - Collections escalation: daily at 8 AM
  - Bank reconciliation reminders: daily at 3 PM

### Monitoring
- CloudWatch logs for all workers
- Sentry for error tracking
- Custom dashboards:
  - GL balance (should always be $0)
  - Daily charge creation count
  - Collection case volume
  - Payment allocation success rate
  - Bank reconciliation completion rate

---

## Conclusion

This API and architecture specification provides the complete technical blueprint for implementing BaytMiftah P0 financial operations across 16 services. All services follow:
- Deterministic processing for money (GL, reconciliation)
- Integer minor units (pesewas)
- Immutable audit trails
- Organization-scoped data isolation (RLS)
- Comprehensive error handling and recovery

Implementation should follow the 6-week roadmap (DELIVERABLE_5) in sequence, with each phase building on prior services.

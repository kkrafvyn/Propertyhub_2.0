# BaytMiftah 2.0 — Build Roadmap (Spec-Aligned)

**Status**: Build plan based on scan of master specifications vs current implementation  
**Date**: 2026-08-21  
**Goal**: Complete PropertyHub 2.0 to match REOS + Buildium + Garry Tan strategy

---

## 1. Executive Summary

PropertyHub/BaytMiftah is **80% complete** as a production system. What remains is:

1. **Buildium Parity** (P0) — Deep finance, accounting, and reporting features
2. **REOS Integration** (P1) — Event-driven workflows connecting all surfaces
3. **Agentic AI** (P2) — Specialized AI agents for each department
4. **Build Process** — Implement Garry Tan review gates (not just "ship when done")

**Estimated effort**: 6–8 weeks full-time engineering.

---

## 2. Current State

### ✅ Complete/Strong
- 8-surface architecture (3 families × Web/Desktop/Mobile)
- 118+ service modules covering core REOS functions
- Supabase backend with RLS policies
- Consumer marketplace (search, compare, apply, pay)
- Business workspace (properties, leasing, maintenance, agents)
- Admin trust/fraud/moderation
- Mobile (Capacitor) + Desktop (Electron) shells
- Blockchain integration (Polygon, smart contracts)
- Omnichannel communications (SMS, WhatsApp, email, push)
- Ghana-first payment framework (Pay Angels)

### ⚠️ Incomplete/Partial
- **Finance**: GL, COA, journal entries, bank reconciliation
- **Reporting**: Property P&L, owner statements, financial exports
- **Procurement**: Full PO workflow, invoice matching, payables
- **Maintenance**: Vendor SLA automation, cost anomaly detection
- **AI**: Night Watch (continuous monitoring), do-it-for-me workflows
- **Collections**: Automated reminders, escalation, promise-to-pay tracking
- **Build Process**: Lacks formal review gates (office hours, CEO review, etc.)

### 🔴 Missing
- Lease application screening integrations
- Move-in/move-out checklist automation
- Lease renewal reminders + auto-renewal workflows
- Service desk case routing by SLA
- Contractor matching algorithm
- Bulk data export (desktop)
- Deterministic financial calculations isolation

---

## 3. P0 — Buildium Parity Foundation

### 3.1 Finance Module — General Ledger

**Owner**: Finance Engineering  
**Priority**: P0 (Blocks Property Accounting, Owner Statements)  
**Scope**: Desktop-only (Business Desktop Surface)  
**Effort**: 2–3 weeks

#### Database
```sql
-- Chart of Accounts
CREATE TABLE coa_accounts (
  id UUID PRIMARY KEY,
  org_id UUID,
  account_code VARCHAR(20),
  account_name VARCHAR(255),
  account_type ('ASSET'|'LIABILITY'|'EQUITY'|'REVENUE'|'EXPENSE'),
  parent_id UUID,
  balance_type ('DEBIT'|'CREDIT'),
  is_active BOOL,
  created_at TIMESTAMP
);

-- Journal Entries
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY,
  org_id UUID,
  entry_date DATE,
  description TEXT,
  reference VARCHAR(255),
  status ('DRAFT'|'POSTED'|'REVERSED'),
  posted_by UUID,
  posted_at TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP
);

-- Journal Entry Lines
CREATE TABLE je_lines (
  id UUID PRIMARY KEY,
  je_id UUID REFERENCES journal_entries,
  account_id UUID REFERENCES coa_accounts,
  debit BIGINT,  -- minor units
  credit BIGINT,
  line_number INT,
  description TEXT,
  allocation_id UUID REFERENCES payment_allocations,
  created_at TIMESTAMP
);
```

#### Pages
- [ ] `GeneralLedger.tsx` — Dashboard with account list, trial balance, period filter
- [ ] `ChartOfAccounts.tsx` — Full COA with hierarchy, account creation, deactivation
- [ ] `JournalEntryForm.tsx` — Multi-line entry form with account autocomplete, debit/credit validation
- [ ] `JournalEntryList.tsx` — Searchable journal with filter by date, account, status, posting status
- [ ] `TrialBalance.tsx` — Period-selected trial balance with account drill-down
- [ ] `AccountDetail.tsx` — Account 360 showing balance, recent transactions, postings

#### Rules
1. **Immutability**: Posted journal entries cannot be edited; use reversals
2. **Balanced**: Total debits must equal total credits before posting
3. **Currency**: Single-currency GL initially; FX handled in allocation layer
4. **Automatic Postings**: 
   - `charge.created` → Debit receivable, Credit revenue
   - `payment.allocated` → Debit cash, Credit receivable
   - `payable.created` → Debit expense, Credit payable
   - `payable.paid` → Debit payable, Credit cash

#### Tests
- [ ] Journal entry with unbalanced lines rejects
- [ ] Reversing a posted entry creates opposite transaction
- [ ] Trial balance sums correctly
- [ ] Account detail drill-down matches GL postings

---

### 3.2 Finance Module — Bank Reconciliation

**Owner**: Finance Engineering  
**Priority**: P0  
**Scope**: Desktop-only  
**Effort**: 1–2 weeks

#### Database
```sql
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY,
  org_id UUID,
  bank_name VARCHAR(255),
  account_number VARCHAR(50),
  currency VARCHAR(3),
  opening_balance BIGINT,
  gl_account_id UUID REFERENCES coa_accounts,
  created_at TIMESTAMP
);

CREATE TABLE bank_statements (
  id UUID PRIMARY KEY,
  bank_account_id UUID REFERENCES bank_accounts,
  statement_date DATE,
  opening_balance BIGINT,
  closing_balance BIGINT,
  uploaded_by UUID,
  uploaded_at TIMESTAMP
);

CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY,
  statement_id UUID REFERENCES bank_statements,
  transaction_date DATE,
  description TEXT,
  amount BIGINT,
  type ('DEBIT'|'CREDIT'),
  balance_at_line BIGINT,
  reconciled_to_id UUID,  -- reference to payment_allocations or je_lines
  reconciled_at TIMESTAMP,
  unmatched_reason TEXT
);
```

#### Pages
- [ ] `BankReconciliation.tsx` — Statement upload (CSV/PDF), transaction matching interface
- [ ] `ReconciliationMatch.tsx` — Drag-drop or multi-select matching of bank txns to ledger entries
- [ ] `OutstandingItems.tsx` — Unmatched debits/credits, aging, variance analysis
- [ ] `ReconciliationReport.tsx` — Before/after GL balance, reconciliation exceptions

#### Rules
1. **Statement Upload**: Parse bank statements (CSV with date, description, amount)
2. **Matching**: Auto-match on amount + date range; user can override
3. **Variance Report**: Flag transactions not matched after 30 days
4. **GL Impact**: Reconciliation posting creates bank account GL entry only; does not duplicate charge/payment postings

#### Tests
- [ ] Bank statement import with 10 transactions, 8 auto-match, 2 manual
- [ ] Variance report shows unmatched items
- [ ] Reconciled GL balance matches bank statement closing balance

---

### 3.3 Reporting — Property P&L

**Owner**: Finance Engineering + Product  
**Priority**: P0  
**Scope**: Web + Desktop  
**Effort**: 2–3 weeks

#### Database
Property P&L is derived; no new tables needed. Use:
- `charges` (revenue)
- `payment_allocations` (receipts)
- `je_lines` (expense postings)
- `properties` + `units` (segmentation)

#### Pages
- [ ] `PropertyPnL.tsx` — Date range selector, property/building filter, P&L by month/quarter/year
- [ ] `PropertyPnLDetail.tsx` — Click property to see revenue breakdown (rent, service charges, penalties, other), expense breakdown (maintenance, utilities, payroll, other), net operating income
- [ ] `PortfolioPnL.tsx` — Aggregated P&L across all properties, variance from budget (if budget exists)
- [ ] `PropertyComparison.tsx` — Side-by-side P&L for 2–4 properties

#### Metrics
- **Revenue**: Rent + Service charges + Water/Utilities + Other charges
- **Operating Expenses**: Maintenance + Utilities + Staffing + Repairs (from je_lines)
- **Collections**: Cash received (from payment_allocations)
- **Arrears**: Charges - Allocations (per unit or property)
- **NOI**: Revenue - Operating Expenses
- **Collection Ratio**: Cash / Charges due

#### Tests
- [ ] Property P&L for one property, one month matches manual calculation
- [ ] Portfolio P&L is sum of property P&Ls
- [ ] Arrears in P&L match charges table

---

### 3.4 Reporting — Owner Statements

**Owner**: Finance Engineering + Communications  
**Priority**: P0  
**Scope**: Web + Mobile (Consumer)  
**Effort**: 1–2 weeks

#### Database
No new tables. Use `charges`, `payment_allocations`, `leases`, `organizations`.

#### Pages
- [ ] `OwnerStatement.tsx` — View owner's monthly/quarterly statement (web + consumer app)
- [ ] `OwnerStatementPreview.tsx` — Business web → see all statements for owners in org
- [ ] `OwnerStatementEmail.tsx` — Automated email template + scheduler

#### Layout
```
STATEMENT FOR OWNER

Period: Aug 1–31, 2026
Property: Westland Estate, Block 5, Unit 12
Lease: Aug 2024–Jul 2027

OPENING BALANCE: GHS 500 (from last period)

CHARGES:
  Rent (Aug)               GHS 2,000
  Service charge (Aug)     GHS 300
  Maintenance levy (Aug)   GHS 100
  Total charges            GHS 2,400

PAYMENTS RECEIVED:
  Aug 15 Mobile money     (GHS 2,400)
  Total payments          (GHS 2,400)

CLOSING BALANCE: GHS 500

DUE DATE: Sep 5, 2026
PAY LINK: [Link to payment app]
```

#### Rules
1. **Statement is read-only** (derived from charges + allocations)
2. **Automated**: Scheduled for each month/quarter end
3. **Delivery**: Email + SMS + In-app notification + Consumer app
4. **Dispute**: Owner can flag a charge from statement; creates support ticket

#### Tests
- [ ] Statement for one unit over one month matches manual calculation
- [ ] PDF export readable
- [ ] Email delivery works

---

### 3.5 Maintenance — Vendor SLA Tracking

**Owner**: Operations Engineering  
**Priority**: P0  
**Scope**: Web + Mobile  
**Effort**: 1–2 weeks

#### Database
```sql
-- Already exists; enhance:
CREATE TABLE work_orders (
  -- ... existing fields
  vendor_id UUID REFERENCES vendors,
  sla_acknowledgement_target INTERVAL,  -- e.g., 4 hours
  sla_resolution_target INTERVAL,       -- e.g., 48 hours
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID,
  sla_breached_at TIMESTAMP,
  sla_breach_reason TEXT,
  evidence_photos UUID[],
  completed_at TIMESTAMP
);

CREATE TABLE sla_alerts (
  id UUID PRIMARY KEY,
  work_order_id UUID REFERENCES work_orders,
  alert_type ('ACKNOWLEDGEMENT_PENDING'|'SLA_BREACHED'|'COMPLETION_PENDING'),
  created_at TIMESTAMP,
  acknowledged_at TIMESTAMP
);
```

#### Pages
- [ ] `SLADashboard.tsx` — Real-time view of work orders vs SLA
- [ ] `VendorPerformance.tsx` — Vendor scorecard (on-time %, response time, quality rating)
- [ ] `SLABreachAlert.tsx` — Automated notification to manager when SLA breached

#### Rules
1. **Acknowledgement**: Vendor must acknowledge work order within SLA target or alert fires
2. **Resolution**: Vendor must complete and submit evidence by SLA target or escalate
3. **Escalation**: If breached → notify manager, optionally reassign to backup vendor
4. **Scoring**: Vendor on-time % = (on-time completions) / (total work orders)

#### Automation
- When work order assigned: Set acknowledgement target = now + 4 hours
- Every 1 hour: Check for breached work orders, fire notifications
- When work order completed: Calculate resolution time, update vendor score

#### Tests
- [ ] Work order SLA breached when time exceeds target; alert fires
- [ ] Vendor performance scorecard updates on completion
- [ ] Manager receives notification 1 hour before SLA breach

---

### 3.6 Procurement — Purchase Order Workflow

**Owner**: Operations Engineering  
**Priority**: P0 (Medium)  
**Scope**: Desktop-only  
**Effort**: 2–3 weeks

#### Database
```sql
CREATE TABLE purchase_requests (
  id UUID PRIMARY KEY,
  org_id UUID,
  requester_id UUID REFERENCES users,
  work_order_id UUID REFERENCES work_orders,
  description TEXT,
  quantity INT,
  unit_id UUID,
  status ('DRAFT'|'SUBMITTED'|'APPROVED'|'REJECTED'),
  created_at TIMESTAMP,
  submitted_at TIMESTAMP,
  approval_decision_at TIMESTAMP,
  approved_by UUID
);

CREATE TABLE quotations (
  id UUID PRIMARY KEY,
  purchase_request_id UUID REFERENCES purchase_requests,
  vendor_id UUID REFERENCES vendors,
  quote_date DATE,
  unit_price BIGINT,
  quantity INT,
  total_amount BIGINT,
  currency VARCHAR(3),
  delivery_date DATE,
  validity_days INT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY,
  org_id UUID,
  purchase_request_id UUID REFERENCES purchase_requests,
  vendor_id UUID REFERENCES vendors,
  quotation_id UUID REFERENCES quotations,
  po_number VARCHAR(50),
  order_date DATE,
  total_amount BIGINT,
  status ('DRAFT'|'ISSUED'|'RECEIVED'|'INVOICED'|'PAID'|'CANCELLED'),
  issued_by UUID,
  issued_at TIMESTAMP,
  created_at TIMESTAMP
);

CREATE TABLE goods_receipts (
  id UUID PRIMARY KEY,
  purchase_order_id UUID REFERENCES purchase_orders,
  receipt_date DATE,
  quantity_received INT,
  quality_notes TEXT,
  received_by UUID,
  received_at TIMESTAMP
);

CREATE TABLE vendor_invoices (
  id UUID PRIMARY KEY,
  purchase_order_id UUID REFERENCES purchase_orders,
  vendor_id UUID REFERENCES vendors,
  invoice_number VARCHAR(50),
  invoice_date DATE,
  total_amount BIGINT,
  currency VARCHAR(3),
  status ('DRAFT'|'RECEIVED'|'MATCHED'|'PAID'|'DISPUTED'),
  received_at TIMESTAMP,
  matched_at TIMESTAMP,
  dispute_reason TEXT
);
```

#### Pages
- [ ] `PurchaseRequestForm.tsx` — Create PR from work order or manual entry
- [ ] `PurchaseRequestList.tsx` — Dashboard of open, approved, rejected PO requests
- [ ] `QuoteComparison.tsx` — Show 2–4 quotations for same PR; select winner
- [ ] `PurchaseOrderForm.tsx` — Create PO from approved PR + selected quote
- [ ] `GoodsReceiptForm.tsx` — Receive goods, validate qty, quality notes
- [ ] `VendorInvoiceMatch.tsx` — Match vendor invoice to GRN/PO, flag discrepancies (3-way match)
- [ ] `PayableManagement.tsx` — Approve for payment, record in GL, pay vendor

#### Workflow
```
Work Order Issue
    ↓
Purchase Request (auto-generated from vendor dispatch)
    ↓ [Manager approval]
Request Quotations from Vendor(s)
    ↓ [Vendor responds]
Compare Quotes
    ↓ [Manager selects]
Issue Purchase Order
    ↓ [Vendor ships]
Goods Receipt
    ↓ [Receive & inspect]
Vendor Invoice
    ↓ [3-way match: PR + GRN + Invoice]
Approve Payable
    ↓
Post to GL (Debit Expense, Credit Payable)
    ↓ [Finance approves payment]
Pay Vendor
    ↓
Record Payment (Debit Payable, Credit Cash)
```

#### Rules
1. **Approval Gates**: PR requires manager; PO requires finance
2. **3-Way Match**: Invoice must match PO (qty, amount) and GRN (qty received)
3. **Variance**: Flag if invoice qty/amount ≠ PO or GRN; require variance explanation
4. **GL Integration**: PO + GRN + Invoice approval automatically creates payable GL entries

#### Tests
- [ ] PR → Quotations → PO → GRN → Invoice → Payable → GL posting (end-to-end)
- [ ] 3-way mismatch (invoice qty ≠ GRN) flags discrepancy
- [ ] GL entries post correctly

---

## 4. P1 — REOS Integration & AI Foundations

### 4.1 Event-Driven Architecture — Event Types & Handlers

**Owner**: Platform Engineering  
**Priority**: P1  
**Scope**: All surfaces  
**Effort**: 2–3 weeks

#### Current State
Automation engine exists; event types are sparse.

#### Spec Requires
20+ event types:
- `unit.vacant`
- `tenant.created`
- `lease.created`
- `lease.expiring`
- `payment.received`
- `payment.failed`
- `installment.due`
- `installment.overdue`
- `issue.created`
- `issue.sla_breached`
- `contractor.assigned`
- `quote.received`
- `quote.approved`
- `work.completed`
- `invoice.received`
- `lead.created`
- `offer.created`
- `deal.completed`
- `contract.expiring`
- `arrears.30days`
- `arrears.60days`
- `arrears.90days`

#### Database
```sql
CREATE TABLE event_log (
  id UUID PRIMARY KEY,
  org_id UUID,
  event_type VARCHAR(100),
  aggregate_type VARCHAR(50),  -- 'unit', 'payment', 'lease', etc.
  aggregate_id UUID,
  entity_data JSONB,           -- full entity state
  triggered_by UUID,           -- user or system
  triggered_at TIMESTAMP,
  processed_at TIMESTAMP,
  processing_error TEXT
);

CREATE TABLE automation_rules (
  id UUID PRIMARY KEY,
  org_id UUID,
  name VARCHAR(255),
  trigger_event VARCHAR(100),
  conditions JSONB,            -- conditional logic
  action_type ('NOTIFY'|'CREATE_TASK'|'AUTO_ASSIGN'|'POST_GL'|'SEND_SMS'|'ESCALATE'),
  action_config JSONB,
  is_active BOOL,
  created_by UUID,
  created_at TIMESTAMP
);
```

#### Work
- [ ] Catalog 20+ event types in `automation-engine.service.ts`
- [ ] Create event publisher service (fires events on charge, payment, lease, maintenance, etc.)
- [ ] Implement automation rule engine (matches events to rules, executes actions)
- [ ] Create automation rule builder UI (Desktop-only)
- [ ] Test: Rule engine fires correct action for sample events

#### Tests
- [ ] `payment.received` event fires when payment allocated
- [ ] Automation rule "send SMS when payment.failed" executes
- [ ] Event log is queryable by org, event type, date

---

### 4.2 AI Night Watch — Continuous Monitoring

**Owner**: AI Engineering  
**Priority**: P1 (High)  
**Scope**: Business Desktop + Workspace  
**Effort**: 2–3 weeks

#### Current State
AI assistant exists; Night Watch (continuous scanning) not implemented.

#### Spec Requires
Scan daily for:
- 🔴 Arrears (aged buckets: 30, 60, 90+ days)
- 🔴 Failed payments (retry queue)
- 🔴 SLA breaches (maintenance, finance cases)
- 🟡 Vacancies (units unoccupied > 30 days)
- 🟡 Expiring leases (within 60 days)
- 🟡 Maintenance anomalies (cost spike, repeat issues)
- 🟡 Failed notifications (undelivered SMS/email)
- 🔵 Unmatched payments (GL reconciliation)
- 🔵 Contract expiry (licenses, vendor contracts)

#### Database
```sql
CREATE TABLE night_watch_alerts (
  id UUID PRIMARY KEY,
  org_id UUID,
  alert_type VARCHAR(100),
  severity ('CRITICAL'|'HIGH'|'MEDIUM'|'LOW'),
  subject VARCHAR(255),
  evidence JSONB,              -- affected units, amounts, dates
  recommendation TEXT,
  action_required BOOL,
  approval_required BOOL,
  created_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID,
  actioned_at TIMESTAMP
);
```

#### Pages
- [ ] `AICommandCenter.tsx` — Morning briefing (10–15 alerts with evidence, recommendation, action button)
- [ ] `NightWatchAlerts.tsx` — Full scrollable list, filter by type, severity, time
- [ ] `AlertDetail.tsx` — Click alert to see affected units/properties, evidence, recommended action

#### Algorithm (Simplified)
```typescript
// Every day at 6 AM (org-configurable)
async function runNightWatch(orgId) {
  // Arrears scan
  const arrears30 = await getArrears(orgId, 30, 60);    // 30-60 days old
  const arrears60 = await getArrears(orgId, 60, 90);    // 60-90 days old
  const arrears90 = await getArrears(orgId, 90, 9999); // 90+ days old
  
  if (arrears30.units.length > 0) {
    createAlert({
      type: 'ARREARS_30_60_DAYS',
      units: arrears30.units,
      amount: arrears30.totalAmount,
      recommendation: 'Send reminder SMS, schedule collection call'
    });
  }
  
  // SLA scan
  const breachedJobs = await getBreachedWorkOrders(orgId);
  if (breachedJobs.length > 0) {
    createAlert({
      type: 'SLA_BREACHED',
      jobs: breachedJobs,
      recommendation: 'Escalate to backup vendor or manager'
    });
  }
  
  // ... more scans
}
```

#### Tests
- [ ] Night Watch creates alert for arrears 30+ days
- [ ] Alert lists 5 affected units, total amount, due dates
- [ ] Manager clicks "Send Reminder" → SMS sent to residents

---

### 4.3 AI Do-It-For-Me — Approval Workflows

**Owner**: AI Engineering + Operations  
**Priority**: P1 (Medium)  
**Scope**: Business Desktop  
**Effort**: 2 weeks

#### Spec Requires
Examples:
- "Prepare this month's arrears report, draft reminders for accounts over 30 days, and show me anything requiring approval."
- "Find all overdue maintenance jobs, source available contractors, compare quotes and prepare approvals."
- "Reconcile unmatched payments and flag anything over GHS 500 for manual review."

#### Implementation Pattern
1. **Parse intent** → Identify action (e.g., "prepare report", "draft reminders", "find contractors")
2. **Gather data** → Query DB using RLS (authorized access only)
3. **Process** → Deterministic calculations (arrears aging, cost totals)
4. **Draft** → Generate human-readable output (email template, approval request)
5. **Request approval** → Show user the draft + ask "Proceed?" or "Edit then proceed?"
6. **Execute** → Commit to DB (send SMS, post GL entry, create task)
7. **Audit** → Log everything

#### Pages
- [ ] `AICommandCenter.tsx` (extend) — Add "Command" input field + action carousel
- [ ] `AIActionDraft.tsx` — Show draft (email, report, GL entry, approval request), edit fields, approve/reject
- [ ] `AIActionAudit.tsx` — History of AI commands executed, rollback if needed

#### Example: "Prepare arrears report"
```
User input: "Prepare September arrears report and draft reminders"

AI response:
  1. Queried 847 units
  2. Found 45 units with arrears 30+ days (GHS 12,450 total)
  3. Generated email template:
     Subject: Overdue Notice - [Unit Address]
     Body: We note your account is [X days] overdue...
  4. Preview: Will send SMS + Email to 45 residents

[APPROVE] [EDIT AND RESUBMIT] [CANCEL]

If APPROVE: 
  → Send 45 SMS + 45 emails
  → Log action to audit table
  → Create task "Follow up on 45 arrears" for collections officer
```

#### Rules
1. **High-risk actions require approval**: Payments, GL entries, collections actions
2. **Deterministic only**: Use LLM for drafting/explaining, not for financial decisions
3. **All audited**: Every AI-driven action is logged with timestamp, user, generated content, and approval
4. **User can edit**: Before execution, user can edit draft (email body, SMS text, etc.)

#### Tests
- [ ] AI drafts arrears report with correct totals
- [ ] User edits email template before sending
- [ ] SMS delivery works for 45 recipients
- [ ] Audit log shows command, draft, approval, execution

---

### 4.4 Contractor Matching Algorithm

**Owner**: Operations Engineering  
**Priority**: P1 (Medium)  
**Scope**: Business Web + Desktop  
**Effort**: 1–2 weeks

#### Spec Requires
When a maintenance issue is unresolved by in-house team, auto-suggest qualified contractors.

#### Matching Criteria
1. **Service category match** (e.g., plumbing, electrical)
2. **Geographic coverage** (contractor's service areas include unit location)
3. **Availability** (contractor not at capacity for that date)
4. **SLA capability** (can meet 48-hour target if needed)
5. **Rating** (minimum 3.5★ if available; else flag lower-rated)
6. **Reliability** (> 80% on-time completion rate)
7. **Previous work** (contractor has worked at that property before)
8. **Compliance** (licenses/insurance current)
9. **Cost** (within 20% of average for service type)

#### Database
No new tables; use existing `vendors` + `work_orders` + contractor history.

#### Pages
- [ ] `ContractorDispatch.tsx` — When issue created, show top 3–5 contractor suggestions
- [ ] `QuoteComparison.tsx` — Click suggestion → auto-request quotes from each → compare price, response time, rating

#### Algorithm
```typescript
async function matchContractors(issue) {
  const location = await getPropertyLocation(issue.unit_id);
  const contractors = await db.query(`
    SELECT v.*, 
      COUNT(DISTINCT wo.id) as job_count,
      AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.assigned_at)) / 86400)::int as avg_days_to_complete,
      COUNT(CASE WHEN wo.sla_breached_at IS NULL THEN 1 END)::float / COUNT(*) as on_time_rate
    FROM vendors v
    LEFT JOIN work_orders wo ON v.id = wo.vendor_id
    WHERE v.services CONTAINS issue.category
      AND ST_DISTANCE(v.location::geography, $1::geography) < 10000  -- 10km radius
      AND v.is_active = true
    GROUP BY v.id
  `, [location]);
  
  const scored = contractors.map(c => ({
    vendor: c,
    score: 
      (c.avg_rating / 5) * 0.25 +
      c.on_time_rate * 0.25 +
      (1 - Math.min(c.avg_cost, maxCost) / maxCost) * 0.15 +
      (c.previous_jobs_at_property > 0 ? 1 : 0) * 0.15 +
      (c.has_current_license ? 1 : 0) * 0.10 +
      (c.has_insurance ? 1 : 0) * 0.10
  }));
  
  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}
```

#### Tests
- [ ] Top contractor has matching service category, geography, 3.5★+ rating
- [ ] Cost within 20% of average
- [ ] Previous work at property boosts ranking

---

### 4.5 Installment Collections Automation

**Owner**: Finance Engineering  
**Priority**: P1 (Medium)  
**Scope**: Business Web + Consumer Mobile  
**Effort**: 1–2 weeks

#### Current State
Installment tables exist; automation incomplete.

#### Spec Requires
Automated reminders + escalation for overdue installments.

#### Database
Enhance existing `installment_plans` and `installments` tables.

#### Automation Rules
```
Installment Due
  ↓ (Day 0)   → Send SMS/Email reminder
  ↓ (Day 5)   → Send second reminder
  ↓ (Day 10)  → Escalate to collections officer
  ↓ (Day 30)  → Late-charge penalty (optional, org-configurable)
  ↓ (Day 60)  → Escalate to manager + send warning notice
  ↓ (Day 90)  → Escalate to legal/eviction track (if configured)
```

#### Pages
- [ ] `InstallmentDashboard.tsx` — Collections officer view: upcoming due, overdue, at-risk
- [ ] `CollectionsQueue.tsx` — Priority-ordered list of overdue installments, escalation status, last contact
- [ ] `InstallmentPaymentPlan.tsx` (Consumer) — View plan, make payment, download receipt

#### Rules
1. **Reminders**: SMS (day 0, 5), email (day 5), in-app notification (day 0)
2. **Contact Attempts**: Log all SMS/email delivery attempts
3. **Promise-to-Pay**: Allow resident to "promise to pay by [date]"; extends deadline
4. **Escalation**: After 30 days overdue, notify manager
5. **Late Fee**: Optional; if configured, apply GHS X or Y% interest

#### Tests
- [ ] Installment due → SMS sent on day 0
- [ ] Overdue installment shows in collections queue
- [ ] Late-fee calculation correct

---

## 5. P2 — AI Moat (Specialized AI Agents)

### 5.1 Property Management AI

**Owner**: AI Engineering  
**Priority**: P2 (Lower)  
**Scope**: Business Desktop  
**Effort**: 2 weeks

#### Capabilities
1. **Issue Triage** — Auto-classify issues (emergency, urgent, routine, low-priority)
2. **SLA Monitoring** — Flag approaching/breached SLAs
3. **Vendor Recommendations** — Suggest contractors based on past performance
4. **Repeat Failure Detection** — Identify units with recurring issues

#### Implementation
- [ ] Train classifier on existing issues (emergency = gas leak, electrical fire; routine = paint, caulk)
- [ ] Implement SLA scoring and alert
- [ ] Integrate with contractor matching
- [ ] Query work order history for repeat failures

#### Tests
- [ ] AI classifies electrical issue as "emergency"
- [ ] AI flags SLA breach 1 hour before deadline
- [ ] Repeat plumbing issues in Unit 5 identified

---

### 5.2 Finance AI

**Owner**: AI Engineering + Finance  
**Priority**: P2  
**Scope**: Business Desktop + Web  
**Effort**: 1–2 weeks

#### Capabilities
1. **Arrears Prioritization** — Rank units by size + age + resident risk
2. **Anomaly Detection** — Flag unusual payment patterns, skipped months, tiny partial payments
3. **Collections Summary** — AI-generated collections report with recommendations
4. **Reconciliation Assistance** — Suggest matching for unmatched transactions

#### Tests
- [ ] AI prioritizes GHS 10K arrears over GHS 500
- [ ] Anomaly: Resident always pays GHS 500 on 10K bill → flagged
- [ ] Collections report: "45 units in arrears; GHS 15K priority (90+ days); recommend legal action for 3 units"

---

## 6. Build Process — Garry Tan Methodology

**Priority**: P0 (Organizational)  
**Effort**: Ongoing  

Implement formal review gates for each feature:

### 6.1 Office Hours (Product Discovery)
```markdown
# Office Hours: [Feature Name]

## Problem
- What are we solving?
- Who has it?
- Evidence of need?

## Scope
- Smallest useful version?
- What to remove?
- 10x better version?

## Decision
- [ ] EXPAND (full priority)
- [ ] SELECTIVELY EXPAND (pilot)
- [ ] HOLD (revisit)
- [ ] REDUCE (scope cut)
```

### 6.2 CEO Review
```markdown
# CEO Review: [Feature Name]

## Business Impact
- Revenue impact?
- Customer retention?
- Switching costs?

## Strategic Value
- REOS connectivity?
- Competitive advantage?
- Buildium parity?

## Decision
- [ ] EXPAND
- [ ] SELECTIVELY EXPAND
- [ ] HOLD
- [ ] REDUCE
```

### 6.3 Engineering Review
Before any code:
```markdown
# Engineering Review: [Feature Name]

## Architecture
- Data model?
- State transitions?
- API contracts?

## Risk
- Migrations?
- Rollback plan?
- Failure modes?

## Sign-Off
- [ ] Approved to build
```

### 6.4 Design Review
Before component code:
```markdown
# Design Review: [Feature Name]

## States
- Empty?
- Loading?
- Error?
- Success?

## Accessibility
- WCAG 2.1 AA?
- Keyboard nav?
- Screen reader?

## Mobile
- Responsive?
- Touch-friendly?
- Orientation?

## Sign-Off
- [ ] Approved to code
```

### 6.5 Adversarial Security Review
After code, before ship:
```markdown
# Security Review: [Feature Name]

## Data Leakage
- RLS correctly scoped?
- Auth boundaries?

## Race Conditions
- Concurrent updates safe?
- Payment idempotency?

## State Transitions
- Invalid states reachable?
- Double-spend possible?

## Sign-Off
- [ ] Security cleared
```

### 6.6 QA Pass
End-to-end user workflows:
- [ ] Consumer flow (apply → pay → move-in)
- [ ] Business flow (create issue → dispatch → complete → charge → pay)
- [ ] Admin flow (approve → audit → export)
- [ ] Mobile + Desktop + Web
- [ ] Error scenarios (network fail, payment fail, invalid input)

### 6.7 Learn & Update
Post-launch:
- [ ] Track usage (feature adoption, error rates, user satisfaction)
- [ ] Collect feedback (support tickets, user interviews)
- [ ] Update product context (what worked, what failed, next iteration)

---

## 7. Timeline & Effort Estimation

| Phase | Duration | Effort | Dependency |
|-------|----------|--------|------------|
| P0.1 General Ledger | 2–3w | 4 eng-weeks | None |
| P0.2 Bank Reconciliation | 1–2w | 2 eng-weeks | GL |
| P0.3 P&L Reporting | 2–3w | 3 eng-weeks | GL |
| P0.4 Owner Statements | 1–2w | 2 eng-weeks | P&L |
| P0.5 Vendor SLA | 1–2w | 2 eng-weeks | None |
| P0.6 Procurement | 2–3w | 4 eng-weeks | None |
| **P0 Total** | **10–15w** | **17–22 eng-weeks** | — |
| P1.1 Event Architecture | 2–3w | 3 eng-weeks | None |
| P1.2 Night Watch | 2–3w | 3 eng-weeks | Event Arch |
| P1.3 Do-It-For-Me | 2w | 3 eng-weeks | Event Arch |
| P1.4 Contractor Matching | 1–2w | 2 eng-weeks | None |
| P1.5 Installment Automation | 1–2w | 2 eng-weeks | None |
| **P1 Total** | **8–12w** | **13–17 eng-weeks** | — |
| P2 AI Agents | 3–4w | 5–6 eng-weeks | P1 |
| **Build Process** | Ongoing | 1–2 eng-weeks/sprint | — |
| **Total** | **20–30w** | **35–47 eng-weeks** | — |

### Recommended Sequencing
**Weeks 1–3**: P0.1 + P0.5 (GL + Vendor SLA) in parallel  
**Weeks 4–5**: P0.2 (Bank Reconciliation)  
**Weeks 6–8**: P0.3 + P0.4 (P&L + Statements) in parallel  
**Weeks 9–10**: P0.6 (Procurement)  
**Weeks 11–13**: P1.1 + P1.4 + P1.5 (Event Arch + Contractor + Collections) in parallel  
**Weeks 14–16**: P1.2 + P1.3 (Night Watch + Do-It-For-Me)  
**Weeks 17–20**: P2 (AI Agents)  
**Ongoing**: Build process gates, testing, documentation

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| TypeScript strictness slows refactoring | High | Enable strict mode incrementally (1 module/week); pair programming |
| Service layer is 118 modules; hard to navigate | Medium | Create feature directories (finance/, operations/, sales/) by week 2 |
| Dual UI systems (Radix + MUI) create confusion | Medium | Consolidate to Radix UI + shadcn/ui (defer to P3) |
| GL/Procurement scope expansion | High | Lock scope at office hours; enforce design review |
| AI agent hallucination in financial data | Critical | Deterministic calculations only; LLM for drafting/explanation; all reviewed before execution |
| Mobile Capacitor plugins missing | Medium | Test on real device weekly; defer advanced plugins (BLE) to P3 |
| Database migration complexity | High | Test migrations on staging first; plan rollback |

---

## 9. Success Criteria

### P0 Complete
- [ ] GL + COA fully functional
- [ ] Bank reconciliation 99% accuracy
- [ ] P&L matches manual audit for 5 test properties
- [ ] Owner statements deliver on schedule
- [ ] Vendor SLA breaches alert correctly
- [ ] Procurement workflow end-to-end tested

### P1 Complete
- [ ] 20+ event types fire reliably
- [ ] Night Watch runs daily; 10–20 alerts/day typical
- [ ] Do-It-For-Me handles 5+ use cases (arrears, maintenance, collector, etc.)
- [ ] Contractor matching accuracy 85%+
- [ ] Installment collections automate 80% of reminders

### P2 Complete
- [ ] AI agents available in AI Command Center
- [ ] Each agent handles its domain (Finance AI does arrears, etc.)
- [ ] No AI-driven financial decisions without approval

### Process Complete
- [ ] All features go through Office Hours → Design Review → Security Review → QA
- [ ] Learn loop: metrics tracked, feedback collected, product context updated

---

## 10. Next Steps

1. **Agree on sequencing** — Validate timeline with team
2. **Create task tracking** — Break each phase into Jira epics/stories
3. **Lock scope** — Confirm no scope expansion (especially GL/Procurement)
4. **Setup reviews** — Assign owners for Office Hours, CEO Review, Design Review roles
5. **First build** — Start Phase 1 (GL + Vendor SLA in parallel)

---

**Document Status**: Living; update weekly as work progresses.  
**Last Updated**: 2026-08-21  
**Owner**: Product + Engineering  

# BaytMiftah Security Attack — Current Breakdown

**Repository reviewed:** `kkrafvyn/Propertyhub_2.0`
**Branch:** `main`
**Review type:** authorized source-side adversarial security review
**Primary surfaces:** Supabase RLS/RPCs, Edge Functions, authentication, payments, accounting, procurement, e-signatures, integrations, storage, Electron, organization/estate/property authorization.

## 1. What has been attacked

| Area | Status | Result |
|------|--------|--------|
| Authentication / Supabase sessions | Reviewed | Mostly strong; Electron OAuth issue remains |
| Organization authorization | Deep review | Multiple over-permission problems |
| Property/estate scoping | Deep review | Generally present, but capability separation is weak |
| WhatsApp | Attacked | Authorization bypass found |
| SMS/OTP | Attacked | Provider-abuse path found |
| DocuSign/e-signature | Deep review | Multiple HIGH issues |
| PayAngels payments | Deep review | Several important paths held |
| Wallets/payouts | Attacked | Mass-assignment issue |
| Escrow | Deep review | Direct mutation issue |
| SaaS usage | Attacked | Cross-tenant manipulation |
| Maintenance | Deep review | Cross-tenant IDOR + workflow issues |
| Leases | Deep review | Financial/workflow mass assignment |
| Tenant screening | Attacked | Over-permission/result manipulation |
| Integrations | Attacked | Configuration/credential exposure risk |
| Trust accounting | Attacked | Severe ledger/balance integrity issues |
| Procurement | Deep review | Three-way-match integrity failure |
| General accounting | Deep review | Ledger/bank/vendor-bill issues |
| International/jurisdiction | Reviewed | Authorization and legal-record issues |
| Storage | Partial/deep | Claim/maintenance storage held |
| KYC | Reviewed | Tested ownership paths held |
| CI/security tooling | Reviewed | Several hardening problems |
| Admin/MFA | Partial | More testing remains |
| AI/automation | Partial | More testing remains |

---

# 2. Highest-priority vulnerabilities

I would organize remediation into P0-P3 rather than trying to fix things in the order we discovered them.

## P0 — Financial integrity / trust boundary

These should be fixed before expanding financial functionality.

### P0-01 — Escrow direct mutation
`escrow_holds` can be directly UPDATEd by an authorized org manager instead of forcing transitions through the secure escrow RPC.

This can bypass ledger/state invariants.

**Fix:** remove authenticated direct UPDATE. All escrow transitions go through narrowly authorized RPCs. Add immutable-field and state-transition protection.

---

### P0-02 — Trust-account balance manipulation
`trust_accounts.balance_minor` is directly mutable by organization members under broad RLS.

A balance should normally be derived from an immutable ledger, not user-editable.

**Fix:** make balance server-maintained/derived. Revoke ordinary UPDATE.

---

### P0-03 — Trust-ledger forgery
Members can INSERT/UPDATE trust ledger records, including monetary values and resulting balances.

This destroys the trustworthiness of the accounting record.

**Fix:** append-only ledger, controlled posting RPC, reversals instead of edits, immutable posted entries.

---

### P0-04 — Procurement three-way-match integrity failure
Estate staff control both:

- Purchase order evidence
- Goods receipt evidence

Finance then relies on attacker-modifiable evidence.

**Fix:** separate procurement, PO approval, receiving, invoice entry, matching and payment capabilities.

---

# 3. P1 — High-impact authorization flaws

### P1-01 — WhatsApp sender authorization bypass
`send-whatsapp` verifies authentication but does not reliably prove that the caller belongs to the organization whose messaging infrastructure is being used.

**Fix:** mandatory server-derived organization + `requireOrgMembership()` + messaging capability + rate limiting.

---

### P1-02 — DocuSign envelope authorization bypass
An authenticated caller can use the application DocuSign integration without sufficiently authorizing the supplied e-signature request.

**Fix:** load request server-side → derive organization → authorize caller → construct trusted envelope.

---

### P1-03 — E-signature state mass assignment
Members can directly modify fields such as signing state, signers, provider IDs, document links and tokens.

**Fix:** revoke direct UPDATE; signing state changes only through controlled RPCs/provider callbacks.

---

### P1-04 — External-maintenance cross-tenant IDOR
Organization A can create an external-access grant referencing a maintenance resource belonging to Organization B.

The token can then be used to retrieve/update that foreign resource.

**Fix:**

1. Load the resource.
2. Derive the resource organization.
3. Compare to the grant organization.
4. Never trust the supplied pair independently.

---

### P1-05 — Lease mass assignment
Authorized scoped users can directly change financial/workflow fields including rent and lease state.

**Fix:** immutable identity fields + dedicated lease amendment/state-transition RPCs.

---

### P1-06 — Payout-request mass assignment
Users can directly modify their own payout-request records beyond what should be user-controlled.

**Fix:** submission/cancellation RPCs; processor-controlled status, amounts and provider fields.

---

### P1-07 — Cross-tenant SaaS usage manipulation
`increment_saas_usage()` is `SECURITY DEFINER`, authenticated-callable and doesn't sufficiently authorize the target organization.

**Fix:** service-only execution or derive organization from caller/context.

---

### P1-08 — Global preventive-maintenance trigger
Authenticated users can trigger processing of due maintenance plans across the system.

**Fix:** service-role/scheduler only.

---

# 4. Accounting problems

This is now a major remediation area.

### P1-09 — Posted journal entries mutable
Posted accounting entries and their lines are not sufficiently immutable.

Implement:

- DRAFT
- POSTED
- REVERSAL ENTRY

Never silently rewrite history.

---

### P1-10 — Bank transaction evidence mutable
Imported bank transactions expose fields such as amount, provider reference and transaction date to finance UPDATE permissions.

Provider-originated facts should be immutable.

---

### P1-11 — Vendor-bill state mass assignment
Finance users can directly modify:

- amount
- currency
- status
- approved_by
- paid_at
- vendor
- purchase_order

Approval/payment transitions should be controlled separately.

---

### P1-12 — Excessive finance-role equivalence
Currently many roles receive effectively the same financial authority.

This is an architectural problem.

---

# 5. Procurement problems

We found several pieces of the same larger vulnerability.

### P1-13 — PO amount manipulation
Estate staff can change PO monetary information.

### P1-14 — PO line manipulation
Staff can change quantities/unit prices.

### P1-15 — Goods receipt forgery
Staff can create/modify receipt evidence.

### P1-16 — Receipt quantity/acceptance manipulation
`quantity_received` and `accepted` participate directly in the three-way match.

These four should be fixed as one procurement security project, not four isolated patches.

---

# 6. Identity, screening and external access

### P1-17 — Tenant screening result manipulation
Policies named "Screening staff access" actually establish organization membership rather than a screening capability.

Users can potentially manipulate:

- status
- recommendation
- provider reference
- reviewer
- review timestamp
- result

### P1-18 — Screening information overexposure
Sensitive tenant-screening data may be readable by too broad an organization audience.

### P1-19 — Stakeholder portal token exposure
Organization members can access bearer tokens stored in `stakeholder_portal_access`.

### P1-20 — Stakeholder portal takeover
The same records are mutable, potentially allowing modification of token, expiration, recipient/contact and access state.

---

# 7. Integrations

### P1-21 — Organization integration over-permission
`organization_integrations.config` can be read/modified by ordinary organization members.

Potentially affected integrations include DocuSign, banking, accounting, WhatsApp, payment and AI providers.

**Fix:** provider credentials never exposed through ordinary SELECT; secrets should live in a secrets store/server environment. Configuration changes require `integration:manage`.

---

# 8. Worldwide/jurisdiction findings

BaytMiftah should not use:

```
Organization country
      ↓
everything
```

Use instead:

```
Organization
 ├── home/incorporation jurisdiction
 │
 ├── Portfolio
 │    └── Property
 │         ├── country
 │         ├── subdivision/state/province
 │         ├── legal jurisdiction
 │         ├── operating currency
 │         └── tax configuration
 │
 └── another property
      └── completely different jurisdiction
```

### P1-22 — Legal counsel sign-off manipulation
Ordinary organization members have overly broad access to jurisdiction-specific counsel sign-off records.

### P1-23 — Revenue jurisdiction-event forgery
Members can create jurisdiction revenue events carrying monetary/jurisdiction information.

### P1-24 — Country/default configuration over-permission
The problem is that ordinary members can modify organization-wide jurisdiction/default settings.

### P1-25 — Currency integrity
Many tables validate only `currency.length == 3`. That is insufficient.

---

# 9. Other findings

### P2-01 — Arbitrary SMS/OTP destination
Authenticated users can consume the SMS provider to send OTPs to arbitrary numbers under certain flows.

### P2-02 — CORS overly broad
Shared CORS configuration accepts broad deployment/development origins.

### P2-03 — CSP `'unsafe-inline'`
Important because web sessions are stored in `localStorage`; an XSS vulnerability would have greater impact.

### P2-04 — TLS certificate verification disabled in scripts
Operational DB scripts use `rejectUnauthorized: false`.

### P2-05 — Security scanners fail open
Some local runners can report success when scanners aren't installed.

### P2-06 — Dangerous schema-reset tooling
The schema-reset tooling has broad grants and insufficient production-target protection.

### P3 — Mutable CI dependencies
Some GitHub Actions aren't pinned to immutable SHAs.

---

# 10. Authentication issue still requiring remediation/verification

### Electron OAuth deep-link session injection
The earlier repository security scan found the desktop callback accepting raw `access_token` and `refresh_token` from the `baytmiftah://` protocol.

The correct architecture is:

```
Browser
 ↓
OAuth provider
 ↓
baytmiftah://auth?code=...
 ↓
Electron
 ↓
PKCE exchange
 ↓
Supabase session
```

Never accept arbitrary raw access/refresh tokens through the custom URI.

We should revalidate the latest implementation before closing this item.

---

# 11. Things that survived the attack

These tested paths were substantially better:

- PayAngels payment initialization
- Payment verification
- Refund initiation
- Disbursement initiation
- Bank feed synchronization
- KYC verification
- AI KYC screening
- Notification dispatch
- Organization invitations
- Claim evidence storage
- Maintenance upload storage
- Owner digest scheduler
- Property transactions

These are useful reference implementations for fixing the weaker areas.

---

# 12. Root cause

The largest problem is the authorization model:

```
CURRENT

authenticated
     ↓
organization member
     ↓
estate staff / broad role
     ↓
FOR ALL
     ↓
sensitive table
```

We need:

```
TARGET

authenticated
      ↓
active account
      ↓
organization membership
      ↓
resource scope
      ↓
capability
      ↓
state-transition permission
      ↓
server-side invariant
      ↓
mutation
```

For multinational operation, add:

```
Organization
    ↓
Portfolio
    ↓
Estate / Property
    ↓
Jurisdiction
    ↓
Capability
```

Country must not replace resource authorization.

---

# 13. Latest attack rounds only (excluding older findings)

The latest attack rounds produced a new, narrower backlog that is distinct from the historical issues already recorded above. These are the active candidates that should be treated as the current remediation queue.

| Severity | New vulnerability | Main risk |
|----------|-------------------|----------|
| CRITICAL | Fake `privileged_step_up` sessions | Users can create their own records claiming privileged confirmation |
| CRITICAL | Step-up `confirm()` performs no real authentication | No MFA/password/AAL2 verification before marking high-risk action confirmed |
| CRITICAL | Owner payout automatically creates its own step-up | `executeLiveDisbursement()` calls `confirm()` itself |
| CRITICAL | Owner payout self-request + self-approval | Same identity requests and immediately approves a distribution |
| CRITICAL candidate | Mutable statement → payout chain | Finance user may alter `net_distributable_minor` before payout |
| CRITICAL candidate | Work-order approval forgery | Estate staff can create/update records claiming budget/quote/completion approval |
| HIGH | Work-order quote self-approval | Staff can manipulate quote amount, vendor, currency and approval fields |
| HIGH | AI approval-state forgery | Org members can manipulate AI alert `approved` state and evidence |
| HIGH | Automation-event injection | Org members can create/alter automation events and arbitrary JSON payloads |
| HIGH | Owner statement financial mass assignment | Trusted calculated statement fields remain directly mutable |
| HIGH | Distribution-approval mass assignment | Finance users can directly manipulate approval records |
| HIGH | Payout schedule manipulation | Finance roles can alter owner, estate, schedule and execution metadata |
| HIGH | Unverified payout destination design | Owner payout uses ordinary `users.phone` as the payment destination |
| HIGH | Payment-plan financial mass assignment | Direct modification of total, deposit, currency, dates and status |
| HIGH | Installment status/amount manipulation | Finance roles can directly mark installments paid/waived/cancelled or alter amounts |
| HIGH | Promise-to-pay verification forgery | `verified_by`, payment reference, verification time and status are directly mutable |
| HIGH | Collections audit-event forgery | Actor, event type, metadata and timestamps aren't trustworthy audit evidence |
| HIGH | Legal-hold deletion/manipulation | Ordinary organization owner/manager can alter or delete legal holds |
| MEDIUM/HIGH | Management-mode mass assignment | Owner/staff `FOR ALL` access exposes relationship/configuration fields |
| MEDIUM/HIGH | Retention-policy manipulation | Managers can freely change retention rules without jurisdictional safeguards |
| MEDIUM/HIGH | AI configuration authorization too broad | Generic owner/manager roles control organization-wide AI tools |

## Most dangerous newly discovered chain

The strongest chain currently looks like:

```text
Finance-capable account
        ↓
alter owner statement
        ↓
inflate net_distributable_minor
        ↓
execute owner payout
        ↓
application creates "step-up" itself
        ↓
same user requests approval
        ↓
same user approves it
        ↓
executeDistributionPayout()
        ↓
payment provider
```

The last part—whether the payment backend independently stops the manipulated amount/destination—still needs to be traced before the entire money-movement chain can be declared fully confirmed.

## AI-specific new findings

Two are concrete:

- **AI approval forgery:** `estate_ai_watch_alerts` allows organization members to manipulate fields including `approval_required`, `status`, `severity`, `evidence`, and `agent_name`.
- **Automation event injection:** `estate_automation_events` lets organization members manipulate events, execution status, scheduling and JSON payloads.

The dedicated AI red-team pass for prompt injection → RAG → tool calling → authorization → cross-tenant access remains open and should be treated as a major outstanding attack area to test.

## Latest-round remediation posture

These findings should be fixed as a focused attack round, separate from the older backlog.

1. Step-up must be externally verified, not self-issued.
2. Every high-risk payout path must require a distinct authenticated approver or a second-factor approval record that the same actor cannot satisfy alone.
3. Statement-derived payout values must be immutable once posted and must not be mutable by finance roles downstream.
4. Work-order approval and quote records must be separated from the signer/approver identity to prevent self-approval.
5. Automation and AI alert tables must enforce per-resource authorization and remove broad `FOR ALL` patterns.
6. Owner payout destinations must be resolved from a validated payment-profile or payout account, not from ordinary user contact data.
7. Financial schedule, installment, and promise-to-pay tables must be locked behind server-side transition functions and immutable posting rules.
8. Legal holds, retention rules, and management-mode configuration must be restricted to explicit compliance/admin capabilities.

---

# 14. Recommended remediation sequence

1. Lock financial tables — escrow, trust accounts, trust ledger, journal entries, bank transactions, payout requests.
2. Introduce capability-based authorization instead of broad `member`, `staff`, and `finance` predicates.
3. Make financial/legal history immutable and use reversals/amendments.
4. Repair procurement segregation of duties.
5. Lock e-signature/DocuSign state.
6. Fix cross-tenant maintenance grants.
7. Protect integration credentials/configuration.
8. Separate screening/compliance permissions.
9. Implement property-level international jurisdiction/currency model.
10. Fix WhatsApp/SMS provider abuse.
11. Fix Electron OAuth callback.
12. Harden CSP/CORS/CI/scripts.
13. Add adversarial regression tests for every vulnerability.

Most importantly, do not patch these with dozens of unrelated RLS edits. Introduce reusable authorization primitives such as `has_capability(user, organization, capability, resource)` and narrowly scoped server-side state-transition functions. Otherwise the same vulnerability pattern will keep returning as BaytMiftah grows.

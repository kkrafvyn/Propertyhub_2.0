# BaytMiftah Execution Tracker 2026

## Objective

This tracker converts the release gate into a working execution plan for the 14 critical items. It is ranked in the order that reduces the highest risk first.

---

## 1. Tenant isolation and RLS proof

Status: Not started
Priority: P0
Owner: Platform Engineering + Security

Scope:
- organization-scoped resource review
- cross-tenant SELECT/INSERT/UPDATE/DELETE tests
- storage access tests
- API access tests
- edge function access tests
- AI access tests
- export access tests

Expected outcome:
- no cross-tenant access without explicit permission
- all violations are detected and prevented
- authorization is enforced server-side

Evidence required:
- test matrix
- failing-case results
- mitigation summary

---

## 2. Backend authorization enforcement

Status: Not started
Priority: P0
Owner: Platform Engineering + Security

Scope:
- central authorization layer
- evaluate user → organization → role → permission → resource → action
- enforce on backend and Edge Functions
- audit admin and platform actions
- protect exports, payments, AI, and bulk operations

Expected outcome:
- no sensitive action depends on frontend-only checks
- all permission checks occur on the server side

Evidence required:
- authorization matrix
- review of protected actions
- negative test records

---

## 3. Production environment separation

Status: Not started
Priority: P0
Owner: DevOps + Platform Engineering

Scope:
- separate Supabase environments
- separate Pay Angels credentials
- separate Resend credentials
- separate AI credentials
- Vercel app and marketing project separation
- DNS, SSL, HTTPS, rollback validation

Expected outcome:
- dev/staging/prod are insulated and deployable independently

Evidence required:
- environment map
- domain and TLS configuration
- deployment runbook

---

## 4. Secret rotation and credential hygiene

Status: Not started
Priority: P0
Owner: Platform Owner + DevOps

Scope:
- rotate leaked or outdated keys
- remove secrets from source code and bundle output
- verify env files are ignored
- document required variables
- configure secret storage and access controls

Expected outcome:
- no production credentials are exposed in repo, logs, or frontend bundles

Evidence required:
- secret inventory
- rotation log
- .gitignore and deployment config review

---

## 5. Pay Angels production hardening

Status: Not started
Priority: P0
Owner: Finance Engineering + Platform Ops

Scope:
- production API keys and endpoints
- webhook verification and signature checks
- replay protection
- idempotency
- duplicate callback handling
- payment verification
- amount verification
- currency verification
- refund and reversal handling
- ledger reconciliation

Expected outcome:
- payment events can be traced end-to-end from callback to ledger to receipt

Evidence required:
- reconciliation report
- webhook test results
- ledger audit trail

---

## 6. AI governance and kill switch

Status: Partial / repo-level implementation exists
Priority: P0
Owner: AI Platform + Security

Scope:
- agent registry
- tool allowlists
- org and role boundaries
- risk-tier enforcement
- global AI kill switch
- agent-specific kill switches
- AI audit logs
- model and version tracking

Expected outcome:
- AI actions are permission-bound, auditable, and disabled when needed

Evidence required:
- security matrix
- kill switch test record
- AI action ledger review

---

## 7. Event ledger + public/private data separation

Status: Partial / Public explorer implemented
Priority: P1
Owner: Architecture + Trust Engineering

Scope:
- authoritative event schema
- append-only event records
- public event projection
- private event filtering
- explorer read model
- no private identity or financial exposure in public views

Expected outcome:
- public explorer reflects only approved public state

Evidence required:
- event model review
- public/private boundary checklist
- access validation results

---

## 8. Message → Action + escalation

Status: Not started
Priority: P1
Owner: AI Ops + Customer Operations

Scope:
- classify tenant and user messages by intent
- extract entities and context
- route to maintenance, collections, viewing, or other workflows
- require permission before action execution
- include human fallback when confidence is low
- escalate after SLA failure

Expected outcome:
- AI can trigger safe supported workflow actions with audit and escalation

Evidence required:
- intent classification test set
- permission-gated action tests
- escalation flow proof

---

## 9. Exception + approval center

Status: Not started
Priority: P1
Owner: Operations + Platform Engineering

Scope:
- event-to-exception pipeline
- severity and routing
- approval policy engine
- delegation and expiry
- rejection / resubmission flow
- audit trail for approvals and exceptions

Expected outcome:
- users see actionable exceptions rather than raw system noise
- high-risk actions require explicit approval

Evidence required:
- approval matrix
- exception examples and routing test results

---

## 10. Evidence/security center

Status: Not started
Priority: P1
Owner: Security + Operations

Scope:
- suspicious logins
- unusual exports
- permission changes
- AI anomalies
- financial anomalies
- investigation timeline
- evidence grouping
- read-only access for authorized investigators

Expected outcome:
- platform incidents can be investigated and evidenced clearly

Evidence required:
- sample incident investigation record
- audit trail review

---

## 11. My Work unified queue

Status: Not started
Priority: P1
Owner: Product + Platform Engineering

Scope:
- unified work aggregation service
- urgency and SLA sorting
- role-based filtering
- assignment and ownership routing
- deep links to live records

Expected outcome:
- a person can understand what needs attention without hunting through modules

Evidence required:
- unified data source mapping
- queue screenshot or workflow proof
- role-specific examples

---

## 12. Customer health and cost intelligence

Status: Not started
Priority: P1
Owner: Product Analytics + Finance

Scope:
- customer health score
- adoption, support, training, and payment metrics
- AI usage and cost tracking
- cost per org, action, unit, and workflow

Expected outcome:
- operating decisions can be made using real health and cost data

Evidence required:
- health score model
- cost measurement framework
- sample dashboard output

---

## 13. Backups, restore, monitoring, incident response

Status: Not started
Priority: P0
Owner: Platform Ops

Scope:
- database backups
- storage backup strategy
- retention policy
- restore drill
- monitoring for frontend, API, edge functions, AI, payment, and email
- status page and incident playbook

Expected outcome:
- system can recover and explain what failed, when, and who was impacted

Evidence required:
- backup schedule and retention policy
- restore test records
- incident response SOP

---

## 14. Final pilot readiness and E2E signoff

Status: Not started
Priority: P0
Owner: QA + Platform Owner + Security

Scope:
- consumer workflow E2E
- tenant workflow E2E
- finance workflow E2E
- leasing workflow E2E
- business workflow E2E
- AI workflow E2E
- security and authorization smoke tests
- production smoke tests

Expected outcome:
- a controlled pilot can operate without exposing data or violating platform policy

Evidence required:
- test report
- failed-case remediation log
- pilot signoff record

---

## Execution sequence

1. Tenant isolation and RLS proof
2. Backend authorization enforcement
3. Production environment separation
4. Secret rotation and credential hygiene
5. Pay Angels production hardening
6. AI governance and kill switch
7. Event ledger + public/private separation
8. Backup, restore, monitoring, and incident response
9. Message → Action + escalation
10. Exception + approval center
11. Evidence/security center
12. My Work unified queue
13. Customer health and cost intelligence
14. Final pilot readiness and E2E signoff

---

## Release rule

Do not continue past item 6 without evidence that items 1–6 are passed. Once those are verified, continue to the operational and analytics layer and then finish with final pilot readiness.

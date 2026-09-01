# BaytMiftah Production Gate 2026

## Objective

The product direction is now broadly defined. The next phase is not feature expansion. The next phase is proving that BaytMiftah can safely operate as a real-estate operating system under production conditions.

This document converts the master specification into a concrete execution gate for the next launch cycle.

---

## 1. Hard stop before further feature expansion

No major feature work should proceed until the following are complete or explicitly waived by the platform owner:

- tenant isolation is proven
- RLS and authorization checks are audited
- production environments are separated and tested
- payments are production hardened
- secrets are rotated and isolated
- monitoring and backups exist
- E2E security tests pass

---

## 2. Immediate execution order

### Phase 1 — Security and tenant control

#### Milestone 1.1: Tenant isolation and authorization proof
Owner: platform engineering

Checklist:
- audit every organization-scoped table
- test cross-tenant SELECT, INSERT, UPDATE, DELETE
- test cross-tenant storage access
- test API access across organizations
- test edge function access across organizations
- test AI access across organizations
- test export access across organizations
- review break-glass access

Exit gate:
- no data can be read or modified across tenant boundaries without explicit permission
- evidence recorded for each audit result

#### Milestone 1.2: Role and permission control plane
Owner: platform engineering + security

Checklist:
- centralize permission evaluation
- map user → organization → role → permission → resource → action
- enforce backend authorization for every sensitive operation
- add explicit checks for admin and platform actions
- verify all financial and AI actions are permission-gated

Exit gate:
- no UI-only authorization trust
- no backend action relies on frontend state alone

#### Milestone 1.3: AI governance and kill switch
Owner: AI platform + platform ops

Checklist:
- define agent registry
- define tool allowlists
- define org-scoped AI permission matrix
- implement AI kill switch
- implement agent kill switch
- add AI audit logs
- add model and version tracking

Exit gate:
- every AI action is permitted, logged, and reversible where required

---

### Phase 2 — Production environment and secrets

#### Milestone 2.1: Development / staging / production split
Owner: platform engineering + DevOps

Checklist:
- dev Supabase
- staging Supabase
- production Supabase
- dev Pay Angels
- staging Pay Angels
- production Pay Angels
- dev Resend
- staging Resend
- production Resend
- dev AI keys
- staging AI keys
- production AI keys
- environment variable mapping for each layer

Exit gate:
- no environment shares production credentials with local or staging environments

#### Milestone 2.2: Vercel production setup
Owner: engineering + DevOps

Checklist:
- production GitHub repo connected
- app project created
- marketing project created
- domain mapping for app and marketing sites
- HTTPS and DNS configured
- build command verified
- Node version pinned
- environment variables configured per environment
- preview environment enabled
- rollback process documented

Exit gate:
- production deploys are repeatable and reversible

#### Milestone 2.3: Secrets and credential hygiene
Owner: platform owner + engineering

Checklist:
- rotate all old or leaked credentials
- remove secrets from source code
- audit frontend bundle exposure
- verify .env files are ignored
- document required environment variables
- configure secret storage and access control

Exit gate:
- no secrets remain in repo history or deployment config unexpectedly

---

### Phase 3 — Financial system productionization

#### Milestone 3.1: Pay Angels production hardening
Owner: finance engineering + platform ops

Checklist:
- production API credentials
- production endpoint configuration
- webhook verification
- replay protection
- idempotency checks
- payment verification logic
- amount verification
- currency verification
- duplicate callback handling
- service fee logic
- refund flow
- reconciliation and settlement process
- provider outage handling
- audit log retention

Exit gate:
- every payment event can be traced from callback to ledger to receipt

#### Milestone 3.2: Ledger integrity and reconciliation
Owner: finance + engineering

Checklist:
- immutable payment events
- idempotent allocations
- double-payment protections
- refund recording
- reversal handling
- ledger consistency checks
- journal consistency checks
- reconciliation workflow
- period locking
- audit evidence trail

Exit gate:
- historical financial truth cannot be silently rewritten

#### Milestone 3.3: Bank feeds and accounting integration
Owner: finance engineering

Checklist:
- production OAuth or API integration
- sync scheduling
- initial and incremental sync
- duplicate prevention
- retry and failure handling
- normalization
- bank transaction matching
- reconciliation and evidence trail

Exit gate:
- bank-feed data can be trusted as a source of truth only after matching rules and review

---

### Phase 4 — Trust, evidence, and operational control

#### Milestone 4.1: Event ledger and public/private separation
Owner: platform architecture + trust engineering

Checklist:
- define authoritative event taxonomy
- connect event model to ERP records
- define public event projection
- define private data isolation
- create append-only event storage
- create explorer read model

Exit gate:
- public explorer never exposes private identity or private financial data

#### Milestone 4.2: Evidence center and security center
Owner: security + operations + audit

Checklist:
- logs for payments, leases, AI actions, approvals, tickets, exports, and permissions
- investigation screens for authorized users
- read-only evidence trails
- security anomaly monitoring
- suspicious event review workflow

Exit gate:
- a platform incident can be investigated from raw system evidence to final action

#### Milestone 4.3: Exception center and approval center
Owner: operations + platform engineering

Checklist:
- event → rule → exception → owner → deadline → escalation
- approval policies by permission and risk tier
- approval routing and escalation
- rejection and resubmission workflows
- audit of every approval decision

Exit gate:
- operational risk is visible to the right manager without buried manual hunting

---

### Phase 5 — AI and workflow operations

#### Milestone 5.1: Message → Action and escalation
Owner: AI platform + customer operations

Checklist:
- classify intents from messages
- extract entities and context
- route to appropriate workflow
- enforce permissions before actions
- create maintenance, collections, or sales workflow when valid
- create human fallback path when confidence is low

Exit gate:
- AI does not trigger operational actions without valid permission and context

#### Milestone 5.2: AI Night Watch and operational monitoring
Owner: AI ops + operations

Checklist:
- scheduled monitoring jobs
- arrears checks
- lease expiry checks
- SLA monitoring
- failed payment and failed workflow detection
- contractor delay tracking
- anomaly detection
- briefing generation
- human escalation path

Exit gate:
- monitoring is scheduled, auditable, and operationally useful

#### Milestone 5.3: Company Knowledge / SOP AI
Owner: enterprise AI + product

Checklist:
- org-level document ingestion
- org isolation on retrieval
- permission filtering
- source citation
- versioning and update trail
- approval for internal knowledge use

Exit gate:
- company A cannot access company B knowledge

---

### Phase 6 — Customer operating layer

#### Milestone 6.1: My Work and role-aware workspace
Owner: product + platform design

Checklist:
- build unified work queue service
- route work by user role and org context
- filter by urgency, SLA, and state
- connect to operational records
- deep link to relevant screens

Exit gate:
- user can understand current work without navigating multiple modules

#### Milestone 6.2: Organization context switching and owner self-management
Owner: platform architecture + product

Checklist:
- allow user to operate across multiple organization contexts
- enforce session and permission refresh on context switch
- support self-managed, managed, and hybrid ownership models
- enforce contractor boundaries and restricted access

Exit gate:
- context switching does not leak permissions across organizations or roles

#### Milestone 6.3: Customer health and cost intelligence
Owner: platform product + analytics

Checklist:
- adoption score
- support load
- training completion
- payment health
- renewal risk
- AI usage
- cost per org and per action

Exit gate:
- platform team can measure health and profitability of each customer organization

---

### Phase 7 — Release readiness

#### Milestone 7.1: CI/CD and branch protection
Owner: engineering

Checklist:
- lint
- typecheck
- unit tests
- integration tests
- RLS tests
- security tests
- build verification
- preview deployment
- E2E checks
- production approval gate
- rollback process

Exit gate:
- no production release is possible without review and passing checks

#### Milestone 7.2: E2E and security validation
Owner: QA + security engineering

Checklist:
- consumer journey
- tenant workflow
- finance workflow
- leasing workflow
- business workflow
- AI workflow
- cross-tenant security tests
- webhook security tests
- authorization tests
- rate limit tests

Exit gate:
- critical flows are proven under real deployment conditions

#### Milestone 7.3: Backups, recovery, and monitoring
Owner: platform ops

Checklist:
- database backups
- storage backup strategy
- retention policy
- restore drill
- monitoring of frontend, API, edge functions, payments, and AI
- incident response playbook
- system status page

Exit gate:
- the platform can recover and explain what failed and who was affected

---

## 3. Launch gate

BaytMiftah is ready for pilot only when all of the following are true:

- tenant isolation is proven
- authorization is enforced in backend and not UI-only
- production environments are separated and operational
- Pay Angels is live in production and verified
- Resend is configured and monitored
- AI governance and kill switch are active
- event ledger and public/private data separation are validated
- evidence, security, and audit trails exist
- backups and disaster recovery are tested
- E2E workflows pass
- customer health and cost instrumentation are active

---

## 4. Recommended next sprint sequence

### Sprint 1
- tenant isolation and authorization audit
- environment split and secret rotation
- production Vercel setup

### Sprint 2
- Pay Angels production hardening
- ledger integrity and reconciliation
- bank-feed and Resend protection

### Sprint 3
- AI governance, kill switch, and action ledger
- Message → Action and escalation
- public/private explorer protections

### Sprint 4
- My Work, exception center, approval center
- evidence and security center
- customer health and cost intelligence

### Sprint 5
- E2E validation
- backup / restore test
- production pilot readiness review

---

## 5. Final principle

BaytMiftah is not ready for broad expansion until the platform proves it can protect identity, money, data, trust, and actions across organizations. Once those gates are passed, the remaining product concepts become real operating capabilities instead of risk.

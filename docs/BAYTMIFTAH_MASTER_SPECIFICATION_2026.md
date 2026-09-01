# BaytMiftah Master Specification 2026

## Status legend

- Implemented: present in the current repo and functionally represented in code or UI
- Productionization: conceptually approved and partially implemented, but not yet hardened for production
- Future: valid strategic direction, but not yet implemented in the repo
- Deferred: not current priority for the present launch phase

---

## 1. Public Property Explorer

Status: Implemented

### Scope
- `/explorer/property/{id}`
- `/explorer/unit/{id}`
- `/explorer/transaction/{id}`

### Requirements
- permanent public property IDs
- permanent public unit IDs
- permanent public transaction IDs
- public status and verification state
- pseudonymous participant IDs
- public event history
- privacy filtering
- no government ID, phone, email, bank info, private leases, or private documents in public views

### Current repo evidence
- Route added in `src/app/routes/consumer.routes.tsx`
- Page added in `src/app/pages/PublicPropertyExplorer.tsx`
- Test added in `src/app/pages/PublicPropertyExplorer.test.tsx`

### Productionization work
- enforce public/private separation at API + database layer
- ensure all explorers surface only approved public fields
- add transaction and property histories tied to authoritative system records
- add indexing, shareable URLs, and caching

---

## 2. Event Ledger

Status: Productionization

### Scope
- authoritative event history for property lifecycle
- lease lifecycle events
- financial lifecycle events
- maintenance lifecycle events
- public event projection for explorer views

### Requirements
- event schema
- event IDs
- timestamps
- actor/public actor ID
- previous state
- new state
- source
- verification state
- append-only storage
- audit linkage
- public event projection

### Important rule
This must derive from authoritative ERP records rather than becoming a competing system of record.

### Productionization work
- define canonical event taxonomy
- ensure append-only semantics
- connect to financial and lease records
- create public read model separate from private event data
- add event replay and audit recovery checks

---

## 3. My Work

Status: Future

### Scope
- unified work queue per user and role
- categories: urgent, needs attention, scheduled, waiting, completed

### Requirements
- role-aware filtering
- priority engine
- SLA integration
- escalation integration
- notification integration
- AI recommendations
- deep links to an underlying record

### Goal
The user should not need to hunt through the ERP to know what to do next.

### Productionization work
- create a single work aggregation service
- link all work sources into a single queue
- add permission-aware filters and role defaults
- add sorting by urgency + SLA + ownership

---

## 4. Exception Center

Status: Future

### Scope
- operational exception stream
- issue-driven view for staff and managers

### Examples
- payment failure
- SLA breach
- lease expiry
- failed automation
- contractor delay
- reconciliation mismatch
- security anomaly
- AI failure

### Requirements
- event → rule → exception → severity → owner → deadline → escalation → resolution

### Productionization work
- shared exception engine
- severity classification and routing
- ownership and deadline model
- escalation and auto-warning flows
- dashboarding and alert channels

---

## 5. Approval Center

Status: Future

### Scope
- centralized pending approvals
- operational human authorization for sensitive decisions

### Examples
- refunds
- procurement
- contractor quotes
- lease actions
- financial changes
- AI actions

### Requirements
- approval object
- approval policy
- approval chain
- delegation
- expiry
- rejection and resubmission
- notification
- audit

### Productionization work
- single approval service
- approval policies by risk tier
- delegated approvals and escalation
- event log tied to audit trail

---

## 6. Command Bar

Status: Future

### Scope
- natural-language operational commands

### Examples
- “Show unpaid rent over GHS 2,000”
- “Create a maintenance ticket for Unit B14”
- “Generate this month’s owner statement”

### Requirements
- intent detection
- entity extraction
- permission check
- sensitive action confirmation
- action preview
- execution
- audit
- undo/reversal where appropriate

### Critical rule
Natural-language request must not become unrestricted database mutation.

---

## 7. AI Night Watch + Action Ledger

Status: Implemented / Productionization

### Scope
- autonomous monitoring
- AI operational briefings
- approval-gated action execution
- risk tier framework

### Current repo evidence
- `src/lib/agentic-ai-orchestrator.service.ts`
- `src/app/pages/workspace/AICommandCenter.tsx`

### Requirements
- Level 0 automatic actions
- Level 1 policy-controlled actions
- Level 2 human approval required
- Level 3 human-only actions
- audit of every AI action
- explicit agent and tool permissions

### Productionization work
- confirm tool allowlists and tenant boundaries
- enable org-specific AI scopes and kill switches
- add secure model and version tracking
- ensure AI Night Watch writes to a permanent action ledger

---

## 8. AI Tutor + Practice Mode

Status: Implemented

### Scope
- personalized onboarding
- role-specific tutorials
- safe practice workflows

### Current repo evidence
- `src/app/components/onboarding/NewUserTutorial.tsx`

### Requirements
- identify user role
- tailor tutorial path
- role-based context selection
- practice mode with safe sample workflows
- completion tracking
- resume state
- contextual help

### Productionization work
- connect tutorials to real team workflows and permissions
- tie tutorial steps to actual business screens
- add versioning and analytics

---

## 9. Company Knowledge / SOP AI

Status: Future

### Scope
- company-provided SOPs, policies, FAQs, and internal guides
- AI answers based on approved internal knowledge

### Requirements
- knowledge upload
- indexing
- retrieval
- organization isolation
- permission filtering
- source citations
- versioning
- removal and update flow
- AI access controls

### Critical rule
Company A knowledge must never be retrievable by Company B.

---

## 10. AI Workforce + Kill Switch

Status: Future

### Scope
- property, finance, collections, leasing, sales, maintenance, customer service, document, utility, asset, procurement, executive, operations, and devops agents

### Requirements
- each agent has tools, permissions, org scope, data scope, action level, budget, and audit trail
- global kill switch
- agent-specific kill switches
- org-specific disables
- emergency disable
- audit of every switch action

### Productionization work
- define agent tool registry
- implement permission matrix
- add kill switch wiring and emergency safe-fallback paths

---

## 11. Message → Action + Escalation

Status: Productionization

### Scope
- turn incoming messages into operational action

### Examples
- “My sink is leaking.” → maintenance ticket
- “When is my rent due?” → payment info
- “I want to view that property.” → viewing request
- “I can’t make this month’s payment.” → collections case

### Requirements
- intent classification
- entity extraction
- conversation context
- permission checks
- action router
- human fallback
- audit
- risk/confidence controls

### Escalation rule
If assigned managers do not respond within SLA, escalate upward to the configured company escalation path.

### Productionization work
- connect messaging to ticketing, payment, and property workflows
- enforce permissions before action execution
- add escalation rules and SLA timers
- ensure human fallback remains available

---

## 12. Evidence + Security Center

Status: Future

### Scope
- security and evidence dashboards
- suspicious logins
- failed authentication
- unusual exports
- permission changes
- API anomalies
- AI anomalies
- credential events
- incident monitoring

### Requirements
- investigation timeline
- evidence grouping
- access controls
- export
- audit access
- security alerts

### Productionization work
- build evidence data model and log retention
- tie evidence to payments, leases, AI actions, approvals, tickets, and escalations
- create read-only investigation screens for authorized staff

---

## 13. Customer Health + Cost Intelligence

Status: Future

### Scope
- organization-level health score
- adoption, support, training, payment, renewal risk, and AI usage metrics
- cost traceability per organization, user, AI action, transaction, and storage

### Requirements
- usage analytics
- support analytics
- training completion analytics
- platform economics data
- organizational risk scoring

### Productionization work
- define customer health scoring model
- instrument cost ledger and AI usage tracking
- create manager dashboard

---

## 14. Platform Control Plane

Status: Future

### Scope
- shared system layer for identity, organizations, permissions, billing, AI, trust, legal, audit, and integrations

### Requirements
- identity and session model
- org and context switching
- permission and policy engine
- billing and subscriptions
- AI governance
- trust and legal control layer
- audit and evidence integration

### Productionization work
- centralize access policy and org boundaries
- unify identity and role contexts across all surfaces
- link all economic, AI, and trust features through one policy layer

---

## 15. Tenant isolation + RLS

Status: Productionization

### Scope
- organization-level data boundaries
- secure cross-tenant access controls
- Row Level Security enforcement

### Requirements
- company A user may not read company B data
- company A user may not modify company B data
- all sensitive backend actions check: user → org → role → permission → resource → action

### Current repo evidence
- business routes exist for organization-scoped workspaces
- owner self-management is represented in `src/lib/owner-operator.service.ts`
- AI and platform-level security is represented in `src/lib/agentic-ai-orchestrator.service.ts`

### Productionization work
- full RLS audit across all tables
- cross-tenant SELECT/INSERT/UPDATE/DELETE tests
- storage tests
- API tests
- edge function tests
- AI tests
- export tests
- webhook validation and policy enforcement
- incident response and break-glass review

---

## Cross-cutting architecture

### Shared product model

```
CONSUMER
  Web + Mobile

BUSINESS
  Web + Desktop + Mobile

PLATFORM ADMIN
  Web + Desktop + Mobile (incident triage + platform ops)
```

### Shared operating model

```
Discover
→ Connect
→ View
→ Apply / Offer / Book
→ Transact
→ Pay
→ Lease / Stay
→ Operate
→ Maintain
→ Communicate
→ Renew
```

### Shared governance model

```
Identity
→ Organization
→ Role
→ Permission
→ Resource
→ Action
→ Audit
```

---

## Immediate priority order

1. Tenant isolation + RLS
2. Platform control plane
3. Public Property Explorer hardening
4. Event ledger and public/private data separation
5. AI Night Watch + Action Ledger governance
6. Approval Center and exception engine
7. Message → Action + escalation
8. Evidence + Security Center
9. Company Knowledge / SOP AI
10. Customer Health + Cost Intelligence

---

## Final recommendation

The core product is now broader than a marketplace. BaytMiftah is a real-estate operating system with a consumer layer, a business layer, a platform layer, an AI operating layer, a trust/legal layer, and a public transparency layer.

The immediate priority is not feature sprawl. It is proving the system is safe, tenant-isolated, policy-governed, and production-grade before more product expansion is attempted.

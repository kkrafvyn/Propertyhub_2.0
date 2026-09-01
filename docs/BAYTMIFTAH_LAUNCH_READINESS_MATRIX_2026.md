# BaytMiftah Launch Readiness Matrix 2026

## Purpose

This matrix turns the production gate and master specification into a practical launch tracker. It is structured to answer two questions quickly:

1. What is the current launch status?
2. What evidence is required to release or continue?

---

## 1. Gate status by area

### A. Tenant isolation and authorization

Status: Blocked / Not evidenced yet
Owner: Platform engineering + security
Evidence required:
- cross-tenant SELECT tests
- cross-tenant INSERT/UPDATE/DELETE tests
- storage access tests
- API access tests
- edge function access tests
- AI data access tests
- export permission tests

Release decision:
- cannot proceed to pilot without proof of no cross-tenant access

### B. Production environment separation

Status: Blocked / Not evidenced yet
Owner: DevOps + platform engineering
Evidence required:
- separate Supabase environments
- separate Pay Angels credentials
- separate Resend credentials
- separate AI credentials
- Vercel app and marketing project configured
- DNS, HTTPS, and rollback validated

Release decision:
- cannot proceed to pilot without isolated environment map and working deploy flow

### C. Payment hardening

Status: Blocked / Not evidenced yet
Owner: Finance engineering + platform ops
Evidence required:
- webhook signature validation
- idempotency tests
- duplicate callback handling
- payment verification and ledger settlement records
- refund and reversal audit trail
- reconciliation workflow validated

Release decision:
- cannot proceed to pilot without financial truth and provider reconciliation proof

### D. AI governance and kill switch

Status: Partial / in repo, not production-hardened
Owner: AI platform + security
Evidence required:
- agent registry
- tool allowlist
- org-boundary enforcement
- risk-tier approval mapping
- kill switch test
- AI action ledger review

Release decision:
- AI must be permission-bound and auditable before live customer use

### E. Event ledger and public/private separation

Status: Partial / explorer implemented, ledger not authoritative yet
Owner: architecture + trust engineering
Evidence required:
- event taxonomy
- append-only storage model
- public/private boundary validation
- explorer read model audit
- no private identity leakage

Release decision:
- public explorer must be validated as read-only public projection only

### F. Exception center and approval center

Status: Future / not proven
Owner: operations + product
Evidence required:
- rule engine inputs and outputs
- severity mapping
- owner routing
- SLA and escalation workflow
- approval by risk tier

Release decision:
- operational controls can be piloted only after governance and routing are proven

### G. Message → Action and escalation

Status: Future / on design path
Owner: AI ops + customer operations
Evidence required:
- message intent classification tests
- permission checks before action creation
- escalation timers and human fallback
- repair ticket / collections / viewing creation tests

Release decision:
- AI-triggered operational actions must be blocked without permission and audit

### H. Evidence and security center

Status: Future / not proven
Owner: security + operations
Evidence required:
- anomaly logs
- approval logs
- AI action logs
- payment audit logs
- ticket and escalation logs
- export activity logging

Release decision:
- investigation workflow must work before enterprise customer onboarding

### I. Customer health and cost intelligence

Status: Future / not proven
Owner: product analytics + finance
Evidence required:
- customer health model
- cost per org and per workflow
- AI usage measurement
- support and adoption analytics

Release decision:
- pricing and expansion decisions should not rely on estimates alone

### J. My Work and role-aware workspace

Status: Partial / not fully unified
Owner: product + engineering
Evidence required:
- role-aware queue generation
- SLA sorting
- owner visibility and permissions
- deep links to live records

Release decision:
- must work for day-to-day operations for the first enterprise customer

---

## 2. Launch-grade checklist

### Must complete before pilot

- [ ] tenant isolation proven
- [ ] RLS and backend authorization audited
- [ ] cross-tenant tests passed
- [ ] production environment separation complete
- [ ] secrets rotated and isolated
- [ ] Vercel production configured
- [ ] Pay Angels production verified
- [ ] Resend production verified
- [ ] AI governance and kill switch active
- [ ] backup and restore tested
- [ ] monitoring and incident process live
- [ ] E2E security smoke tests pass
- [ ] evidence and audit workflow available

### Must complete before broader commercialization

- [ ] My Work workflow unified
- [ ] approval center working
- [ ] exception center operational
- [ ] message → action + escalation proven
- [ ] customer health dashboard live
- [ ] cost intelligence dashboard live
- [ ] company knowledge / SOP AI policy tested
- [ ] org context switching hardened

---

## 3. Decision gate

### Ready for pilot when:

- platform is secure by design
- data cannot cross organizations without explicit permission
- money movement is auditable and reconciled
- AI is permitted and logged
- production environments are separated and recoverable
- the first customer can operate in a controlled, monitored environment

### Not ready for pilot when:

- backend authorization depends on UI state
- data boundaries are untested
- AI is acting without approval policy and audit
- financial touches cannot be traced end-to-end
- backups and restore are not proven

---

## 4. Recommended next milestone

### Next milestone: Production Hardening Sprint

Scope:
1. tenant isolation proof
2. role and permission control plane
3. production environment separation
4. secret rotation and verification
5. Pay Angels live verification
6. AI kill switch and action ledger verification
7. restore and monitoring proof

This is the correct next step because it reduces the single biggest risk: one production configuration mistake or cross-tenant authorization bug could undermine the entire BaytMiftah platform.

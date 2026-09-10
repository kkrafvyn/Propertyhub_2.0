# BaytMiftah — Risk Register

**Audit date:** 2026-09-09  
**HEAD:** `c895fe0`+ on `main` (review-fixes + missing-items scan batch)  
**Methodology:** Static inspection + `npm run production:check` + GitHub Actions CI + live Supabase migrations  
**Supersedes:** 2026-09-01 register (pre-CI, pre-2026090202)

---

## Precedence legend

| Precedence | Meaning | Release rule |
|------------|---------|--------------|
| P0 | Active incident | Hard stop |
| P1 | Tenant / auth / secret / public-data | Hard stop for production |
| P2 | Finance / payment / AI integrity | Stop for money movement / AI in prod; staging possible with plan |
| P3 | Unsafe test or destructive action | Do not proceed with that action |
| P4 | Build / E2E / ship-from-git | Hard stop until origin matches a passing gate |
| P5 | External configuration | Expected; still required before go-live |
| P6 | Independent validation | Required before commercial launch |
| P7 | Ambiguity / unverified live DB | Treat as P1 until proven |
| P8/P9 | Non-blocking | Track only |

**P0 open:** none  
**Active primary blockers:** **P5 Vercel anon key + monitoring/backup secrets**, **P2 partial RLS (non-deal tables)**

---

## P0 — Active incident

None identified. No evidence of an ongoing production breach in this inspection.

---

## P1 — Critical security / tenant / auth / public data

### R-001 — Cross-tenant isolation not proven live

```text
Issue: Live RLS tests require VITE_SUPABASE_TEST_* GitHub secrets.
Severity: CRITICAL (was); mitigated in CI
Evidence: .github/workflows/ci.yml — tenant isolation integration tests step;
          gh run 34412130520 — build-and-test success incl. tenant isolation (2026-09-09);
          scripts/security/provision-tenant-isolation-fixtures.mjs + --gh-secrets sync
Affected: All organization-scoped tables and Storage prefixes
Impact: CI proves cross-tenant reads blocked when fixtures configured
Fix: Keep fixtures refreshed; extend matrix (deal_cases analyst write — 2026090904)
Verify: npm run security:provision-tenant-fixtures -- --gh-secrets; CI green on main
Owner: Engineering + Security
Status: MITIGATED (CI green run 34412130520); monitor on every main push
Precedence: P1 → P8 (ongoing regression guard)
```

### R-002 — Listings and contacts write not scoped to workspace permissions

```text
Issue: Any org member could mutate listings/contacts before permission-scoped RLS.
Severity: CRITICAL (was)
Evidence: 2026090202_workspace_permission_rls.sql applied (c895fe0 batch);
          org_member_has_permission for listings:write / contacts:write
Impact: Analyst and read-only roles blocked at RLS for listings/contacts
Fix: Applied — maintain role matrix in workspace_role_has_permission migrations
Verify: PostgREST INSERT as analyst → denied (tenant isolation + manual spot check)
Owner: Backend + Security
Status: CLOSED (2026090202 applied production)
Precedence: P1 → resolved
```

### R-003 — organization_members.role CHECK vs extended TypeScript roles

```text
Issue: Original CHECK allows only owner|manager|agent|analyst.
       App assigns 20+ roles (finance_manager, property_manager, …).
       No later migration found that DROPs/replaces this CHECK.
       database.types.ts types role as string | null (inconclusive).
Severity: HIGH / UNVERIFIED live
Evidence: 001_create_schema.sql L41; src/lib/workspace.ts; no ALTER CHECK in grep
Impact: Extended role inserts fail, or live DB already diverged undocumented
Fix: Inspect live constraint; migration to expand CHECK or role table
Verify: INSERT organization_members role=finance_manager on staging
Owner: Database
Status: OPEN — UNVERIFIED (supabase-db.mjs status failed: package pg missing)
Precedence: P7 until inspected; treat as P1 if inserts fail or CHECK is gone without review
```

### R-004 — Fine-grained permissions only partially in RLS

```text
Issue: Not all workspace tables use org_member_has_permission.
Severity: HIGH
Evidence: 2026090202 (listings, contacts); 2026090801 (tasks); 2026090904 (deal_cases, org conversations)
Impact: Remaining tables (documents, finance-adjacent) may still use member-wide policies
Fix: Continue table-by-table RLS vs ROLE_DEFAULTS
Verify: Role matrix integration tests; analyst deal_cases UPDATE denied (2026090904)
Owner: Database + Security
Status: PARTIALLY CLOSED — deal_cases/leads scoped in 2026090904; other tables open
Precedence: P2
```

### R-005 — Global operational_events readable by any authenticated user

```text
Issue: SELECT USING (organization_id IS NULL OR member of org)
Severity: HIGH (information disclosure)
Evidence: 2026082607_operational_observability.sql
Impact: Cross-tenant or platform-internal event leakage if null-org rows hold sensitive payloads
Fix: Restrict NULL-org rows to platform admin / service role
Verify: Authenticated non-admin SELECT WHERE organization_id IS NULL → denied or empty
Owner: Backend
Status: OPEN
Precedence: P1
```

---

## P2 — Finance / payment / AI integrity

### R-006 — AI kill switch and tool allowlist not enforced on all edge paths

```text
Issue: requireOrgMembership + assertOrgAiEnabled only when workspace context or
       describe_listing. summarize_document and generic chat can skip org kill switch.
       ai_tool_allowlist is client-side (ai-tool-allowlist.service.ts), not in ai-assistant.
Severity: HIGH
Evidence: supabase/functions/ai-assistant/index.ts; grep ai_tool_allowlist in functions → none
Impact: Org disablement bypass; prompt/data handling without tool policy
Fix: Enforce kill switch + allowlist in the edge function for every action
Verify: globally_enabled=false → all assistant actions 403; disallowed tool rejected
Owner: AI + Security
Status: OPEN
Precedence: P2 (P1 if assistant can return other tenants’ data — unproven, see R-001)
```

### R-007 — Payment verify/refund role mismatch

```text
Issue: Refunds: owner/manager only. Verify: any org member. Finance roles in org-auth.ts unused here.
Evidence: initiate-payangels-refund/index.ts; verify-payangels-payment/index.ts;
          supabase/functions/_shared/org-auth.ts FINANCE_MEMBER_ROLES
Impact: Over-broad verify; under-broad refund vs product roles
Fix: Align both with an explicit finance allowlist; never “any member” for verify
Verify: finance_officer refund/verify matrix
Owner: Payments
Status: OPEN
Precedence: P2
```

### R-008 — PayAngels webhook compare not constant-time; Paystack env fallback

```text
Issue: HMAC verification and secret wiring.
Evidence: supabase/functions/_shared/payangels.ts — timingSafeEqualHex; dual SHA-512/256 (c895fe0);
          webhook-secret-only path; normalizePaystackAmountMinor
Impact: Reduced timing/oracle risk; amount reconciliation hardened
Fix: Applied in review-fixes; live transaction proof still operator-owned (see R-011)
Verify: pilot:payangels-e2e after secrets set; docs/pilot/PAYANGELS_E2E_EVIDENCE.md
Owner: Payments
Status: MITIGATED (code); live proof OPEN (R-011)
Precedence: P2
```

### R-011 — Live PayAngels signature/amount not yet recorded

```text
Issue: No staging/production transaction logged against reconciliation helpers.
Evidence: npm run pilot:payangels-e2e (2026-09-10) — init ref ph_pay_d9ef5fa31b154aa3b7,
          webhook replay pass; PAYANGELS_API_BASE fix (api.paystack.co)
Impact: Init + webhook path proven; refund/disbursement probes still optional
Fix: Applied PAYANGELS_API_BASE; evidence in docs/pilot/PAYANGELS_E2E_EVIDENCE.md
Verify: Full paid transaction in dashboard + refund probe when ready
Owner: Payments + Ops
Status: CLOSED (init + webhook proof 2026-09-10)
Precedence: P5 → resolved
```

### R-009 — PAYANGELS_DISBURSEMENT_URL not documented

```text
Issue: Disbursement fails closed without URL; .env.example has no PAYANGELS_DISBURSEMENT_URL
Evidence: initiate-payangels-disbursement/index.ts; .env.example grep empty
Impact: Owner payouts 503 in production after “PayAngels is configured”
Fix: Document + set secret; staging E2E
Owner: Payments
Status: OPEN
Precedence: P2 / P5
```

### R-010 — Bank feed env names do not match .env.example

```text
Issue: sync-bank-feed reads MONZO_FEED_BASE_URL / MONZO_FEED_API_KEY;
       .env.example documents MONO_* and PLAID_*
Evidence: supabase/functions/sync-bank-feed/index.ts; .env.example
Impact: Live sync silently unconfigured
Fix: Align names or document Mono/Plaid mapping in the function
Owner: Integrations
Status: OPEN
Precedence: P2
```

### R-011 — E-signature is a simulation stub

```text
Issue: esignature.service.ts stores provider 'simulation' and stub signing URLs
Evidence: src/lib/esignature.service.ts
Impact: Operators may believe leases are legally signed
Fix: Disable in production UI or integrate a real provider; legal copy already caveats this
Owner: Product + Legal
Status: OPEN
Precedence: P2 (misrepresentation) / P6 (legal)
```

### R-012 — Orphan verify-stripe-payment function

```text
Issue: Function exists, uses PayAngels tables, not in deploySupabasePayments.cjs EDGE_FUNCTIONS
Evidence: supabase/functions/verify-stripe-payment/; scripts/deploySupabasePayments.cjs
Impact: Confusion; stale deploy surface
Fix: Remove or add to deploy list with a single name
Owner: Payments
Status: OPEN
Precedence: P2 (hygiene) / P8 if never deployed
```

---

## P4 — Ship-from-git / build / E2E

### R-013 — origin/main fails its own production-check

```text
Issue: production-check required CI workflows and mobile artifacts.
Severity: CRITICAL (was)
Evidence: .github/workflows/ci.yml on main; gh run 34412130520 success;
          npm run production:check 41/41 (review-fixes batch)
Impact: Main branch protected by build, typecheck, unit, tenant isolation, e2e smoke
Fix: Applied — keep production-check aligned with CI steps
Verify: gh run list on main; production:check in CI step 8
Owner: DevOps
Status: CLOSED (2026-09-09)
Precedence: P4 → resolved
```

### R-014 — Local remediation not pushed

```text
Issue: Working tree drift vs origin.
Evidence: c895fe0 pushed review-fixes; missing-items scan batch pending commit
Impact: Audits may lag until next push
Fix: Commit missing-items scan when ready
Owner: Engineering
Status: PARTIALLY CLOSED — review-fixes on origin; latest scan batch local
Precedence: P4
```

### R-015 — E2E coverage partial

```text
Issue: E2E is smoke + search; not full payment/checkout UI path in Playwright.
Evidence: e2e/*.spec.ts; CI e2e smoke step green on run 34412130520
Impact: Pilot payment proof relies on pilot:payangels-e2e script (R-011)
Fix: Extend e2e when pilot flows stabilize
Owner: Engineering
Status: OPEN (coverage gap); MITIGATED (smoke green)
Precedence: P4 / P5
```

### R-016 — Business native variants and Electron packaging incomplete

```text
Issue: capacitor.config.business.json untracked; android-business/ ios-business/ absent.
       electron/main.cjs has no preload, no electron-builder, unsigned.
Evidence: Glob electron/* → main.cjs only; capacitor.config.business.json
Impact: Cannot store-release business mobile or signed desktop from repo as-is
Fix: After web production: sync/commit native variants; packaging + signing
Owner: Mobile / Desktop
Status: OPEN
Precedence: P4 for store/desktop launch; P8 for web-only pilot
```

---

## P5 — External configuration

### R-017 — PayAngels production credentials and webhook

```text
Required: VITE_PAYANGELS_PUBLIC_KEY, PAYANGELS_SECRET_KEY, PAYANGELS_WEBHOOK_SECRET,
          webhook URL on PayAngels dashboard, PAYANGELS_DISBURSEMENT_URL (R-009)
Status: OPEN — code IMPLEMENTED (.env.example names present except disbursement URL)
Precedence: P5
```

### R-018 — Resend production

```text
Required: RESEND_API_KEY, verified sending domain, FROM address secrets in Edge
Evidence: .env.example RESEND_API_KEY
Status: OPEN — code IMPLEMENTED
Precedence: P5
```

### R-019 — Vercel + DNS (frozen architecture)

```text
Required: app.baytmiftah.com → Vercel SPA; optional baytmiftah.com marketing;
          production VITE_SUPABASE_* and public PayAngels key
Evidence: vercel.json on origin; no in-app hostname router (accepted)
Status: OPEN
Precedence: P5
```

### R-020 — Supabase production: migrations + Edge secrets

```text
Required: Confirm 2026090101 and 2026090201 applied; apply 2026090202 after commit;
          deploy EDGE_FUNCTIONS including MoMo, bank-feed, SMS
Evidence: 0101 and 0201 on origin; 0202 untracked; supabase-db status failed (no pg)
Status: OPEN — UNVERIFIED
Precedence: P5 (apply) / P7 (unknown live schema)
```

### R-021 — Tenant-isolation GitHub secrets

```text
Required: VITE_SUPABASE_TEST_URL, ANON_KEY, TENANT_A/B TOKEN and ID
Evidence: ci.yml (local) already wires ${{ secrets.* }}
Status: OPEN
Precedence: P5 enabling P1 proof
```

---

## P6 — Independent validation

### R-022 — Backup restore drill not evidenced

```text
Evidence: scripts/backup/restore-drill.mjs; backups/ directory absent
Status: OPEN
Precedence: P6
```

### R-023 — Monitoring / alerting not evidenced

```text
Evidence: operational_events table; scripts/ops/health-check.mjs; no alert destination
Status: OPEN
Precedence: P6
```

### R-024 — Legal / counsel review

```text
Evidence: legal catalog + acceptance UI exist; no counsel sign-off artifact
Includes: terms, privacy, payments, AI, e-sign simulation (R-011), explorer copy
Status: OPEN
Precedence: P6
```

### R-025 — Independent security tests

```text
Missing: Live two-tenant proof (overlaps R-001); explorer privacy pen-test;
         AI prompt-injection / cross-tenant red team
Status: OPEN
Precedence: P6
```

---

## Closed or mitigated in working tree only (do not treat as production-closed)

| ID | Topic | Disk | origin/main |
|----|--------|------|-------------|
| (was R-002 CI missing) | Workflows restored | Yes | **No** |
| (was R-003 mobile missing) | android/ios restored | Staged | **No** |
| (was R-006 bank-feed stale tables) | `bank-feed.service.ts` re-exports reconciliation | Modified locally | Confirm on push |
| Public profile USING (true) | Dropped | In migrations on origin | Closed in schema history |

---

## Risk summary

| Precedence | Open | Release impact |
|------------|------|----------------|
| P0 | 0 | — |
| P1 | 2 (R-003, R-005) | R-001/R-002 mitigated; R-004 partial |
| P2 | 6+ (R-006–R-012) | STOP full money/AI go-live without plan |
| P4 | 1–2 (R-014, R-016) | CI green; native packaging still incomplete |
| P5 | 3+ | Vercel anon manual, OPS_ALERT_WEBHOOK_URL, offsite backup |
| P6 | 4 | Required before commercial launch |

---

## Resolution order (updated 2026-09-09)

```text
1. DONE  R-013/R-002/R-001  CI + 2026090202 + tenant isolation run 34412130520
2. DONE  R-004 partial      2026090904 deal_cases/leads RLS + disbursement rollback
3. DONE  R-011              PayAngels init + webhook E2E (2026-09-10)
4. NEXT  R-003              Inspect live role CHECK
5. NEXT  R-005              Tighten operational_events
6.       R-006–R-009        AI edge + payment roles + disbursement URL docs
7.       R-017–R-019        Vercel / DNS / PayAngels / Resend
8.       R-022–R-025       Backups, monitoring, legal, pen test
```

**Stop condition:** P0 = 0. Pilot web deploy when CI green + P5 PayAngels secrets set + catalog seeded. Full commercial launch requires P1/P2 closure and P6 validation.

**Review-fixes plan (c895fe0):** CLOSED — RLS browse/enrollment, webhook hardening, checkout authority, disbursement idempotency claim.

---

*No secret values recorded.*

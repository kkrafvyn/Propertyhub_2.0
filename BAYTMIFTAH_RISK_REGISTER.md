# BaytMiftah — Risk Register

**Audit date:** 2026-09-01  
**HEAD:** `9574276` on `main` (`origin/main` equal)  
**Working tree:** dirty — CI/native/e2e staged or untracked; `2026090202` untracked  
**Methodology:** Static inspection + `node scripts/production-check.mjs` (working tree 33/33) + `gh run list` + `git ls-tree origin/main`  
**Supersedes:** Prior register that marked CI/mobile as RESOLVED and claimed 90/100

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
**Active primary blockers:** **P1 tenant proof**, **P1 listings/contacts RLS**, **P4 origin missing CI/native**

---

## P0 — Active incident

None identified. No evidence of an ongoing production breach in this inspection.

---

## P1 — Critical security / tenant / auth / public data

### R-001 — Cross-tenant isolation not proven live

```text
Issue: Live RLS tests skip unless six VITE_SUPABASE_TEST_* variables are set.
       origin/main has no CI workflow, so they never run on GitHub either.
Severity: CRITICAL
Evidence: src/lib/security/tenant-isolation.test.ts (testIfConfigured = it.skip);
          git ls-tree origin/main -- .github/workflows → empty;
          gh run list: main only shows Dependabot Updates, not app CI
Affected: All organization-scoped tables and Storage prefixes
Impact: Cannot claim tenant isolation for production
Fix: Staging two-tenant fixtures + GitHub secrets + CI file on origin;
     fail the pipeline if tests skip or fail
Verify: npm run test -- src/lib/security/tenant-isolation.test.ts with fixtures
        (this session: vitest missing from node_modules — UNVERIFIED locally)
Owner: Engineering + Security
Status: OPEN
Precedence: P1
```

### R-002 — Listings and contacts write not scoped to workspace permissions on origin

```text
Issue: UI denies analyst listings:write; RLS still allows any organization_members row
       to INSERT/UPDATE listings and manage organization_contacts until 2026090202 is
       applied. That migration is untracked — not on origin/main.
Severity: CRITICAL (authorization bypass via Supabase client)
Evidence: supabase/migrations/002_rls_policies.sql;
          2026072402_agency_workspace.sql;
          2026090202_workspace_permission_rls.sql (?? untracked);
          src/lib/workspace-permissions.ts analyst = listings:read only
Impact: Read-oriented roles can mutate listings/CRM via API
Fix: Review, commit, push, apply 2026090202 to staging then production;
     integration test as analyst
Verify: Direct PostgREST INSERT as analyst → denied
Owner: Backend + Security
Status: OPEN (file exists locally only)
Precedence: P1
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
Issue: 2026090202 covers listings:write and contacts:write only (10 permissions in UI).
Severity: HIGH
Evidence: workspace-permissions.ts ROLE_DEFAULTS; 2026090202_workspace_permission_rls.sql
Impact: Direct client writes to tasks/leads/etc. if those tables use member-wide policies
Fix: Table-by-table RLS vs ROLE_DEFAULTS (after R-002)
Verify: Role matrix integration tests
Owner: Database + Security
Status: OPEN (partial local mitigation only)
Precedence: P1 (subset) / P2 (remainder)
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
Issue: HMAC hex compared with ===. Secret may be PAYSTACK_* / STRIPE_*.
Evidence: supabase/functions/_shared/payangels.ts verifyPayangelsWebhookSignature / getPayangelsSecretKey
Impact: Timing leak (theoretical); mis-wired legacy keys in production
Fix: timing-safe compare; fail if PAYANGELS_WEBHOOK_SECRET unset in prod; do not fall back
Verify: Invalid signature 401; missing PayAngels secret 503
Owner: Payments
Status: OPEN
Precedence: P2
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
Issue: production-check.mjs (committed on origin) requires ci.yml, deploy.yml,
       scheduled-jobs.yml, capacitor.config.json, electron/main.cjs, AndroidManifest.
       git ls-tree origin/main for those paths is empty. Deleted in 9244c96
       (2026-09-01 17:25 UTC) “Expand mobile, desktop, and PayAngels…”.
Severity: CRITICAL for any deploy that uses origin
Evidence: git show origin/main:scripts/production-check.mjs;
          git ls-tree origin/main -- .github/workflows android ios e2e electron
Impact: No automated build/test/tenant gate on main; Vercel may still build the SPA
        but GitHub CI does not protect main
Fix: Commit reviewed restore (ci.yml already staged; deploy.yml, scheduled-jobs.yml,
     capacitor.config.json, electron/ untracked; android/ios/e2e staged);
     push; confirm Actions green on main
Verify: gh run list shows CI success on main; clean clone npm run production:check
Owner: DevOps
Status: OPEN on origin; MITIGATED on local disk only
Precedence: P4
```

### R-014 — Local remediation not pushed

```text
Issue: Working tree ≠ origin. production-check 33/33 is a local-disk result.
Evidence: git status -sb; AM ci.yml; A android/ios/e2e; ?? deploy.yml electron 2026090202
Impact: Audits and Vercel production can disagree
Fix: Review diff → commit → push (user must request commit)
Owner: Engineering
Status: OPEN
Precedence: P4
```

### R-015 — E2E coverage partial; local test runner broken this session

```text
Issue: Restored e2e is smoke + search only. node_modules lacks vitest here.
Evidence: e2e/*.spec.ts; Test-Path node_modules/vitest → MISSING
Impact: Cannot re-confirm unit suite on this machine; CI (once restored) is the runner
Fix: Clean npm ci on CI; optionally repair local node_modules
Owner: Engineering
Status: OPEN
Precedence: P4
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
| P1 | 5 (R-001–R-005) | **STOP production** |
| P2 | 7 (R-006–R-012) | STOP full money/AI go-live; plan for staging |
| P4 | 4 (R-013–R-016) | **STOP ship-from-origin** until R-013/R-014 |
| P5 | 5 | Required before go-live |
| P6 | 4 | Required before commercial launch |

---

## Resolution order (product sequence step 4)

```text
1. R-013 / R-014  Commit + push restore so origin passes production-check and CI exists
2. R-002 / R-020  Land and apply 2026090202; verify analyst write denied
3. R-021 / R-001  Tenant fixtures + CI secrets; live tests must pass (not skip)
4. R-003          Inspect live role CHECK
5. R-005          Tighten operational_events
6. R-006–R-009    AI edge enforcement + payment role/HMAC/disbursement URL
7. Re-test each closed item with logs (sequence step 5)
8. R-017–R-019    Vercel / DNS / PayAngels / Resend (sequence steps 6–7)
9. R-022–R-025    Backups, monitoring, legal, independent tests (steps 8+)
```

**Stop condition:** P0 = 0 (already). Production deploy only when **P1 = 0** (or written compensating control) **and** origin CI is green **and** P5 secrets for the target environment are set.

**Do not** add product modules while this register is in P1/P4.

---

*No secret values recorded.*

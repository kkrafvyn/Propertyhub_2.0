# BaytMiftah — Production Readiness Report

**Audit date:** 2026-09-01  
**HEAD / origin/main:** `9574276`  
**Working tree:** dirty (CI/native/e2e restore not pushed)  
**Verdict:** **RED — NOT READY TO SHIP FROM origin/main**  
**Local disk:** **YELLOW — infrastructure files restored, P1 proof and config still open**  
**Architecture freeze:** apex marketing + `app.baytmiftah.com` one SPA + Supabase + PayAngels / Resend / AI  
**Product freeze:** no new modules; priority security > integrity > payments > deploy > reliability > UX

This report **does not** repeat the 90/100 “ready with configuration” claim. That mixed a later local restore with an earlier RED origin tree.

---

## Executive answer (20 questions)

| # | Question | Answer |
|---|----------|--------|
| 1 | Does the application build? | **UNVERIFIED this session** (vitest/`node_modules` incomplete). `index.html` + `.npmrc` are on origin (`7afcc70`, `b42a128`, `9574276`). Vercel can build the SPA from origin. `production-check` on origin **would fail** because required CI/native files are missing from git. |
| 2 | Do tests pass? | **UNVERIFIED locally** (vitest missing). Tenant isolation tests **skip** without fixtures. E2E exists only on disk. GitHub has **no app CI on main**. |
| 3 | Are there critical bugs? | **YES as ship blockers:** origin missing CI/native; listings/contacts RLS bypass until 0202; tenant isolation unproven. Not an active P0 incident. |
| 4 | Is tenant isolation proven? | **NO.** Tests skip; no CI on origin; live DB not queried. |
| 5 | Is authorization secure? | **PARTIAL.** Admin MFA yes. Listings/contacts **no** on origin. `authorization.ts` unused in app. Role CHECK UNVERIFIED. |
| 6 | Is Pay Angels production-ready? | **Code YES, operations NO.** Secrets, webhook, disbursement URL, staging E2E outstanding (P5/P2). |
| 7 | Are bank feeds production-ready? | **PARTIAL.** Function exists; env names mismatch `.env.example` (MONZO vs MONO/PLAID). |
| 8 | Is Resend production-ready? | **Code YES, operations NO.** API key + domain (P5). |
| 9 | Are AI agents safely permissioned? | **PARTIAL.** Org kill switch on some actions only; allowlist not in edge function. |
| 10 | Is Property Explorer implemented safely? | **PARTIAL.** Routed Event Ledger + `verify_public_transaction` RPC. `PublicPropertyExplorer` unrouted. Privacy pen-test (P6) not done. |
| 11 | Are backups verified? | **NO.** Scripts exist; `backups/` absent; drill not run. |
| 12 | Is monitoring ready? | **PARTIAL.** Tables + `health-check.mjs`; alerting not evidenced. |
| 13 | Are mobile builds release-ready? | **NO on origin** (android/ios deleted). **PARTIAL on disk** (consumer projects staged; business variants not committed; store signing absent). |
| 14 | Is desktop release-ready? | **NO.** `electron/main.cjs` untracked; no preload/builder/signing. |
| 15 | Outdated Paystack/legacy references? | **PARTIAL.** PayAngels is primary; code still **falls back** to PAYSTACK_/STRIPE_ env names. `verify-stripe-payment` orphan remains. |
| 16 | External configuration still required? | **YES** — expected, still blocking go-live (P5). |
| 17 | Legal review required? | **YES** (P6), including e-sign simulation caveat. |
| 18 | What prevents production launch today? | (1) origin/main fails production-check / has no CI (P4). (2) Tenant isolation unproven (P1). (3) Listings/contacts RLS (P1). (4) PayAngels/Resend/DNS/Supabase apply (P5). (5) Backup + legal (P6). |
| 19 | What should NOT be changed? | Architecture freeze; PayAngels reconciliation presence; admin MFA; route families; migration history; no new feature modules. |
| 20 | Top 10 next actions? | See below. |

---

## Ready (verified in repository code)

- Single SPA with consumer / business / platform-admin route families and surface detection
- Extensive Supabase migrations (94 SQL files on disk; `2026090101` and `2026090201` on origin)
- RLS enabled widely (231 enable statements in migrations)
- Platform admin gate + MFA AAL2
- PayAngels initialize / verify / webhook (HMAC present) / refund / disbursement (URL fail-closed)
- MoMo initiate + webhook HMAC helper
- Resend-capable notification/invite edge functions
- AI assistant + org control **tables**
- Vercel SPA + security headers (including PayAngels CSP)
- Worker scripts (Night Watch, retention, communications, automations)
- Public Event Ledger routes + pseudonymous transaction RPC
- SMS/OTP client fail-closed outside test/demo
- `.env.example` documents demo disabled, PayAngels, MoMo, Resend, tenant fixture **names**

---

## Ready on local disk only (not on origin/main)

| Item | Disk | origin/main |
|------|------|-------------|
| `.github/workflows/ci.yml` | Staged | Missing |
| `deploy.yml`, `scheduled-jobs.yml` | Untracked | Missing |
| `android/`, `ios/`, `e2e/` | Staged | Missing (deleted `9244c96`) |
| `capacitor.config.json` | Untracked | Missing (`capacitor.config.ts` staged) |
| `electron/main.cjs` | Untracked | Missing |
| `2026090202_workspace_permission_rls.sql` | Untracked | Missing |
| `production-check` 33/33 | Pass | Would fail |

---

## Ready with external configuration (P5)

| System | Code | Required outside git |
|--------|------|----------------------|
| PayAngels | IMPLEMENTED | Keys, webhook, disbursement URL, merchant/cert |
| Resend | IMPLEMENTED | API key, domain |
| Supabase | IMPLEMENTED | Confirm migrations applied; Edge secrets; function deploy |
| MoMo | IMPLEMENTED | `MTN_MOMO_*` including callback secret |
| Bank feeds | PARTIAL | Align env names; provider keys |
| AI/LLM | PARTIAL | Provider keys; then close R-006 |
| Vercel + DNS | IMPLEMENTED config file | `app.baytmiftah.com`, env vars |
| Tenant CI secrets | Wired in local `ci.yml` | Six GitHub secrets |
| Mobile/desktop stores | PARTIAL on disk | Signing, listings |

---

## Needs fixing before production (code / git)

1. Push a reviewed restore so **origin** includes CI, native, e2e, electron, capacitor JSON, `2026090202`
2. Apply `2026090202` to staging/production; prove analyst cannot write listings
3. Inspect live `organization_members.role` CHECK
4. Restrict `operational_events` null-org SELECT
5. Enforce AI kill switch/allowlist on all `ai-assistant` actions
6. Align PayAngels verify/refund roles; constant-time HMAC; stop Paystack secret fallback in prod
7. Document `PAYANGELS_DISBURSEMENT_URL`; align bank-feed env names
8. Decide: delete or deploy `verify-stripe-payment`; hide or replace e-sign simulation in prod
9. Repair CI `node_modules` story (this machine cannot run vitest)

---

## Needs security validation (P1/P6)

- Live two-tenant RLS suite **passing** (not skipped) in CI
- Explorer RPC privacy review
- AI prompt-injection / cross-tenant attempt
- Finance RLS after `2026090201` apply confirmation

---

## Needs legal / business review (P6)

- Terms, privacy, payment, booking, AI policies
- E-sign simulation wording vs UI “Record e-signature”
- Public ledger adequacy
- PayAngels merchant agreement

---

## Recommended next actions (risk order)

1. Review and **commit/push** restored release artifacts + `2026090202` (user must request the commit)
2. Confirm GitHub Actions **CI green on `main`**
3. Apply migrations on staging; analyst write-denial test
4. Add six tenant-isolation secrets; **fail CI if tests skip**
5. Staging PayAngels webhook + refund/disbursement E2E
6. Set Vercel production env + DNS for frozen hostnames
7. Run `backup:restore-drill` and keep the log
8. Legal review
9. Mobile/desktop signing **after** web production, not before P1
10. Pilot orgs only after P1 = 0 and P5 for that environment

---

## Final scores

| Dimension | origin/main | Working tree |
|-----------|-------------|--------------|
| Product implementation | 86 | 88 |
| Security | 58 | 64 |
| Data integrity | 70 | 72 |
| Integrations | 68 | 70 |
| DevOps | 28 | 74 |
| Testing | 48 | 56 |
| Production readiness | 40 | 58 |
| **Overall ship-today** | **48** | **62** |

Previous “90/100 overall” is **withdrawn** as an origin/main claim.

---

## Final status color

```text
RED — NOT READY (origin/main)

Ship-from-origin score: 48/100
Local working-tree completeness: 62/100 (still not go-live)

production-check: 33/33 on THIS disk only
production-check: FAIL on a clean clone of origin/main

Do not proceed to sequence steps 6–13 until:
  P4  origin includes CI/native and CI is green
  P1  live tenant tests pass and listings RLS is applied
  P5  PayAngels + Resend + DNS + Supabase secrets for the target env
  P6  backup drill + legal for commercial launch (pilots may proceed with documented waiver)

Do NOT add feature modules.
Do NOT treat local 33/33 as production proof.
```

---

## Evidence log (this inspection)

```text
Date: 2026-09-01
HEAD: 9574276 on main = origin/main
9244c96 at 2026-09-01 17:25:58 +0000 deleted CI, android, ios, e2e, capacitor.config.ts

node scripts/production-check.mjs
  checkedAt: 2026-09-01T20:18:15.368Z
  passed: 33  failed: 0   ← working tree

git ls-tree origin/main -- .github/workflows  → empty
git ls-tree origin/main -- android ios e2e electron  → empty
git ls-tree origin/main -- 2026090101, 2026090201  → present
2026090202  → untracked

gh run list: main = Dependabot Updates only; no current app CI on main

node scripts/supabase-db.mjs status
  FAIL: Cannot find package 'pg'

vitest: missing from node_modules — unit tests not re-run
backups/: absent
```

---

*The repository is feature-rich and architecturally aligned with the freeze. It is not production-ready until origin, RLS proof, and configuration catch up to that design.*

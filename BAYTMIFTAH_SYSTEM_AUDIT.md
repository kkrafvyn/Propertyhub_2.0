# BaytMiftah — Full System Audit

**Audit date:** 2026-09-01  
**Repository:** `kkrafvyn/Propertyhub_2.0`  
**HEAD:** `9574276` (`Fix index.html UTF-8 encoding after restore.`) on `main`  
**Remote:** `origin/main` is at the same commit; working tree is **not**  
**Auditor role:** Evidence-based static + scripted inspection. No production mutations. No feature work.  
**Scope:** Correctness, security, integration, deployability, testing — against the frozen architecture and frozen product scope.

---

## 0. How to read this audit

There are **two repository states**. Mixing them produced the earlier contradictory 90/100 “YELLOW” documents. This pass treats them separately.

| State | What it is | What ships if you deploy now |
|-------|------------|------------------------------|
| **origin/main @ `9574276`** | Last pushed commit | Vercel / GitHub Actions / a clean clone |
| **Working tree (this machine)** | Staged + untracked restoration on top of HEAD | Local disk only, until committed and pushed |

`scripts/production-check.mjs` on **both** origin and disk **requires** `.github/workflows/ci.yml`, `deploy.yml`, `scheduled-jobs.yml`, `capacitor.config.json`, `electron/main.cjs`, and `android/app/src/main/AndroidManifest.xml`.

Those files are **present on disk** and **absent from `origin/main`**. A clean clone of `main` therefore **fails its own production gate**.

---

## 1. Executive summary

BaytMiftah is a **large, substantially implemented** React + Vite + Supabase REOS. The frozen architecture (one SPA at `app.baytmiftah.com`, marketing at the apex, Supabase + Edge, PayAngels / Resend / AI) is **present in code as a single application**, not as extra products.

**It is not production-ready today.**

Highest-precedence open blockers (see risk register):

1. **P1** — Cross-tenant isolation is **not proven live**. Tests skip without six `VITE_SUPABASE_TEST_*` fixtures. GitHub has no CI workflow on `main` to run them anyway.
2. **P1** — Listings/contacts write RLS still allows **any org member** on origin and on any database that has not applied untracked `2026090202_workspace_permission_rls.sql`.
3. **P4** — Commit `9244c96` (2026-09-01 17:25 UTC) **deleted** CI, Android, iOS, E2E, and Capacitor config. Restoration exists locally (partly staged) and has **not** been pushed.
4. **P5** — PayAngels, Resend, MoMo, Vercel/DNS, and live migration apply are **external configuration**, not missing product modules.
5. **P6** — Backup restore drill has **no evidence** (`backups/` absent). Legal/counsel sign-off not evidenced.

No **P0** active incident was found in this inspection.

| Signal | origin/main | Working tree |
|--------|-------------|--------------|
| Application code breadth | GREEN | GREEN |
| Live tenant isolation proof | RED | RED (same skip) |
| Listings/contacts RLS vs UI permissions | RED (any member write) | YELLOW (migration file local, not applied/pushed) |
| PayAngels / Resend / AI code | YELLOW | YELLOW |
| CI / mobile native / Electron / E2E | RED (deleted) | GREEN files on disk, not on remote |
| `production-check.mjs` | Would **fail** | **33/33 pass** (2026-09-01T20:18:15Z) |
| Local `vitest` | UNVERIFIED | **Missing** from `node_modules` this session |

**Final engineering verdict:** **NOT READY FOR PRODUCTION.**  
**Color:** **RED on origin/main** / **YELLOW on local disk pending commit, apply, and live proof.**

---

## 2. Frozen architecture vs code

Settled architecture:

```text
baytmiftah.com                MARKETING (later / separate)
        └── app.baytmiftah.com
                ONE MAIN APPLICATION
                  ├── Consumer  Web / Mobile
                  ├── Business  Web / Desktop / Mobile
                  └── Platform Admin
                        └── Supabase (Database, Auth, Storage)
                              └── Edge Functions
                                    ├── Pay Angels
                                    ├── Resend
                                    └── AI
```

Supporting domains (`support`, `docs`, `status`, `blog`, `explorer`) are **out of scope** for this phase.

| Architecture claim | In code | Evidence | Gap |
|--------------------|---------|----------|-----|
| One main SPA | VERIFIED | `src/app/routes.tsx`, consumer/business/admin route files, `vercel.json` SPA rewrite | Hostname split is DNS/Vercel, not an in-app host guard |
| Consumer / Business / Admin families | VERIFIED | `src/lib/surface-detection.ts`; shells per family | Admin mobile is a compatibility shell, not a third native app |
| Supabase DB / Auth / Storage | VERIFIED | `supabase/migrations/` (94 SQL files); client in `src/lib/supabase.ts` | Live apply of latest migrations UNVERIFIED (`scripts/supabase-db.mjs` failed: missing `pg`) |
| Edge functions | VERIFIED | 17 functions under `supabase/functions/` | `verify-stripe-payment` not in deploy list |
| PayAngels | VERIFIED (code) | initialize/verify/refund/disbursement/webhook | Production secrets + `PAYANGELS_DISBURSEMENT_URL` not in `.env.example` |
| Resend | VERIFIED (code) | `dispatch-notification`, `send-organization-invite`; `RESEND_API_KEY` in `.env.example` | Domain verification UNVERIFIED |
| AI | PARTIAL | `ai-assistant`, `kyc-ai-screen`; `ai_org_controls` / `ai_tool_allowlist` tables | Kill switch + allowlist **not** enforced on all assistant actions; no edge-function allowlist check |

**Do not rebuild this architecture.** Remaining work is proof, RLS apply, commit/push of restored release artifacts, and configuration.

---

## 3. Frozen product scope

The application is **feature-complete for this phase**. Priority for remaining work:

**security > data integrity > payments > deployment > reliability > UX polish**

This audit did **not** recommend new modules. Gaps below are blockers, orphans, or configuration — not missing product surfaces.

---

## 4. Repository structure

| Area | origin/main | Working tree | Evidence |
|------|-------------|--------------|----------|
| `src/` | VERIFIED | VERIFIED | App, routes, services |
| `supabase/migrations/` | 93 tracked + `2026090101` + `2026090201` | **94** files including untracked `2026090202` | `production-check` counts 94 on disk |
| `supabase/functions/` | VERIFIED | VERIFIED | 17 function dirs |
| `scripts/workers/` | VERIFIED | VERIFIED | Night Watch, retention, communications, jobs |
| `public/` | VERIFIED | VERIFIED | Manifest, SW |
| `.github/workflows/` | **MISSING** | `ci.yml` staged; `deploy.yml` + `scheduled-jobs.yml` untracked | `git ls-tree origin/main -- .github/workflows` empty |
| `android/`, `ios/` | **MISSING** (deleted in `9244c96`) | Staged restore | `git show --stat 9244c96` |
| `e2e/` | **MISSING** | Staged (`smoke.spec.ts`, `search-journey.spec.ts`) | Same commit |
| `electron/` | **MISSING** (never on origin) | Untracked `electron/main.cjs` only | No `preload.cjs` on disk |
| `capacitor.config.json` | **MISSING** | Untracked | `capacitor.config.ts` staged |
| `docs/` | Partial | Extra untracked docs exist | Not a production blocker |
| `node_modules/` | N/A | Incomplete — **vitest missing** | Could not re-run unit tests this session |
| `backups/` | N/A | **Absent** | Restore drill has nothing to verify |

---

## 5. Application surfaces

| Surface | Web | Mobile | Desktop | Status |
|---------|-----|--------|---------|--------|
| Consumer | `ConsumerWebShell` + `consumer.routes.tsx` | Capacitor consumer project **on disk only** | Electron forces business (by design) | Web IMPLEMENTED; native **not on origin** |
| Business | `BusinessWebShell` + workspace routes | `capacitor.config.business.json` untracked; `android-business/` / `ios-business/` **not in repo** | `electron/main.cjs` untracked; no builder/signing | Web IMPLEMENTED |
| Platform Admin | `admin.routes.tsx` + `ProtectedAdminRoute` (MFA AAL2) | Compatibility `AdminMobileShell` | `AdminDesktopShell` | IMPLEMENTED in SPA |

**Explorer:** Public Event Ledger is routed at `/explorer/unit/:id`, `/explorer/property/:id`, `/explorer/transaction/:id` (`consumer.routes.tsx`). `PublicPropertyExplorer.tsx` exists and is **not routed** (tests only). Supporting domain `explorer.baytmiftah.com` is not required this phase; the in-app explorer is enough if privacy of `verify_public_transaction` holds (P6 pen-test).

---

## 6. Roles and authorization

Roles are **not** a single registry:

| Source | What it defines |
|--------|-----------------|
| `src/lib/workspace.ts` | Extended company + platform + external role unions |
| `src/lib/workspace-permissions.ts` | `ROLE_DEFAULTS` — 10 permissions |
| `src/lib/platform-roles.ts` / `src/app/lib/baytmiftah/roles.ts` | Marketplace / simplified app roles |
| `001_create_schema.sql` | `organization_members.role` CHECK `owner \| manager \| agent \| analyst` |
| Generated `database.types.ts` | `role: string \| null` (no enum) — **does not prove** live CHECK was dropped |

`src/lib/authorization.ts` is imported only by its unit test. UI uses `canWorkspace()`; **the database is the real gate**.

Listings/contacts:

- Origin / applied history: `002_rls_policies.sql` + `2026072402_agency_workspace.sql` — **any org member** INSERT/UPDATE listings and manage contacts.
- Working tree: `2026090202_workspace_permission_rls.sql` aligns write with `listings:write` / `contacts:write`. **Untracked. Not on origin. Apply to live DB UNVERIFIED.**

Other permissions (`finance:*`, `leads:*`, `team:manage`, `tasks:write`, `documents:write`) remain **UI + table-specific RLS**, not the 0202 helper.

Finance RLS alignment `2026090201` **is on origin**. It uses view `public.workspace_members` (defined in `20260821_bank_reconciliation.sql`). Live apply UNVERIFIED.

---

## 7. Security

### 7.1 Tenant isolation

| Check | Result |
|-------|--------|
| Static RLS enable | **231** `ENABLE ROW LEVEL SECURITY` statements across migrations |
| Integration tests | `src/lib/security/tenant-isolation.test.ts` — 8 live cases **skip** unless six env vars set |
| CI on `main` | **No workflow files on origin.** Last GitHub Actions on `main` are Dependabot “Update” jobs, not app CI. Last recorded `CI` workflow runs (Aug 2026) were on Dependabot PRs and **failed**. |
| This session | Could not execute vitest (`node_modules/vitest` missing) |

**Verdict:** Isolation is **designed in migrations** and **unproven in a live two-tenant environment**. That is a **P1** stop, not a documentation issue.

### 7.2 Auth / admin

- `ProtectedAdminRoute` requires platform admin (`users.is_platform_admin` / `adminService`) and MFA AAL2 (`src/app/components/ProtectedRoute.tsx`, `src/lib/security/mfa.ts`).
- Public user profile `USING (true)` was dropped in `2026073113_security_hardening.sql`.

### 7.3 Observability table

`operational_events` (`2026082607_operational_observability.sql`): SELECT allowed when `organization_id IS NULL` **or** caller is a member. Any authenticated user can read **global** (null-org) events. INSERT allowed for any authenticated user.

### 7.4 AI

- Workspace chat / `describe_listing` call `requireOrgMembership` + `assertOrgAiEnabled`.
- `summarize_document` and generic `chat` **do not** require org scope or kill switch.
- `ai_tool_allowlist` is enforced in `src/lib/ai-tool-allowlist.service.ts`, **not** in `supabase/functions/ai-assistant/index.ts`.

### 7.5 Secrets in repo

No production secret values recorded. `.env` was not opened for this audit. `.env.example` documents PayAngels, MoMo, Resend, and test fixture **names**.

---

## 8. Payments and money movement

| Path | Status | Evidence |
|------|--------|----------|
| Initialize / verify / webhook / refund / disbursement | IMPLEMENTED | Edge functions + `scripts/deploySupabasePayments.cjs` |
| Webhook HMAC | IMPLEMENTED, not constant-time | `verifyPayangelsWebhookSignature` uses `computed === signature` |
| Secret fallback | PayAngels key **or** Paystack/Stripe env names | `_shared/payangels.ts` |
| Refund authorization | owner/manager only | `initiate-payangels-refund/index.ts` — narrower than `FINANCE_MEMBER_ROLES` |
| Manual verify | payer **or any org member** | `verify-payangels-payment/index.ts` |
| Disbursement URL | Fail-closed if unset | `PAYANGELS_DISBURSEMENT_URL` — **not** in `.env.example` |
| MoMo | IMPLEMENTED | `initiate-momo-payment`, `momo-webhook` + HMAC helper |
| Orphan | `verify-stripe-payment` | PayAngels tables; **not** in `EDGE_FUNCTIONS` |
| E-sign | Simulation stub | `esignature.service.ts` `provider: 'simulation'` |

SMS/OTP client fallback is fail-closed unless `MODE === 'test'` or `VITE_ENABLE_DEMO_DATA === 'true'` (`sms-gateway.service.ts`). `.env.example` defaults demo to `false`.

---

## 9. Integrations and email

| System | Code | Production config |
|--------|------|-------------------|
| PayAngels | YES | P5 secrets + webhook URL + disbursement URL |
| Resend | YES | P5 API key + verified domain |
| Bank feed | YES (`sync-bank-feed`) | Env names `MONZO_FEED_*` vs `.env.example` `MONO_*` / `PLAID_*` |
| LLM | YES (`_shared/llm-provider.ts`) | Provider keys |
| Arkesel SMS | YES (`send-sms`) | Gateway secrets |

---

## 10. Data integrity and backups

- Journal posting / reversal / reconciliation completion gated to owner/manager in `2026082201` (finance roles expanded in `2026090201` for several finance tables).
- Public transaction RPC `verify_public_transaction` returns pseudonymous unit id (`2026090101`).
- Backup scripts exist: `scripts/backup/*.mjs`, `npm run backup:restore-drill`.
- **No `backups/` directory** on disk. Restore drill **not evidenced**. `supabase-db.mjs status` could not run (missing `pg`).

---

## 11. Testing

| Layer | origin/main | Working tree | This session |
|-------|-------------|--------------|--------------|
| Unit tests (`*.test.ts` under `src`) | Present (~61 files) | Same | **Not executed** — vitest missing |
| Tenant isolation live | Skip without secrets | Same | Skip expected |
| E2E Playwright | Deleted | Restored, 2 specs | Not executed |
| `production-check` | Would fail (missing files) | **33/33** | Ran 2026-09-01T20:18:15Z |
| Typecheck / build | Scripts declared | Same | Not re-run (incomplete `node_modules`) |

Do not treat prior-session “242 passed” as current evidence.

---

## 12. DevOps and release

| Item | Evidence |
|------|----------|
| CI on origin `main` | **None.** Workflows deleted in `9244c96`. |
| Local CI file | `.github/workflows/ci.yml` staged: build, typecheck, test, production-check, tenant fixture status, tenant tests (secrets), Playwright e2e |
| Deploy workflow | Untracked; `workflow_dispatch` only; skips DB by default |
| Scheduled jobs | Untracked; cron `0 2 * * *` → `jobs:run-all` |
| Vercel | `vercel.json` SPA + security headers + PayAngels CSP — **on origin** |
| Mobile store signing | Not evidenced |
| Electron packaging | `main.cjs` only; no preload; `nodeIntegration: false` |

---

## 13. What must not be changed in this phase

- PayAngels reconciliation / webhook HMAC **presence** (harden comparison; do not rip out)
- Platform admin MFA AAL2 gate
- Surface routing families and frozen hostname architecture (configure DNS; do not add a third product app)
- Migration history (additive migrations only)
- Night Watch / scheduled worker scripts
- Feature-complete module set (no new product modules)

---

## 14. Scores (this inspection only)

Scores are **not** the previous 90/100 remediation narrative. They reflect **ship-from-origin** unless noted.

| Dimension | origin/main /100 | Working tree /100 |
|-----------|------------------|-------------------|
| Product implementation | 86 | 88 |
| Security | 58 | 64 |
| Data integrity | 70 | 72 |
| Integrations | 68 | 70 |
| DevOps | 28 | 74 |
| Testing | 48 | 56 |
| Production readiness | 40 | 58 |
| **Overall (what can ship today)** | **48** | **62** (still not go-live) |

Go-live requires origin to match a reviewed working tree **and** P1/P5/P6 gates — not a local 33/33 check alone.

---

## 15. Immediate sequence (do not skip)

Matches the agreed production sequence, starting at step 4:

1. **Commit and push** restored CI / native / e2e / electron / `2026090202` after review (closes remote P4). Do not add features.
2. **Apply** `2026090201` (if not applied) and `2026090202` to staging; smoke-test analyst cannot write listings.
3. **Configure** six GitHub tenant-isolation secrets; require green CI including live RLS tests.
4. Re-test those blockers with logs.
5. Then Vercel + DNS + Supabase secrets → PayAngels + Resend → backup drill + monitoring → mobile/desktop signing → production → pilots.

---

*No secret values recorded. This file supersedes the prior mixed RED/90-point SYSTEM_AUDIT on disk.*

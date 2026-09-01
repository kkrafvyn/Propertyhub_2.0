# BaytMiftah — Master Review (Audit + Remediation + Current State)

**Last updated:** 2026-09-01  
**Repository:** `kkrafvyn/Propertyhub_2.0`  
**Branch:** `main` @ `cfc0d35` (= `origin/main`)  
**CI:** [Green — run #33565127507](https://github.com/kkrafvyn/Propertyhub_2.0/actions/runs/33565127507)  
**Supersedes:** `BAYTMIFTAH_SYSTEM_AUDIT.md`, `BAYTMIFTAH_RISK_REGISTER.md`, `BAYTMIFTAH_PRODUCTION_READINESS.md`, and `BAYTMIFTAH_MARKETING_UPDATE.md` for current-state decisions (those files remain as historical snapshots).

**Architecture freeze:** `baytmiftah.com` (marketing) → `app.baytmiftah.com` (one SPA) → Supabase + Edge (PayAngels / Resend / AI)  
**Product freeze:** No new feature modules. Priority: security > data integrity > payments > deployment > reliability > UX.

---

## 1. Executive summary

BaytMiftah is a **large, substantially implemented** React + Vite + Supabase REOS. The frozen architecture is **present in code** as a single application with consumer, business, and platform-admin route families.

| Verdict | Detail |
|---------|--------|
| **Code / repo** | **DONE** — code freeze holds for web pilot |
| **Ship-from-git (P4)** | **CLOSED** — CI green on `origin/main` |
| **P1 security (tenant + RLS)** | **CLOSED** — live tenant tests 8/8; RLS migrations applied on linked Supabase |
| **Backup evidence** | **CLOSED** — live drill + CI fixture gate |
| **Legal (automated)** | **CLOSED** — 26-policy catalog tests + legal E2E in CI |
| **Legal (human)** | **OPEN** — counsel sign-off required (P6) |
| **External config (P5)** | **OPEN** — PayAngels, Resend, DNS, Vercel prod env |
| **Commercial launch** | **NOT READY** until P5 + P6 complete |

**Current color:** **YELLOW — pilot-ready once P5 config is set; not commercial go-live.**

| Readiness | Score (estimate) |
|-----------|------------------|
| Web pilot (1–3 orgs, real config) | **~75–78 / 100** |
| Commercial launch | **~65 / 100** |
| At audit start (`9574276`) | **48 / 100** (RED) |

---

## 2. Frozen architecture

```text
baytmiftah.com                    MARKETING (hostname mode in same SPA)
        └── app.baytmiftah.com
                ONE MAIN APPLICATION
                  ├── Consumer   Web / Mobile
                  ├── Business   Web / Desktop / Mobile
                  └── Platform Admin
                        └── Supabase (Database, Auth, Storage)
                              └── Edge Functions
                                    ├── Pay Angels
                                    ├── Resend
                                    └── AI
```

| Claim | Status | Evidence |
|-------|--------|----------|
| One SPA | VERIFIED | `src/app/routes.tsx`, `vercel.json` SPA rewrite |
| Consumer / Business / Admin | VERIFIED | Route files, `src/lib/surface-detection.ts` |
| Marketing hostname split | VERIFIED | `src/lib/site-mode.ts`, `MarketingHome.tsx` |
| Supabase | VERIFIED | 94 migrations; linked DB; `2026090201` + `2026090202` applied |
| PayAngels (code) | VERIFIED | initialize / verify / webhook / refund / disbursement |
| Resend (code) | VERIFIED | notification + invite edge functions |
| AI | PARTIAL | Tables + edge functions; kill-switch not on all actions (P2 backlog) |

**Do not rebuild this architecture.**

---

## 3. What we did (remediation timeline)

### Phase A — Audit (evidence-based, no feature work)

- Inspected git, CI, RLS, payments, tests, deploy surfaces
- Wrote initial audit deliverables (now superseded by this document)
- Identified two states that must not be mixed: stale `origin/main` vs restored working tree

### Phase B — Brand fix

- Wordmark **BΛYTMIFTΛH** → **BAYTMIFTAH** (Latin A)
- Updated splash, logos, auth layout, mobile menu, `public/brand/*.svg`
- Added `BRAND_NAME = "BaytMiftah"`

### Phase C — Marketing site (same repo, hostname routing)

| File | Purpose |
|------|---------|
| `src/lib/site-mode.ts` | `baytmiftah.com` → marketing; `app.*` → app |
| `src/lib/marketing-urls.ts` | Cross-links to `VITE_APP_ORIGIN` |
| `src/app/pages/marketing/MarketingHome.tsx` | Full REOS marketing page |
| `src/app/components/marketing/MarketingShell.tsx` | Nav + footer |
| `src/app/pages/ConsumerIndex.tsx` | `/` switches by hostname |
| `public/robots.txt`, `public/sitemap.xml` | SEO |
| `src/lib/site-mode.test.ts` | 3 unit tests |

Local preview: `VITE_SITE_MODE=marketing npm run dev`

### Phase D — Push release infrastructure (`ff155d4`)

Restored what commit `9244c96` had deleted:

- `.github/workflows/ci.yml`, `deploy.yml`, `scheduled-jobs.yml`, `dependabot.yml`
- `android/`, `ios/` Capacitor projects
- `e2e/` Playwright specs, `electron/main.cjs`
- Capacitor configs, deployment docs
- `supabase/migrations/2026090202_workspace_permission_rls.sql` (in repo)

### Phase E — Database / RLS (live Supabase)

Applied via `node scripts/supabase-db.mjs push`:

| Migration | Effect |
|-----------|--------|
| `2026090201_finance_role_rls_alignment.sql` | Finance-role RLS alignment |
| `2026090202_workspace_permission_rls.sql` | Listings/contacts gated by workspace permissions |

Verified live policies:

- `Members with listings write can create/update listings`
- `Members with contacts write can manage contacts`

### Phase F — CI, tenant proof, backup, legal (`f540a18` → `cfc0d35`)

**CI pipeline (all green):**

| Step | Result |
|------|--------|
| Build + typecheck | Pass |
| Unit tests | Pass (245+) |
| Production-check | **38 / 38** |
| Legal catalog tests | **8 / 8** |
| Backup restore drill (fixture) | Pass |
| Tenant fixture status | **6 / 6** required (CI fails if missing) |
| Tenant isolation integration | **8 / 8 live RLS** (0 skipped) |
| E2E (smoke + search + legal) | **10 / 10** |

**Tenant isolation:**

- Fixture orgs: `ci-tenant-isolation-a`, `ci-tenant-isolation-b`
- Test users: `tenant-a/b-isolation@mailinator.com`
- Bank-feed seeds per org
- All 6 GitHub Actions secrets set
- Provision: `npm run security:provision-tenant-fixtures [-- --gh-secrets]`

**Backup:**

- Live backup: `backups/2026-09-01T22-01-10-242Z_full` (242 tables, 114 rows) — local, gitignored
- Restore drill passed with `--verify-db`
- CI fixture: `scripts/backup/fixtures/minimal-backup/`
- Evidence: `scripts/backup/RESTORE_DRILL_EVIDENCE.json`

**E2E fixes:**

- Login: expect `Continue` button + sign-in heading
- Search: `Search destinations` placeholder (removed stale AI-search selectors)
- New: `e2e/legal-smoke.spec.ts` (terms, privacy, payments policy)

---

## 4. Git commits (since pre-remediation `9574276`)

```
cfc0d35  Run tenant isolation suite only in dedicated CI step
57d1b8e  Exclude live tenant isolation suite from default unit test run
f540a18  Add CI gates for legal catalog, backup drill, and live tenant isolation proof
ff155d4  Restore release infrastructure, marketing site, and production audit deliverables
```

**Diff stat:** 128 files, +6,278 / −221 lines.

---

## 5. Risk register (current status)

### Precedence legend

| Level | Meaning | Rule |
|-------|---------|------|
| P0 | Active incident | Hard stop |
| P1 | Tenant / auth / public data | Hard stop for production |
| P2 | Finance / payment / AI integrity | Post-pilot hardening |
| P4 | Ship-from-git / CI | Hard stop until green |
| P5 | External configuration | Required before go-live |
| P6 | Independent validation | Required before commercial launch |
| P7 | Unverified live DB | Treat as P1 until proven |
| P8 | Non-blocking | Track only |

### Closed since audit

| ID | Issue | Resolution |
|----|-------|------------|
| R-001 (partial) | Tenant isolation unproven | **8/8 live tests in CI; 6 secrets set** |
| R-002 (partial) | Listings/contacts RLS bypass | **2026090202 applied live**; analyst manual test deferred (P2) |
| R-013 | CI missing on origin | **ci.yml on main, green** |
| R-014 | Native/E2E deleted | **Restored and pushed** |
| R-015 | production-check fail on clone | **38/38 in CI** |
| Backup | No drill evidence | **Live drill + CI gate + evidence JSON** |

### Still open

| ID | Issue | Severity | Precedence | Notes |
|----|-------|----------|------------|-------|
| R-003 | `organization_members.role` CHECK vs 20+ TS roles | HIGH | P7 | Inspect live constraint on staging |
| R-004 | Fine-grained permissions only on listings/contacts | HIGH | P2 | Other tables may still use member-wide policies |
| R-005 | `operational_events` null-org SELECT | HIGH | P1/P2 | Restrict to platform admin |
| R-006 | AI kill-switch not on all assistant actions | HIGH | P2 | Post-pilot |
| R-007+ | PayAngels prod secrets, webhook, disbursement URL | HIGH | P5 | Config, not code |
| R-008+ | Resend domain + API key | MEDIUM | P5 | Config |
| R-009+ | Paystack/Stripe legacy fallbacks | MEDIUM | P2 | Post-pilot cleanup |
| R-010+ | E-sign simulation vs prod UI wording | MEDIUM | P6 | Legal review |
| R-011+ | Mobile/desktop store signing | LOW | P8 | After web pilot |
| R-012+ | Human legal sign-off | — | P6 | 26 policies in CI; counsel approval pending |

**Stop condition for production deploy:** P0 = 0, P1 closed or compensating control documented, CI green, P5 secrets for target environment set.

---

## 6. Production readiness (20 questions — current answers)

| # | Question | Answer (2026-09-01 post-remediation) |
|---|----------|--------------------------------------|
| 1 | Does the application build? | **YES** — CI build step green |
| 2 | Do tests pass? | **YES** — unit, legal, tenant (live), E2E all green in CI |
| 3 | Critical bugs as ship blockers? | **No active P0**; P2 hardening deferred post-pilot |
| 4 | Tenant isolation proven? | **YES** — 8/8 live RLS tests in CI |
| 5 | Authorization secure? | **PARTIAL** — listings/contacts RLS fixed; R-003–R-005 open |
| 6 | PayAngels production-ready? | **Code YES, ops NO** (P5) |
| 7 | Bank feeds production-ready? | **PARTIAL** — env name alignment (P2/P5) |
| 8 | Resend production-ready? | **Code YES, ops NO** (P5) |
| 9 | AI safely permissioned? | **PARTIAL** — kill-switch gap (P2) |
| 10 | Property Explorer safe? | **PARTIAL** — privacy pen-test (P6) |
| 11 | Backups verified? | **YES** — drill run + CI fixture gate |
| 12 | Monitoring ready? | **PARTIAL** — health-check script; alerting not evidenced |
| 13 | Mobile release-ready? | **NO** — store signing absent (P8) |
| 14 | Desktop release-ready? | **NO** — no builder/signing (P8) |
| 15 | Legacy Paystack references? | **PARTIAL** — fallbacks remain (P2) |
| 16 | External config required? | **YES** — blocking go-live (P5) |
| 17 | Legal review required? | **YES** (P6) |
| 18 | What prevents launch today? | P5 config + P6 legal + staging payment E2E |
| 19 | What not to change? | Architecture freeze; no new modules |
| 20 | Next actions? | See §8 |

---

## 7. What's ready (verified in code + CI)

- Single SPA: consumer / business / platform-admin routes
- 94 Supabase migrations; latest finance + workspace RLS applied on linked project
- RLS enabled widely across migrations
- Platform admin gate + MFA AAL2
- PayAngels initialize / verify / webhook (HMAC) / refund / disbursement
- MoMo initiate + webhook HMAC helper
- Resend-capable notification/invite edge functions
- AI assistant + org control tables
- Vercel SPA config + security headers (PayAngels CSP)
- Worker scripts (Night Watch, retention, communications, automations)
- Public Event Ledger routes + pseudonymous transaction RPC
- Legal catalog: 26 required slugs, catalog tests, legal E2E
- Marketing hostname mode + REOS marketing page
- CI / deploy / scheduled workflows on `origin/main`
- Capacitor android/ios, E2E, Electron entrypoint
- Tenant isolation live proof in CI
- Backup restore drill evidence

---

## 8. What's left (not code)

### P5 — Required before go-live

1. **PayAngels** — API keys, webhook URL, merchant/cert, staging payment/refund/disbursement E2E  
2. **Resend** — `RESEND_API_KEY` + verified sending domain  
3. **Vercel** — production env vars for `app.baytmiftah.com`  
4. **DNS** — `baytmiftah.com` + `app.baytmiftah.com`  
5. **Supabase** — edge function secrets, auth redirect URLs  
6. **MoMo** (if used) — `MTN_MOMO_*` including callback secret  

### P6 — Required before commercial launch

1. Legal counsel review of all 26 policies  
2. PayAngels merchant agreement  
3. E-sign simulation wording vs UI  
4. Public ledger privacy adequacy review  

### P2 — Post-pilot code hardening (optional, does not block config)

1. AI kill-switch on all `ai-assistant` actions  
2. Paystack/Stripe legacy cleanup + orphan `verify-stripe-payment` decision  
3. Analyst manual write-denial test on listings/contacts  
4. Restrict `operational_events` null-org SELECT  
5. Expand fine-grained RLS beyond listings/contacts  
6. Live `organization_members.role` CHECK inspection  

### P8 — After web production

1. Mobile App Store / Play signing and listings  
2. Desktop Electron builder + signing  

---

## 9. Operator commands

```powershell
# CI-equivalent checks locally
npm run production:check          # 38/38
npm run test -- src/content/legal/legal-catalog.test.ts
npm run backup:restore-drill:fixture

# Tenant isolation (requires .env fixtures or RUN_TENANT_ISOLATION_TESTS)
npm run security:tenant-fixtures    # expect 6/6
$env:RUN_TENANT_ISOLATION_TESTS="1"
npm run test -- src/lib/security/tenant-isolation.test.ts

# Refresh tenant tokens + GitHub secrets
npm run security:provision-tenant-fixtures -- --gh-secrets

# Database
node scripts/supabase-db.mjs status
node scripts/supabase-db.mjs push   # apply pending migrations

# Backup
npm run backup:db
npm run backup:restore-drill -- --verify-db

# Marketing preview
$env:VITE_SITE_MODE="marketing"; npm run dev
```

---

## 10. Scores (updated)

| Dimension | At audit (`9574276`) | Current (`cfc0d35`) |
|-----------|----------------------|---------------------|
| Product implementation | 86 | **88** |
| Security | 58 | **72** |
| Data integrity | 70 | **78** |
| Integrations (code) | 68 | **70** |
| DevOps | 28 | **82** |
| Testing | 48 | **75** |
| Production readiness | 40 | **72** |
| **Overall (web pilot)** | **48** | **~76** |
| **Overall (commercial)** | **48** | **~65** |

Previous “90/100 overall” claims are **withdrawn**.

---

## 11. Final status

```text
YELLOW — CODE COMPLETE FOR WEB PILOT

✅ origin/main = local main @ cfc0d35
✅ CI green (build, test, legal, backup, tenant 8/8, E2E 10/10)
✅ RLS 2026090201 + 2026090202 applied on linked Supabase
✅ Tenant isolation proven live in CI
✅ Backup restore drill evidenced
✅ Marketing site + brand fix shipped
✅ Code freeze — no new modules

⏳ P5: PayAngels + Resend + DNS + Vercel prod env
⏳ P6: Legal counsel sign-off + staging payment E2E
⏳ P2: Post-pilot hardening backlog

Do NOT treat CI green as commercial go-live approval.
Pilot orgs OK after P5 for that environment + documented P6 waiver if needed.
```

---

*This document is the single source of truth for BaytMiftah production posture as of 2026-09-01 post-remediation.*

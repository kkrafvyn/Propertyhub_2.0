# BaytMiftah / PropertyHub — Project History

> **Last updated:** 2026-09-07  
> **Repository:** Propertyhub_2.0 (BaytMiftah property operations platform)  
> **Current branch:** `main` (through commit `ce5c2ac` + pending batch below)

This document records platform evolution from the initial commit through production hardening, including work from recent CI/payments/integration sessions.

---

## Table of contents

1. [Executive summary](#executive-summary)
2. [Platform architecture today](#platform-architecture-today)
3. [Chronological development (git history)](#chronological-development-git-history)
4. [Recent production hardening session](#recent-production-hardening-session)
5. [Payments — PayAngels-only rail](#payments--payangels-only-rail)
6. [Integrations status](#integrations-status)
7. [CI/CD and operations](#cicd-and-operations)
8. [Stub and simulation audit](#stub-and-simulation-audit)
9. [Browser and runtime fixes](#browser-and-runtime-fixes)
10. [Environment variables](#environment-variables)
11. [Manual dashboard steps remaining](#manual-dashboard-steps-remaining)
12. [Verification commands](#verification-commands)

---

## Executive summary

BaytMiftah started as a Ghana-first property marketplace and grew into a **multi-role real estate operating system** covering:

- **Consumer** — browse, compare, book, pay, KYC, trust badges
- **Professional workspaces** — agent, agency, host, developer, finance, enterprise, admin
- **Operations** — leases, e-sign, bank reconciliation, owner disbursements, contractor dispatch, estate communications, AI orchestration, MLS sync, blockchain property tokens
- **Surfaces** — web (Vite/React), marketing site, PWA, Capacitor mobile (consumer + business), Electron desktop workspace
- **Backend** — Supabase (Postgres + RLS, Auth, Storage, Realtime, 124+ migrations, edge functions)

**Latest strategic decision:** all money movement (MoMo, bank, card) routes through **PayAngels** only. Direct Stripe, MTN MoMo, and Paystack checkout paths were removed from production.

**Production posture:** simulation/demo fallbacks are disabled outside `MODE=test`. Missing integration credentials fail closed rather than returning fake success.

---

## Platform architecture today

| Layer | Stack |
|-------|-------|
| Frontend | React 19, React Router, Tailwind, Radix UI, Framer Motion, Leaflet maps |
| i18n | 12+ locales, generated locale chrome |
| Auth | Supabase Auth, OAuth, biometric (Capacitor), role/workspace routing |
| Payments | PayAngels inline checkout + webhooks + disbursements |
| Edge | Deno Supabase functions (`initialize-payangels-payment`, `verify-payangels-payment`, `initiate-payangels-disbursement`, `exchange-rates`, `sync-bank-feed`, etc.) |
| Deploy | Vercel (web/marketing), GitHub Actions (CI, deploy, scheduled jobs), Supabase CLI |
| Desktop | Electron + electron-builder (Windows) |
| Mobile | Capacitor (Android/iOS) consumer + business apps |

---

## Chronological development (git history)

### Phase 1 — Foundation (initial → consumer MVP)

| Commit | Summary |
|--------|---------|
| `27f9e97` | Initial commit |
| `0e8dad5` | Mobile PWA shell, Supabase recovery migrations |
| `050d236` | Ghana-first trust and mobile marketplace features |
| `036c200` | Ghana API regions and route estimates |
| `0b43cb9` | Consumer workflows, financial ops, notifications, production tooling |
| `bfb6cc7` | BaytMiftah consumer UI port, navigation branding |
| `6c04a2e` | Desktop/mobile white theme polish, test suite fixes |
| `abe2a0e` | Desktop home/footer translations |
| `7734de0` | 12 additional languages in locale switcher |
| `d50b147` | Mobile nav, compare page, capabilities alignment |
| `b8f29f4` | Mobile-only splash, Supabase client refresh |
| `c1d80cc` | Card hover variant type safety |
| `e93ebbf` | Supabase test env defaults for CI |

### Phase 2 — Integrations and auth

| Commit | Summary |
|--------|---------|
| `4e4eb87` | Integrations, compliance, i18n, payment wiring |
| `8543588` | Auth redesign — shared layout, OAuth, dark theme |
| `ab92fa3` | Payments routed by property location (not user region) |
| `c117e79` | Full locale translations, IoT access controls |
| `33ca68f` | BaytMiftah arc-dot branding, production integrations |
| `cee3dde` | Single `.env` file, rebrand, onboarding i18n |
| `138696a` | Role-optimized navigation and permissions |
| `63a5c60` | Per-role UI tailored to permissions/journey |
| `febb490` | AI assistant, data backups, docs, CI type fixes |
| `55deaee` | E2E fix — skip onboarding on browse routes |
| `29298d2` | OpenAI + Qwen provider switching for AI |
| `024c5f6` | Skip web splash, Vercel env sync script |
| `2e228c0` | Web splash false trigger fix, page scrolling |

### Phase 3 — Legal, checkout, KYC, revenue

| Commit | Summary |
|--------|---------|
| `81b02ee` | Legal framework, in-app checkout, AI-assisted KYC, marketplace UIs |
| `1f64372` | Manual-only KYC note in verification panel |
| `6ac9f3b` | Admin Revenue Management — database-driven fees |
| `e205add` | Remove accidental empty resend config file |
| `409bb38` | Luxury HTML email template wired to notifications |
| `bab2071` | Platform security hardening — auth, payments, storage, edge |
| `749ff04` | npm audit closure, checkout promos + platform fees |
| `f981123` | Trust/payment copy hardening against misrepresentation |
| `9244c96` | Mobile/desktop/PayAngels payment surfaces, TS build stability |
| `b42a128` | Vercel npm legacy peer deps |
| `7afcc70` / `9574276` | Restore/fix `index.html` for Vite builds |

### Phase 4 — Release infrastructure and marketing

| Commit | Summary |
|--------|---------|
| `ff155d4` | Release infrastructure, marketing site, audit deliverables |
| `f540a18` | CI gates — legal catalog, backup drill, tenant isolation |
| `57d1b8e` / `cfc0d35` | Tenant isolation suite isolated to dedicated CI step |
| `6fdc56d` | `BAYTMIFTAH_MASTER_REVIEW.md` audit source of truth |
| `3d1bf65` | Vercel `outputDirectory: dist` |
| `ddc3e46` → `bdcd41e` | Marketing homepage — carousel, motion, Real Estate OS positioning |
| `4185d64` / `45ab4a3` / `195ceef` | Revert/restore interactive marketing showcases |
| `0be1fad` | Marketing Vercel builds + `dev:marketing` script |
| `d32a700` | Fix conversation RLS recursion on consumer dashboard |
| `d70935c` | Admin-configurable transaction fees, expanded marketing |
| `1cfcdea` | Buildium parity gaps, simulation fallbacks, lease e-sign, WhatsApp bot |
| `2caad6a` | Vercel public app URL in Supabase OAuth redirects |
| `ef35df3` | Vercel dashboard fixes — CORS, leaseService, 406 queries |
| `4a8c62f` | Ghana region search, NG/US subdivisions, map coords, publish validation |
| `a1198c5` | Footer/support pages aligned with built features |
| `9971a1a` | Vercel production — CORS, stale chunks, currency 406 |
| `0f0908a` | TypeScript errors across checkout, workspace, lib services |
| `77d1fe9` / `e5abd26` | Public e-signature — per-signer tokens, UX banners |
| `8961ae7` | Marketing CTAs point at main Vercel app URL |

### Phase 5 — Platform roles, workspaces, pilot readiness

| Commit | Summary |
|--------|---------|
| `dc8e5f5` | Granular platform roles, assignable admin console grants |
| `623c0f3` | Admin backups, desktop gateway, CI tenant-isolation fix |
| `c75eb56` | Desktop blank screen fix, workspace platform updates |
| `d129e51` | CI — typecheck, desktop build, security workflows |
| `21381f0` | CI — tests, Docker build, Semgrep noise |
| `c3c92fa` | nginx OpenSSL CVE patch for container scan |
| `b207650` | Tenant isolation CI for verified org visibility |
| `c51e81f` | Personal workspaces, KYC-gated enrollment/booking |
| `4ec89ea` | Workspace customization, platform KYC policy admin |
| `ef4e978` | Workflow modules, Smile KYC foundation, desktop entitlements |
| `d77c420` | Pilot readiness — backup freeze, security tests, runbooks |
| `30d7481` | CI security — SAST severity, health skip, summary crash |
| `6ccb3cc` | Workflow syntax — secrets not in `if` conditions |
| `cbc105c` | Scheduled jobs when Supabase secrets incomplete |
| `d2ce13d` | CI ops — GitHub secrets sync, live DAST, dependency fixes |
| `97966ad` | DAST target DNS, Node WebSocket in scheduled ops |
| `a14c286` | Platform admin visibility of org members and verification |

### Phase 6 — Production hardening (latest)

| Commit | Summary |
|--------|---------|
| `b0755df` | **Route all payments through PayAngels**; harden production integrations |
| `c1be6f2` | Remove legacy payment rails; fix desktop CI (electron-builder win schema) |
| `ce5c2ac` | Sync Supabase deploy credentials to GitHub Actions secrets |
| *(pending)* | PayAngels inline rename, MLS live-only, bank feed types, DocuSign fail-closed, WhatsApp sim gating, `.env.example` cleanup, `ops:smoke-live` |

---

## Recent production hardening session

Work completed across multiple sessions (summarized):

### Payments consolidation

- **`PaymentCheckout.tsx`**, **`InAppCheckoutPage.tsx`** — single PayAngels inline checkout; Stripe branch removed
- **`payment.service.ts`** — removed `initializeStripePayment` / `verifyStripePayment`; all verification via `verify-payangels-payment`
- **`momo-payment.service.ts`** — disbursements via `initiate-payangels-disbursement` only
- **`initiate-payangels-disbursement`** — supports `approvalId` (owner distributions) and `workOrderId` (contractor payouts) with org validation
- **`contractor-dispatch.service.ts`** + **`ContractorWorkOrders.tsx`** — require `organizationId` for payouts
- Country rules: Ghana/Kenya rails labeled “via PayAngels”
- **Deleted orphan edge functions:** `verify-stripe-payment`, `initiate-momo-payment`, `momo-webhook`, `_shared/momo.ts`
- Removed Stripe checkout helpers from **`payangels.ts`**
- **`payangels-inline.ts`** — renamed to `openPayAngelsInline` / `loadPayAngelsInline` (Paystack names kept as deprecated aliases)

### Simulation removal

- **`simulation-mode.ts`** — `isDemoSimulationAllowed()` returns true only when `MODE === "test"`
- **`supabase/functions/_shared/simulation.ts`** — always `false` in production edge functions
- Simulation fallbacks removed from PayAngels, Arkesel, WhatsApp, DocuSign, MoMo, SMS, blockchain, MLS, etc.
- **`utility-submeter.service.ts`**, **`agentic-ai-orchestrator.service.ts`**, **`EstateCommunications.tsx`** — demo paths gated
- **`BankReconciliation.tsx`** — removed demo feed messaging
- **`mls-integration.service.ts`** — removed `buildDemoListings()`
- **`WhatsAppAutomationHub.tsx`** — simulator tab/group sim gated with `isDemoSimulationAllowed()`
- **`docusign-envelope.service.ts`** — fail-closed on submit; removed `simulated?` from client contract
- **`property-token.service.ts`** — removed dead `buildSimulatedTokenInfo`

### Browser and API fixes

- **`currency.service.ts`** — removed client-side `currency_rates` upsert (was causing 403)
- **`exchange-rates` edge function** — server-side cache read/write with service role
- **`main.tsx`** — defer mount until fonts + window load (FOUC mitigation)
- **`index.html`** — critical theme CSS colors
- Enrollment **`PGRST201`** — explicit FK in enrollment joins
- **`app-version` edge function** — deployed with per-request CORS

### CI/CD and deploy

- Desktop Build fixed — removed invalid `signDlls` / `verifyUpdateCodeSignature` from electron-builder `win` config
- **`deploy.yml`** — Node 24, optional DB push via `--with-db`
- **`sync-github-secrets.mjs`** — added `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`
- Supabase edge functions deployed; GitHub Deploy workflow passing after secrets sync
- Added **`scripts/ops/smoke-live.mjs`** + `npm run ops:smoke-live`

---

## Payments — PayAngels-only rail

```
Tenant/Consumer checkout
        │
        ▼
PaymentCheckout / InAppCheckoutPage
        │
        ▼
initialize-payangels-payment (edge)
        │
        ├── Inline PayAngels widget (VITE_PAYANGELS_PUBLIC_KEY)
        │
        ▼
payangels-webhook (edge) ──► payment reconciliation
        │
        ▼
verify-payangels-payment (edge) ──► booking/enrollment confirmed

Disbursements (owners, contractors):
        │
        ▼
initiate-payangels-disbursement (edge)
        └── MoMo/bank handled by PayAngels, not direct MTN/Stripe
```

**Removed from production:**

| Removed | Replacement |
|---------|-------------|
| Stripe checkout / verify | PayAngels verify |
| Direct MTN MoMo initiate/webhook | PayAngels disbursement |
| Paystack inline naming (legacy aliases remain) | `openPayAngelsInline` |

---

## Integrations status

| Integration | Production behavior | Config location |
|-------------|--------------------|-----------------|
| **PayAngels** | Live checkout + webhooks + disbursements | Vercel + Supabase secrets |
| **Exchange rates** | Edge function caches to DB (service role) | `EXCHANGE_RATE_API_KEY` optional |
| **DocuSign** | Fail-closed if credentials missing | Supabase secrets |
| **WhatsApp Cloud** | Live send; no simulated success in prod | Meta + Supabase |
| **Arkesel SMS** | Live or error; no fake send | Supabase secrets |
| **Bank feeds** | Live provider API or connection paused | Per-provider feed env vars |
| **MLS sync** | Live API only; no demo listings builder | Org MLS credentials |
| **Blockchain tokens** | Rejects simulated contract addresses | Polygon/mainnet config |
| **Smile KYC** | Foundation wired; manual KYC note in UI | Supabase + admin policy |
| **OpenAI / Qwen** | Provider switching for AI features | API keys |

---

## CI/CD and operations

### Workflows

- **`ci.yml`** — typecheck, tests, security gates, legal catalog, backup drill
- **`deploy.yml`** — Supabase functions + optional DB push
- **`scheduled-jobs.yml`** — health checks, DAST (staging), collection promises, night-watch audit
- **`desktop-build.yml`** — Electron Windows build

### Key npm scripts

| Script | Purpose |
|--------|---------|
| `npm run production:check` | 41 static production readiness checks |
| `npm run ops:smoke-live` | Live smoke — app-version, exchange-rates, PayAngels env |
| `npm run pilot:payangels-e2e` | End-to-end PayAngels pilot (needs webhook secret) |
| `npm run supabase:deploy:payments` | Deploy payment-related edge functions |
| `npm run ops:sync-github-secrets` | Sync env to GitHub Actions secrets |

### Deploy state (2026-09-07)

- Remote `main`: through `ce5c2ac`
- Supabase functions deployed locally
- `exchange-rates` smoke: GHS/USD ≈ 0.088
- `production:check`: 41/41 passed
- `typecheck`: passing after bank feed return type fix

---

## Stub and simulation audit

### Intentionally retained (production-safe)

These are **guard rails**, not silent stubs — they throw if called incorrectly:

| Service | Guard methods | Production callers use |
|---------|--------------|------------------------|
| `contractor-dispatch.service.ts` | `getArtisans`, `getWorkOrders`, `createWorkOrder`, `releasePayout` | `getLiveArtisans`, `getLiveWorkOrders`, `createLiveWorkOrder`, `releaseLivePayout` |
| `owner-disbursement.service.ts` | `getOwners`, `getMappedStatements`, `executeDisbursement` | `getLive*` / `executeLiveDisbursement` |
| `visitor-clearance.service.ts` | `listPasses`, `createPass`, `verifyAndCheckIn` | `liveVisitorClearanceService.*` |

### Test-only simulation (`isDemoSimulationAllowed()`)

| Location | Behavior in production |
|----------|------------------------|
| `agentic-ai-orchestrator.service.ts` | Demo portfolio data disabled |
| `utility-submeter.service.ts` | Demo submeter readings disabled |
| `EstateCommunications.tsx` | Demo broadcast panel hidden |
| `WhatsAppAutomationHub.tsx` | Simulator tabs hidden |

### UI demonstration (not payment/integration stubs)

| Location | Notes |
|----------|-------|
| `CallContext.tsx` | Simulated incoming call for demo UX — not a backend stub |
| `multi-currency-fx.service.ts` | “FX Hedging Simulation” — analytical feature name |
| `tenant-screening-providers.ts` | TransUnion sandbox until API keys set |

### Type-level `simulated?` flags (metadata only)

Still present on some edge responses for observability; **production paths do not set `simulated: true`**:

- `initialize-payangels-payment` — rejects sim access codes in checkout UI
- `PaymentCheckout.tsx` — throws if `checkout.simulated` or `sim_` access code
- `_shared/arkesel.ts`, `_shared/whatsapp-cloud.ts` — optional flag on response type

### Removed in this hardening pass

- `buildDemoListings()` in MLS integration
- Stripe / direct MoMo edge functions
- Client `currency_rates` upsert
- DocuSign `simulated?` client contract
- Bank feed `simulated` response flag (status `paused`/`ok` instead)

---

## Browser and runtime fixes

| Issue | Resolution |
|-------|------------|
| `currency_rates` 403 | Client upsert removed; edge function caches server-side |
| `app-version` CORS/404 | Edge function deployed with CORS headers |
| Enrollment `PGRST201` | Explicit foreign key in Supabase joins |
| FOUC / layout shift | Deferred React mount + critical CSS in `index.html` |
| Desktop Build CI failure | Fixed electron-builder `win` schema |
| Deploy workflow failure | GitHub secrets synced via ops script |
| `__cf_bm` websocket cookie warning | Cloudflare on Supabase Realtime from localhost — benign, not app-fixable |

---

## Environment variables

See **`.env.example`** (single source). Key groups:

| Group | Required for production |
|-------|------------------------|
| Supabase | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, service role (server only) |
| Safety | `VITE_ENABLE_DEMO_DATA=false` |
| PayAngels | `VITE_PAYANGELS_PUBLIC_KEY`, `PAYANGELS_SECRET_KEY`, `PAYANGELS_WEBHOOK_SECRET` |
| Deploy | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` |
| Optional | Bank feed provider keys, DocuSign, WhatsApp, Arkesel, AI providers, backup S3 |

**Removed from `.env.example`:** Paystack, Stripe, direct MTN MoMo sections (PayAngels handles all rails).

---

## Manual dashboard steps remaining

1. **PayAngels dashboard** — set webhook URL to `https://<project-ref>.supabase.co/functions/v1/payangels-webhook` and redirect URLs for checkout
2. **Vercel** — ensure `VITE_PAYANGELS_PUBLIC_KEY` in production/preview env
3. **Supabase secrets** — `PAYANGELS_WEBHOOK_SECRET`, disbursement URL, DocuSign, WhatsApp as needed
4. **Pilot E2E** — set `PAYANGELS_WEBHOOK_SECRET` locally for `npm run pilot:payangels-e2e`
5. **Optional CI** — `TENANT_FIXTURE_PASSWORD`, `OPS_ALERT_WEBHOOK_URL` for full tenant isolation + alerting

---

## Verification commands

```bash
# Static production readiness (41 checks)
npm run production:check

# Live smoke against deployed Supabase
npm run ops:smoke-live

# Unit tests + types
npm test
npm run typecheck

# PayAngels pilot (requires webhook secret)
npm run pilot:payangels-e2e -- --dry-run

# Deploy payment edge functions
npm run supabase:deploy:payments -- --skip-db
```

---

## File index (key areas touched in recent work)

| Area | Primary files |
|------|-----------------|
| Checkout | `src/app/pages/workspace/PaymentCheckout.tsx`, `src/app/pages/checkout/InAppCheckoutPage.tsx` |
| Payments | `src/lib/payment.service.ts`, `src/lib/momo-payment.service.ts`, `src/lib/payangels-inline.ts` |
| Currency | `src/lib/currency.service.ts`, `supabase/functions/exchange-rates/` |
| Bank feeds | `src/lib/bank-reconciliation.service.ts`, `supabase/functions/sync-bank-feed/` |
| Deploy | `scripts/deploySupabasePayments.cjs`, `.github/workflows/deploy.yml` |
| Simulation gate | `src/lib/simulation-mode.ts`, `supabase/functions/_shared/simulation.ts` |
| Tests | `src/lib/currency.service.test.ts`, `src/lib/gap-closure.test.ts`, `src/lib/momo.service.test.ts` |

---

*Generated from git history (97 commits on `main`) and production hardening session notes.*

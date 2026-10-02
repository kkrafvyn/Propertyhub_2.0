# BaytMiftah production readiness score (0–100)

Objective rubric used by `npm run production:check`. The script prints a **score**, **ready** flag, and per-category breakdown. Re-run after changing repo evidence, `.env`, or Supabase/Vercel secrets.

## Two numbers

1. **`npm run production:check` → `score`** — reproducible from the repo + local `.env` (no secret values printed). CI uses the same script; exit code **1** only on hard failures, not on integration warnings.
2. **Holistic audit score** — includes remote Supabase state (legacy edge functions, migration drift, uncommitted `dist/`). Use `supabase:audit:edge` and dashboard review for that layer.

## Score bands

| Score | Meaning |
|------:|---------|
| **90+** | Launch-ready: repo gate green, critical integrations configured (or explicitly deferred with flags), legal sign-off recorded, edge inventory understood. |
| **78–89** | Typical pre-launch: CI/static evidence passes; production secrets or operator steps still open (matches prior audit baseline). |
| **&lt;78** | Blocking repo gaps (missing workflows, migrations, payment-rail cleanup, demo data enabled, failed static checks). |

## Category weights (100 points)

| Category | Points | What it measures |
|----------|-------:|------------------|
| **Repository evidence** | 30 | Required files, npm scripts, migrations, CI/deploy workflows, legal catalog tests, backup drill fixtures. |
| **Security & config** | 15 | RLS static audit coverage, removed legacy payment edge folders, `VITE_ENABLE_DEMO_DATA=false` in `.env.example` and local `.env`. |
| **Integrations (runtime)** | 35 | PayAngels (public + secret + webhook), Resend email, service role for jobs/backups, offsite backup S3, ops alert webhook. Prembly live KYC is **optional** when `PREMBLY_LIVE_KYC_OPTIONAL=true`. |
| **Legal & operator** | 10 | `LEGAL_LAUNCH_CHECKLIST` present in repo; operator sets `LEGAL_LAUNCH_SIGNED_OFF=true` after completing checklist (see `src/lib/legal-config.ts`). |
| **Edge functions (repo)** | 10 | PayAngels webhook function present; `polygon-transactions` in repo; run `npm run supabase:audit:edge` to compare local vs remote inventory. |

Deductions: each **failed** check removes its category share proportionally. **Warnings** (missing optional/deferred secrets) reduce the integration/legal categories without failing CI exit code (exit **1** only on hard **failed** checks).

## 78 → 90: operator checklist

### Already satisfied in repo (no secrets)

- [x] Static production gate files and worker scripts
- [x] PayAngels-only payment rail (legacy Stripe/MoMo folders removed)
- [x] Legal policy catalog + `LEGAL_LAUNCH_CHECKLIST` definitions
- [x] Tenant isolation tests gated behind `RUN_TENANT_ISOLATION_TESTS=true`

### Raises score (requires your environment)

Repo wiring for PayAngels webhooks, Resend dispatch, Prembly edge functions, monitoring, and offsite backup workflows is in-tree — **`npm run production:check` warnings should reduce to missing secret values** once you fill `.env` and run `npm run integrations:wire` + `npm run supabase:deploy:payments -- --skip-db`.

1. **Supabase secrets** (via deploy helper): `PAYANGELS_SECRET_KEY`, `PAYANGELS_WEBHOOK_SECRET`, `RESEND_API_KEY`, `NOTIFICATION_EMAIL_FROM`, Prembly server keys when live KYC is enabled.
2. **Vercel**: `VITE_PAYANGELS_PUBLIC_KEY`, `VITE_ENABLE_DEMO_DATA=false`, Prembly widget keys when required.
3. **GitHub Actions** (`npm run ops:sync-github-secrets`): `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `INTERNAL_AUTOMATIONS_KEY`, `OPS_ALERT_WEBHOOK_URL`, `BACKUP_S3_*`, AWS keys.
4. **Legal**: Complete every item in `LEGAL_LAUNCH_CHECKLIST`, then set `LEGAL_LAUNCH_SIGNED_OFF=true` in production env (Vercel + operator `.env`) — no code path fakes sign-off.
5. **Edge cleanup**: Run `npm run supabase:audit:edge`, deploy missing functions, delete legacy remote-only functions (see script output).
6. **Deploy polygon-transactions**:
   ```powershell
   Set-Location "C:\Users\ponk3\Desktop\property hub\Propertyhub_2.0"
   npx supabase functions deploy polygon-transactions --project-ref ixmbfnfwpjwbfahqaftc
   ```

### Optional deferrals (documented)

| Flag | Effect |
|------|--------|
| `PREMBLY_LIVE_KYC_OPTIONAL=true` | Missing Prembly keys → warning only (non-blocking for `ready` integration sub-score). |
| `PREMBLY_LIVE_KYC_OPTIONAL=false` (default) | Prembly keys expected for Ghana live KYC. |
| `PRODUCTION_INTEGRATIONS_DEFERRED=true` (via `npm run production:check:repo` only) | Missing PayAngels/Resend/AWS/service-role/ops secrets → informational; full integration category credit for repo gate. **`ready` stays false** until secrets are set. |
| `LEGAL_LAUNCH_DEFERRED=true` (paired with repo check) | Legal sign-off warning informational; **`ready` stays false** until `LEGAL_LAUNCH_SIGNED_OFF=true`. |

## Hygiene complete (operator)

- **`dist/`** — listed in `.gitignore`; build output should not be committed.
- **Edge inventory** — `npm run supabase:audit:edge` compares 29 local slugs to remote; delete legacy remote-only monolith/payment rails with `node scripts/supabase/delete-legacy-remote-functions.mjs` (log: `docs/deployment/edge-legacy-deletions.log`).
- **Repo production gate** — `npm run production:check:repo` targets **score ≥ 90** without live integration secrets or legal sign-off; `npm run production:check` remains the honest live launch gate.

## Commands for evidence

```powershell
Set-Location "C:\Users\ponk3\Desktop\property hub\Propertyhub_2.0"
npm run production:check
npm run production:check:repo
npm run supabase:audit:edge
npm run typecheck
npm run test
npm run build
```

## Workspace UI pattern (flagship pages)

High-traffic workspace routes use `WorkspacePageShell` + shared `EmptyState` / `LoadingSkeleton` / `ErrorState` (`src/styles/app-ui.css` tokens: `app-page-title`, `app-surface-card`). Extend the same pattern when touching other workspace modules.

## Manual steps (not automatable in repo)

- PayAngels dashboard: webhook URL `https://ixmbfnfwpjwbfahqaftc.supabase.co/functions/v1/payangels-webhook`
- Resend: verify sending domain
- Legal counsel sign-off on managed-services and DPA wording
- Remove untracked `dist/` from git status (already in `.gitignore`; delete local `dist/` or stop committing build output)

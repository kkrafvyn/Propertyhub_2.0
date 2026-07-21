# BaytMiftah Production Deploy Checklist

Use this checklist before every production release of the consumer portal, workspace, and payment edge.

## Pre-deploy

- [ ] Run `npm run test` — all Vitest unit tests pass
- [ ] Run `npm run typecheck` — TypeScript passes
- [ ] Run `npm run test:e2e` — Playwright smoke tests pass against staging
- [ ] Run `npm run build` — Vite production build succeeds
- [ ] GitHub Actions CI green on the release branch
- [ ] Review open migrations in `supabase/migrations/` and confirm they are idempotent
- [ ] Apply database changes: `npx supabase db push --include-all`
- [ ] Deploy payment edge functions: `npm run supabase:deploy:payments`
- [ ] Verify `.env` / hosting secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, Paystack keys on edge
- [ ] Confirm RLS policies for new tables (`organization_wallets`, `organization_payout_requests`, `deal_case_counter_offers`, `closing_checklist_items`, `lease_rent_schedule`, `booking_reviews`)

## Smoke test (manual)

- [ ] Login as consumer → My BaytMiftah overview loads
- [ ] Search → open property → quick actions (viewing / offer / save) work
- [ ] Submit purchase offer → applications timeline + checklist visible
- [ ] Wallet → escrow hold timeline renders
- [ ] Short-stay booking → cancel/refund, check-in/out, review
- [ ] Active lease → rent schedule, renewal request, pay rent redirect
- [ ] Workspace → BaytMiftah AI panel visible on core pages
- [ ] Workspace → Finance → org wallet balance, payout request, payout queue
- [ ] Paystack checkout → webhook reconciles org wallet / escrow / booking confirm + in-app payment notifications

## Monitoring

- [ ] `monitoring.trackPageView` wired on route changes (optional GA / dataLayer)
- [ ] `monitoring.trackWorkflowStep` events fire for offer, booking, rent, maintenance
- [ ] `monitoring.captureError` surfaces in browser console (dev) or analytics (prod)
- [ ] Supabase edge function logs reviewed for payment reconciliation errors
- [ ] Set up uptime check on `/` and authenticated `/app` route

## Rollback

- [ ] Previous deployment artifact tagged in hosting provider
- [ ] Database migrations are forward-only; document manual rollback SQL if needed
- [ ] Paystack webhook endpoint unchanged or dual-run during cutover

## Post-deploy

- [ ] Grant platform admin if needed: `UPDATE public.users SET is_platform_admin = true WHERE email = '...'`
- [ ] Announce release in workspace notification settings
- [ ] Monitor error rate for 30 minutes after cutover

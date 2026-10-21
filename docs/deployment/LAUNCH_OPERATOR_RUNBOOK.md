# Launch operator runbook

Single checklist for moving BaytMiftah from **repo-ready** to **live-certified**. Run locally:

```powershell
npm run launch:preflight
```

## 1. Play Store (manual)

See [PLAY_STORE_SCREENSHOTS.md](./PLAY_STORE_SCREENSHOTS.md) and [marketing/google-play/README.md](../../marketing/google-play/README.md).

- [ ] Consumer + workspace phone screenshots (1080×1920)
- [ ] Feature graphic 1024×500 per variant
- [ ] Store copy from `marketing/google-play/*/store-listing.md`
- [ ] GitHub / Play signing secrets for CI upload (if using automated AAB)

## 2. PayAngels live certification

See [PRODUCTION_SCORE.md](./PRODUCTION_SCORE.md).

- [ ] Provider-issued API base, credentials, webhook signature contract
- [ ] `PAYANGELS_API_CONTRACT_VERIFIED=true` after code review
- [ ] `npm run integrations:wire-payangels` + sandbox → live certification evidence
- [ ] `PAYANGELS_LIVE_CERTIFIED=true` only after init, verify, webhook, refund, payout tests
- [ ] Webhook URL: `https://ixmbfnfwpjwbfahqaftc.supabase.co/functions/v1/payangels-webhook`
- [ ] Vercel: `VITE_PAYANGELS_PUBLIC_KEY`, `VITE_ENABLE_DEMO_DATA=false`

## 3. Legal sign-off

- [ ] Complete `LEGAL_LAUNCH_CHECKLIST` items in repo
- [ ] Counsel review per [LEGAL_LAUNCH_SIGNOFF.md](../legal/LEGAL_LAUNCH_SIGNOFF.md)
- [ ] Production: `LEGAL_LAUNCH_SIGNED_OFF=true` (never faked in code)

## 4. Supabase edge inventory

```powershell
npm run supabase:audit:edge
```

- [ ] Deploy missing functions from repo
- [ ] Delete legacy remote-only functions per script / `edge-legacy-deletions.log`
- [ ] `npx supabase functions deploy polygon-transactions --project-ref ixmbfnfwpjwbfahqaftc` if listed missing

## 5. Secrets & CI (summary)

- Supabase secrets: service role, PayAngels, Resend, Prembly (if live KYC)
- GitHub: `npm run ops:sync-github-secrets` for backup/ops keys
- Re-run `npm run production:check` (honest launch gate) vs `npm run production:check:repo` (merge gate)

## 6. Post-push verification

- [ ] Vercel production deploy green
- [ ] `node scripts/ops/smoke-production.mjs` on production URL
- [ ] [P0 admin acceptance](../ops/P0_ADMIN_ACCEPTANCE.md) with disposable accounts

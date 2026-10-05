# Operator track — run evidence (2026-09-10)

## Public catalog

```bash
npm run ops:ensure-public-catalog -- --seed --org-slug=siabanku --write-env
npm run ops:ensure-public-catalog
```

| Check | Result |
|-------|--------|
| `listedPublicCount` | **1** |
| Pilot org | `siabanku` (`a2ea564b-a413-4752-b189-6f5ac5268a07`) |
| Seed listing | `aad17bb4-9e9c-4508-a285-f6f2dea7ffd1` (GHS 2500 rental, listed/public) |
| `.env` updated | `PILOT_TEST_LISTING_ID`, `PILOT_TEST_ORG_ID`, `PILOT_ORG_SLUG` |

## GitHub Actions secrets

```bash
npm run ops:sync-github-secrets
npm run security:provision-tenant-fixtures -- --gh-secrets
```

**Synced:** `SUPABASE_*`, tenant isolation fixtures, `INTERNAL_AUTOMATIONS_KEY`, DAST variables.

**Skipped (add to `.env` then re-run):** `OPS_ALERT_WEBHOOK_URL`, `BACKUP_S3_*`, `AWS_*`.

## Vercel client env

```bash
npm run vercel:env
```

**Synced:** 13 vars including `VITE_PAYANGELS_PUBLIC_KEY`, `VITE_SUPABASE_URL`, app version keys.

**Manual dashboard:** `VITE_SUPABASE_ANON_KEY` (CLI credential guard), `VITE_EXCHANGE_RATE_API_KEY` if needed.

Redeploy after env changes: `npx vercel --prod`

## PayAngels E2E

```bash
npm run pilot:payangels-e2e -- --dry-run   # pass
npm run pilot:payangels-e2e                 # partial
```

| Step | Result |
|------|--------|
| Config dry-run | Pass |
| Auth (tenant fixture user) | Pass |
| Payment init → DB row | Pass (constraint fix `2026090905`) |
| PayAngel API charge | **Invalidated** — the run called Paystack, not PayAngel |
| Webhook replay | **Pass** — reference `ph_pay_1996cab48e80407ab8` |
| Refund / disbursement | Skipped — needs transaction + approval IDs |

## DB migration applied

`2026090905_property_transactions_payangels_provider.sql` — legacy `paystack` provider CHECK → `payangels`.

## PayAngels API diagnosis (2026-09-10)

```bash
npm run ops:probe-payangels-api
```

This diagnosis was incorrect: `https://api.paystack.co` is Paystack and cannot certify PayAngel. Obtain the private PayAngel Business API contract after Live activation, deploy the exact provider-issued endpoints, and rerun the complete certification.

## Still operator-owned

1. **Vercel:** set `VITE_SUPABASE_ANON_KEY` manually (CLI credential guard); `npx vercel --prod`
2. **Monitoring:** add `OPS_ALERT_WEBHOOK_URL` to `.env` → `npm run ops:sync-github-secrets`
3. **Offsite backup:** add `BACKUP_S3_*` / `AWS_*` → sync to GitHub
4. **Refund/disbursement E2E:** set transaction + approval IDs after real payout fixtures

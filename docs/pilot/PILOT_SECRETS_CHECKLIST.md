# Pilot Secrets Checklist (P5)

Set these before controlled pilot. Server secrets → **Supabase Edge Function secrets** or **GitHub Actions secrets**. Client secrets → **Vercel** (`npm run vercel:env`).

## Vercel (baytmiftah-app)

| Variable | Required | Notes |
|----------|----------|-------|
| `VITE_SUPABASE_URL` | Yes | |
| `VITE_SUPABASE_ANON_KEY` | Yes | Set manually in dashboard if CLI blocks credential |
| `VITE_PUBLIC_APP_URL` | Yes | `https://app.baytmiftah.com` |
| `VITE_PAYANGELS_PUBLIC_KEY` | Yes | Staging or prod per environment |
| `VITE_APP_VERSION` | Yes | Bump each release |

## Supabase Edge Function secrets

| Variable | Required | Notes |
|----------|----------|-------|
| `PAYANGELS_SECRET_KEY` | Yes | Provider-issued after the PayAngel Business channel is Live |
| `PAYANGELS_WEBHOOK_SECRET` | Yes | Distinct provider-issued webhook verification secret |
| `PAYANGELS_API_BASE` | Yes | Exact HTTPS endpoint from PayAngel private API documentation; never Paystack |
| `PAYANGELS_DISBURSEMENT_URL` | Yes | Exact provider-issued payout endpoint |
| `PAYANGELS_API_CONTRACT_VERIFIED` | Yes | Set true only after review against the private docs |
| `PAYANGELS_LIVE_CERTIFIED` | Yes | Set true only after init, webhook, verification, refund, and payout pass |
| `RESEND_API_KEY` | Yes | |
| `EMAIL_LOGO_URL` | Optional | Defaults to `{PUBLIC_APP_URL}/brand/email-logo.svg` |
| `PUBLIC_APP_URL` | Yes | `https://app.baytmiftah.com` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Already in project |
| `INTERNAL_AUTOMATIONS_KEY` | Yes | Cron/workers |
| `SMILE_*` | Optional | KYC when ready |

Deploy functions after secrets:

```bash
npm run supabase:deploy:payments
```

## GitHub Actions secrets

| Secret | Used by |
|--------|---------|
| `VITE_SUPABASE_URL` | CI, monitoring, scheduled jobs |
| `SUPABASE_DB_URL` (or `SUPABASE_DB_PASSWORD`) | Scheduled jobs, offsite backup DB dump |
| `SUPABASE_SERVICE_ROLE_KEY` | Monitoring, scheduled jobs, offsite backup |
| `VITE_SUPABASE_TEST_*` + `TENANT_FIXTURE_PASSWORD` | Tenant isolation CI |
| `BACKUP_S3_BUCKET`, `AWS_*` | Offsite backup (required or the job skips) |
| `OPS_ALERT_WEBHOOK_URL` | Monitoring workflow |
| `DAST_TARGET_URL` | Security DAST (staging only) |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` | Deploy workflow |
| `PLAY_SERVICE_ACCOUNT_JSON` | Google Play API upload |
| `PLAY_CONSUMER_KEYSTORE_B64`, `PLAY_CONSUMER_*` | Consumer Android signing |
| `PLAY_WORKSPACE_KEYSTORE_B64`, `PLAY_WORKSPACE_*` | Workspace Android signing |
| `ASC_*`, `IOS_*`, `MAC_*` | Apple Store Upload workflow |

## Resend

1. Add domain `baytmiftah.com` at [resend.com/domains](https://resend.com/domains)
2. Set DNS records Vercel/hosting provides
3. Set `RESEND_API_KEY` in Supabase secrets
4. Send test to pilot contact

## PayAngels

1. Staging merchant keys in Supabase + Vercel
2. Webhook: `https://<project-ref>.supabase.co/functions/v1/payangels-webhook`
3. Run `npm run pilot:payangels-e2e`
4. Record successful payment reference for refund probe

## DNS (already live)

- `app.baytmiftah.com` → Vercel baytmiftah-app
- `www.baytmiftah.com` → Vercel baytmiftah-marketing

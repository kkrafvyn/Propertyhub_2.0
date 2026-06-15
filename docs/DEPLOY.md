# Deploy BaytMiftah backend

## 1. Frontend (Vercel)

Set **Environment Variables** (Production + Preview):

| Variable | Notes |
|----------|--------|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key |
| `VITE_SITE_URL` | e.g. `https://propertyhub-2-0.vercel.app` |
| `VITE_POSTHOG_KEY` | Optional analytics |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Optional |

Redeploy after changes.

## 2. Supabase Edge Functions

From repo root (linked project `ixmbfnfwpjwbfahqaftc`):

```powershell
npm run deploy:backend
```

Or manually:

```powershell
npx supabase link --project-ref ixmbfnfwpjwbfahqaftc
npx supabase db push --yes
npx supabase functions deploy bookings
npx supabase functions deploy moderation
npx supabase functions deploy payments
npx supabase functions deploy agencies
# … see scripts/deploy-supabase.ps1 for full list
```

## 3. Edge Function secrets

**Dashboard → Edge Functions → Secrets** (never put these in `VITE_*`):

```
SITE_URL=https://propertyhub-2-0.vercel.app
PAYSTACK_SECRET_KEY=sk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
RESEND_API_KEY=re_...
EMAIL_FROM=BaytMiftah <noreply@yourdomain.com>
OPENAI_API_KEY=sk-...
FCM_SERVER_KEY=...
```

## 4. Webhooks

Register in Paystack / Stripe dashboards:

- **Paystack:** `https://<project-ref>.supabase.co/functions/v1/payments?action=webhook_paystack`
- **Stripe:** `https://<project-ref>.supabase.co/functions/v1/payments?action=webhook_stripe`

Events: `charge.success` (Paystack), `checkout.session.completed` (Stripe).

## 5. Smoke test

1. Sign in on mobile → save a listing → appears on second device after login.
2. Book viewing → `/trips` shows request; agent confirms in `/agent/calendar`.
3. Renter **Pay now** (Paystack) → webhook marks `rent_payments` paid.
4. Admin approves listing → host gets in-app notification + verified badge on mobile.

## 6. CI

GitHub Actions runs `npm run build` and `npm test` on push/PR.

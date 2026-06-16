# Deploy BaytMiftah backend

## 1. Frontend (Vercel)

Set **Environment Variables** (Production + Preview):

| Variable | Notes |
|----------|--------|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key |
| `VITE_SITE_URL` | e.g. `https://phub-sigma.vercel.app` |
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
npx supabase functions deploy cron
# … see scripts/deploy-supabase.ps1 for full list
```

## 3. Edge Function secrets

**Dashboard → Edge Functions → Secrets** (never put these in `VITE_*`):

```
SITE_URL=https://phub-sigma.vercel.app
PAYSTACK_SECRET_KEY=sk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
CRON_SECRET=your-random-cron-secret
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
RESEND_API_KEY=re_...
EMAIL_FROM=BaytMiftah <noreply@yourdomain.com>
OPENAI_API_KEY=sk-...
FCM_SERVER_KEY=...
```

## 4. Webhooks

Register in Paystack / Stripe / Razorpay dashboards (also shown at `/developer/platform-api`):

| Provider | URL | Events |
|----------|-----|--------|
| Paystack | `https://ixmbfnfwpjwbfahqaftc.supabase.co/functions/v1/payments?action=webhook_paystack` | `charge.success` |
| Stripe | `https://ixmbfnfwpjwbfahqaftc.supabase.co/functions/v1/payments?action=webhook_stripe` | `checkout.session.completed` |
| Razorpay | `https://ixmbfnfwpjwbfahqaftc.supabase.co/functions/v1/payments?action=webhook_razorpay` | `payment.captured`, `payment_link.paid` |

Or fetch live URLs: `GET /functions/v1/payments?action=config`

## 5. Nightly cron (analytics + utility billing)

Set `CRON_SECRET` in Edge Function secrets, then schedule a daily POST:

```
POST https://ixmbfnfwpjwbfahqaftc.supabase.co/functions/v1/cron?action=nightly_full
Authorization: Bearer <CRON_SECRET>
```

**Supabase Dashboard → Integrations → Cron** (or GitHub Actions scheduled workflow):

- `nightly_full` — analytics aggregation for all regions + utility bill generation
- `analytics` — warehouse facts only
- `utility_billing` — generate unpaid utility bills only

Health check (no auth): `GET /functions/v1/cron?action=health`

## 6. Smoke test

1. Sign in on mobile → save a listing → appears on second device after login.
2. Book viewing → `/trips` shows request; agent confirms in `/agent/calendar`.
3. Renter **Pay now** (Paystack) → webhook marks `rent_payments` paid.
4. Admin approves listing → host gets in-app notification + verified badge on mobile.
5. Developer **Platform API** page shows webhook URLs and cron endpoint.

## 7. CI

GitHub Actions runs `npm run build` and `npm test` on push/PR.

## 8. Production readiness without API keys (~80%)

The app runs in **demo/local fallback mode** when optional secrets are missing. You can ship the frontend and most UX without payment, AI, or email keys.

| Area | Works without keys | Needs keys / deploy |
|------|-------------------|---------------------|
| Browse listings, saved, compare | ✅ Supabase anon + sample fallback | Live inventory: `VITE_SUPABASE_*` |
| Hubs (buyer, renter, agency, …) | ✅ UI + local demo data | Edge functions + RLS for live data |
| `/services`, `/agencies`, `/agents` | ✅ Local marketplace profiles | `marketplace` / `agencies` / `agent` edge actions |
| Payments, escrow, rent collection | ⚠️ Banners + UI only | Paystack/Stripe/Razorpay secrets |
| AI advisor, valuation API | ⚠️ Static hints | `OPENAI_API_KEY` |
| Email / SMS notifications | ⚠️ In-app only | Resend, Twilio |
| OAuth social login | ⚠️ Email auth works | Provider client IDs in Supabase |

**Minimum to go live (no payment keys):**

1. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL` in Vercel.
2. Run `npm run deploy:backend` (migrations + edge functions).
3. Set `SITE_URL` in Supabase Edge secrets only (no payment keys required for browse/book demo flow).

**When you add keys:** copy from `.env.example` → Vercel env + Supabase Edge secrets. Payment and webhook sections above apply.

**i18n hub locales:** `npm run i18n:apply-hubs` (from cache) or `npm run i18n:hubs -- --langs=pt,ar` for remaining languages.

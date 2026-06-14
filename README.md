# BaytMiftah (Property Hub 2.0)

Real-estate marketplace and operations platform (React + Vite + Supabase).

**Repository:** [github.com/kkrafvyn/Propertyhub_2.0](https://github.com/kkrafvyn/Propertyhub_2.0) — active branch: `baytmiftah-rebuild`

## Setup

```bash
npm install
cp .env.example .env   # add VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

## Backend (Supabase)

**Project ref:** `ixmbfnfwpjwbfahqaftc`

```bash
npm run check:supabase          # verify .env connection
npx supabase login
npx supabase link --project-ref ixmbfnfwpjwbfahqaftc
npm run db:push                 # apply migrations
npm run deploy:backend          # deploy Edge Functions
```

If CLI link fails, run bundled SQL in the [Supabase SQL Editor](https://supabase.com/dashboard/project/ixmbfnfwpjwbfahqaftc/sql/new):

```bash
npm run db:bundle               # writes scripts/all-migrations.sql
```

## Listing flow (end-to-end test)

1. Sign up as **property owner** or **agency owner** at `/signup`
2. Submit a listing at `/host/list`
3. Track status at `/host/listings` (pending → active)
4. As **agency owner**, open `/admin/moderation` → **Approve & publish**
5. Listing appears on home `/` and `/property/:id`

Agency owners and platform admins can moderate. Edge Functions work when deployed; direct Postgres + RLS fallbacks work without them after migrations.

## Build

```bash
npm run build
```

## Vercel deployment

Set these **Environment Variables** in the Vercel project (Production + Preview), then redeploy:

| Variable | Value |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://ixmbfnfwpjwbfahqaftc.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your publishable key from [Supabase API settings](https://supabase.com/dashboard/project/ixmbfnfwpjwbfahqaftc/settings/api) |

Do **not** use the old `tcnsqtnwyyufeupktkhs` project — Edge Functions are not deployed there (CORS / 404 errors).

After updating env vars, trigger **Redeploy** so Vite rebuilds with the new values.

## Sign in with Google & Apple

OAuth is wired in the app at `/login`, `/signup`, and `/auth/callback`.

### Supabase Auth settings

1. Open [Authentication → Providers](https://supabase.com/dashboard/project/ixmbfnfwpjwbfahqaftc/auth/providers)
2. Enable **Google** and **Apple**
3. Under [URL Configuration](https://supabase.com/dashboard/project/ixmbfnfwpjwbfahqaftc/auth/url-configuration):
   - **Site URL:** `https://propertyhub-2-0.vercel.app` (or your custom domain)
   - **Redirect URLs** (add all that apply):
     - `http://localhost:5173/auth/callback`
     - `https://propertyhub-2-0.vercel.app/auth/callback`

### Google

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Authorized redirect URI: `https://ixmbfnfwpjwbfahqaftc.supabase.co/auth/v1/callback`
3. Paste Client ID and Client Secret into Supabase Google provider settings

### Apple

1. Configure Sign in with Apple in [Apple Developer](https://developer.apple.com/account/resources/identifiers/list/serviceId) (Services ID + key)
2. Return URL: `https://ixmbfnfwpjwbfahqaftc.supabase.co/auth/v1/callback`
3. Paste Services ID, Team ID, Key ID, and private key into Supabase Apple provider settings

On signup, users can pick a role before continuing with Google or Apple; that role is stored in user metadata after the callback.

## Languages (i18n)

The app supports **5 languages** with automatic browser detection and a saved preference in `localStorage` (`baytmiftah_locale`):

| Code | Language |
|------|----------|
| `en` | English |
| `ar` | العربية (RTL) |
| `fr` | Français |
| `es` | Español |
| `pt` | Português |

Switch language from the **header globe menu**, **footer**, **Profile → Language**, or **mobile Profile** tab.

Translation files live in `src/i18n/locales/`. To add a string, add the key to all locale files and use `const { t } = useTranslation()` then `t('section.key')`.

## Viewings & messaging

Viewing requests and in-app chat use direct Supabase reads/writes when Edge Functions are unavailable:

1. Apply migrations (`npm run db:push` or SQL Editor bundle)
2. Sign in and open a listing → **Request viewing**
3. Open **Messages** — conversations are created per listing

Optional: deploy `messaging` Edge Function via `npm run deploy:backend` for server-side validation.

## Payments (Stripe / Paystack)

Set in **Vercel** (client):

| Variable | Purpose |
|----------|---------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe checkout (optional) |

Set in **Supabase Edge Function secrets** (server):

| Secret | Purpose |
|--------|---------|
| `STRIPE_SECRET_KEY` | Stripe sessions |
| `PAYSTACK_SECRET_KEY` | Paystack checkout |
| `SITE_URL` | `https://propertyhub-2-0.vercel.app` |

Without secrets, payment flows show a clear configuration error instead of failing silently.

## Production checklist

1. **Migrations** — `npm run db:bundle` → paste into SQL Editor, or `SUPABASE_DB_PASSWORD=… npm run db:push`
2. **OAuth** — Google + Apple providers + redirect URLs (see above)
3. **Edge secrets** — Stripe, Paystack, `SITE_URL`, optional `RESEND_API_KEY`, `OPENAI_API_KEY`
4. **Vercel env** — `VITE_SUPABASE_*`, optional `VITE_STRIPE_PUBLISHABLE_KEY`
5. **Deploy** — push to `baytmiftah-rebuild`; Vercel auto-deploys from GitHub
6. **Verify** — `npm run check:supabase` (listings table exists after migrations)

## Platform features (reviews, alerts, referrals)

After migrations, the app includes:

| Feature | Route / location |
|---------|------------------|
| Reviews | Property detail page |
| Price alerts | Saved homes |
| Notifications bell | Header (when signed in) |
| WhatsApp share | Property detail |
| Referrals | `/referral` |
| Help centre | `/help` |
| Dark mode | Header moon/sun toggle |
| Currency (GHS/USD) | Footer selector |
| Advanced filters | Home → Filters (verified, min beds) |
| PWA | `manifest.webmanifest` + service worker |

Optional env: `VITE_POSTHOG_KEY`, `VITE_SITE_URL` (see `.env.example`).

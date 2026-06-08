# Supabase Deployment Status

Current frontend target:

```text
tcnsqtnwyyufeupktkhs
```

Current Supabase CLI-accessible project:

```text
jcwagkwjdhtuugcfbhui
```

These do not match. The deploy script intentionally blocks deployment to a project
that is different from `baytmiftah/.env` unless `-Force` is passed.

## What Is Ready

- `supabase/config.toml` keeps public read/auth functions open and requires JWT verification for protected write/payment/AI functions.
- `supabase/migrations/20260607103000_create_edge_function_contract.sql` creates the schema used by the Edge Functions.
- Remote migration history placeholders are present so `supabase db push --linked --dry-run` can reconcile with the accessible project.
- `scripts/check-supabase-target.ps1` reports project mismatch, functions, secrets, and migration dry-run.
- `scripts/deploy-edge-functions.ps1` links, validates secrets, pushes migrations, and deploys functions.
- Function shells are ready for manual deployment:
  - `payments`: authenticated Stripe and Paystack checkout session creation with server-side pricing.
  - `bookings`: authenticated viewing request creation/listing/status updates plus public availability slots.
  - `listing-ai`: authenticated OpenAI listing review with deterministic local fallback.
  - `geo`: Mapbox geocoding with Accra-area fallback coordinates.
  - `notifications`: authenticated stored notifications plus restricted Resend email and Twilio SMS hooks.
  - `persistence`: authenticated saved searches, offer packets, audit events, team invites, and e-sign packet status.
  - `channel-sync`: iCal/channel connections, availability blocks, and public tokenized iCal export.
  - `payments-webhook`: Stripe and Paystack webhook signature verification and billing event recording.
  - `messaging`: templates, push subscriptions, queued email/SMS/WhatsApp/push delivery logs.
  - `transactions`: document vault, counter-offers, negotiation events, and closing checklist records.
  - `moderation`: admin listing review queue, assignment, decisions, and reason codes.
  - `intelligence`: AI concierge sessions, neighborhood metrics, dynamic pricing, inspections, and revenue ops.
  - `partner-api`: hashed API-key protected partner access with usage event logging.
- `supabase/migrations/20260608004752_harden_security_contract.sql` adds persistence tables, grants, RLS policies, and admin/owner access rules for the newly wired flows.
- `supabase/migrations/20260608011240_add_production_feature_contract.sql` adds the code-side contract for account completion, channel calendars, billing, delivery logs, push, transaction docs, negotiations, moderation, and valuation reports.
- `supabase/migrations/20260608080956_add_intelligence_frontier_contract.sql` adds the code-side contract for AI concierge, owner reports, neighborhood metrics, developer projects, inspections, revenue snapshots, and partner API keys/events.
- Frontend auth is wired for Supabase OAuth with Google and Apple via `supabase.auth.signInWithOAuth`.

Manual Supabase Auth provider setup still required:

- Enable Google and Apple providers in Supabase Auth.
- Add the local and production site URLs to Supabase Auth redirect URLs.
- Add Google OAuth client ID/secret and authorized redirect URL.
- Add Apple Services ID, Team ID, Key ID, private key, and return URL.

Required provider secrets before production verification:

```text
STRIPE_SECRET_KEY
STRIPE_FEATURED_BOOST_PRICE_ID
PAYSTACK_SECRET_KEY
OPENAI_API_KEY
MAPBOX_ACCESS_TOKEN
RESEND_API_KEY
NOTIFICATION_FROM_EMAIL
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
PUBLIC_SITE_URL
ALLOWED_ORIGINS
STRIPE_WEBHOOK_SECRET
```

Partner API keys must be generated manually, stored only as SHA-256 hashes in
`partner_api_keys.token_hash`, and distributed outside the app.

## Safe Checks

```powershell
.\scripts\check-supabase-target.ps1 -ProjectRef <project-ref>
.\scripts\deploy-edge-functions.ps1 -ProjectRef <project-ref> -DryRun
```

## Deploy When Target Is Confirmed

Use the project ref that matches `baytmiftah/.env`:

```powershell
.\scripts\deploy-edge-functions.ps1 -ProjectRef tcnsqtnwyyufeupktkhs
```

If the app is intentionally being moved to the accessible project, update the frontend
Supabase URL/key first, then deploy. `-Force` exists only for an intentional mismatch.

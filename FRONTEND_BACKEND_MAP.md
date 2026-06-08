# BaytMiftah Frontend to Backend Map

This file tracks the live wiring between the React frontend and the Supabase backend.

## Core Runtime

| Frontend area | Frontend service | Supabase backend | Notes |
| --- | --- | --- | --- |
| Auth login/signup/me | `baytmiftah/src/services/auth-service.js` | `supabase/functions/auth` | Email/password goes through the Edge Function, then sets the Supabase browser session. Google/Apple use Supabase OAuth directly. |
| Marketplace listing browse/create | `marketplace-service.js` | `supabase/functions/marketplace` | Anonymous listing reads are allowed; create listing requires an authenticated organization user. |
| Agency profile/team/leads/analytics | `agency-service.js`, `useAgencyStore.js` | `supabase/functions/agencies`, `supabase/functions/agency-crm` | Agency dashboards use Edge Function calls and fall back to preview data when no agency record is available. |
| Smart devices/alerts/logs/commands | `smart-device-service.js`, `useSmartDeviceStore.js` | `supabase/functions/smart-devices` | Commands, logs, alert preferences, and device records are routed through the Edge Function. |
| Media upload | `media-service.js` | Supabase Storage bucket `property-media`, table `property_media` | Requires Storage bucket and policies from migrations/manual setup. |
| Listing AI review | `listing-review-service.js` | `supabase/functions/listing-ai` | Uses OpenAI when `OPENAI_API_KEY` is configured; otherwise returns a deterministic local review response. |
| Geocoding/maps | `geo-service.js` | `supabase/functions/geo` | Uses Mapbox when `MAPBOX_ACCESS_TOKEN` is configured; otherwise returns Accra fallback coordinates. |
| Booking/availability | `booking-service.js` | `supabase/functions/bookings` | Viewing requests and availability use the bookings Edge Function with local fallback. |
| Channel availability sync | `production-service.js` | `supabase/functions/channel-sync` | `/calendar` can connect iCal providers and create occupied blocks for Booking.com/Airbnb/Vrbo style sync. |
| Notifications/preferences | `notification-service.js`, `notification-realtime-service.js` | `supabase/functions/notifications`, Supabase Realtime | Dispatch/list goes through Edge Functions; Realtime subscriptions require deployed DB channels and policies. |
| Stripe/Paystack boosts | `upsell-service.js` | `supabase/functions/payments`, `payments-webhook` | Checkout supports `provider: 'stripe'` or `provider: 'paystack'`; secrets must be configured server-side. |
| Saved searches | `saved-search-service.js` | `supabase/functions/persistence`, table `saved_searches` | Frontend now returns `source: supabase/local` and shows persistence state. |
| Smart match alerts | `product-feature-service.js` | `supabase/functions/persistence`, table `saved_searches` | `/smart-match` turns saved-search intent into alert rules with local fallback. |
| Offer packets/e-sign packets | `offer-service.js` | `supabase/functions/persistence`, tables `offer_packets`, `e_sign_packets` | Frontend now awaits backend persistence and falls back locally when tables/access are not ready. |
| Offer room | `offer-service.js` | `supabase/functions/persistence`, tables `offer_packets`, `e_sign_packets` | `/offer-room` creates packets and stages signature status for later e-sign provider webhooks. |
| Document vault | `product-feature-service.js`, `production-service.js` | `supabase/functions/transactions`, Supabase Storage | `/document-vault` manages transaction documents; real file bytes still need Storage bucket/policies. |
| Agency trust score | `product-feature-service.js` | `supabase/functions/trust` | `/agency/trust-score` displays verification, SLA, accuracy, and dispute signals with local fallback. |
| Field agent mobile app | `product-feature-service.js` | `supabase/functions/agency-crm` | `/mobile/agent` provides phone-first task capture flow; backend can return `field-tasks`. |
| Listing coach | `listing-review-service.js`, `product-feature-service.js` | `supabase/functions/listing-ai` | `/listing-coach` runs the same pre-publish scoring locally and is ready for LLM-backed review. |
| Team invites | `team-invite-service.js` | `supabase/functions/persistence`, table `agency_invitations` | Requires a real `agencyId`/organization access; otherwise falls back locally. |
| Admin audit log | `audit-service.js` | `supabase/functions/persistence`, table `audit_events` | Requires admin role from app metadata. Non-admin users fall back locally. |

## Manual Backend Setup Still Required

- Apply the Supabase migrations in `baytmiftah-backend/supabase/migrations`.
- Deploy Edge Functions in `baytmiftah-backend/supabase/functions`.
- Configure server-side function secrets:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_FEATURED_BOOST_PRICE_ID`
  - `PAYSTACK_SECRET_KEY`
  - `PAYSTACK_FEATURED_BOOST_AMOUNT_GHS`
  - `OPENAI_API_KEY`
  - `OPENAI_LISTING_REVIEW_MODEL`
  - `MAPBOX_ACCESS_TOKEN`
  - `PUBLIC_SITE_URL`
- Create/verify Supabase Storage bucket and policies for `property-media`.
- Confirm Data API exposure/grants for any direct table access if your Supabase project has automatic API exposure disabled.
- Use `app_metadata` for roles such as `platform_admin`, `super_admin`, and agency roles; do not authorize from user-editable metadata.

## Frontend Behavior

The frontend should prefer Supabase-backed responses and explicitly show when it has fallen back to local/demo data. The persistence helpers now return:

```js
{ source: 'supabase', ...payload }
// or
{ source: 'local', error: '...', ...payload }
```

Pages updated to surface this state:

- Explore saved searches
- Smart match alerts
- Property offer/e-sign packet
- Offer room
- Document vault
- Agency trust score
- Mobile field-agent tasks
- Listing coach
- Agency team invites
- Admin audit notes

# BaytMiftah Feature Status and Roadmap

## Not Truly Done Until Backend / Manual Setup

- Deploy the new Edge Functions: `payments`, `bookings`, `listing-ai`, `geo`, `notifications`, `persistence`, `channel-sync`, `payments-webhook`, `messaging`, `transactions`, `moderation`, `intelligence`, and `partner-api`.
- Apply or manually recreate the required Supabase tables, RLS policies, Realtime publication entries, Storage bucket policies, and the security hardening migration.
- Configure provider secrets: `STRIPE_SECRET_KEY`, `STRIPE_FEATURED_BOOST_PRICE_ID`, `PAYSTACK_SECRET_KEY`, `OPENAI_API_KEY`, `MAPBOX_ACCESS_TOKEN`, `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`.
- Verify Stripe and Paystack checkout webhooks before marking boosts as paid.
- Verify OpenAI listing review output against production listing data.
- Verify Mapbox/geocoding provider accuracy for Ghana addresses and GhanaPost GPS.
- Real e-sign provider integration.
- Real WhatsApp Business messaging.
- Push notifications need a web push provider and service-worker subscription flow.
- Production rate limiting/Captcha still needs an external edge or database-backed limiter.
- The new production feature contract migration must be applied for channel sync, billing, messaging, transaction, moderation, and profile-completion tables.
- The new intelligence frontier migration must be applied for concierge sessions, owner reports, neighborhood metrics, developer projects, inspection reports, revenue snapshots, and partner API keys/events.

## Features Already Added

- Route code splitting with lazy-loaded pages.
- Playwright desktop/mobile browser QA.
- Shared loading, retry, error, empty, demo, and offline states.
- Real browser QA scripts and isolated Playwright test port.
- Supabase Storage upload wiring for property media and verification documents.
- Listing draft, submit-for-verification, and publish flow.
- Listing publishing checklist.
- AI listing quality review UI wired to the `listing-ai` Edge Function with local fallback.
- AI listing review function now requires a verified Supabase user before spending provider tokens.
- Agency onboarding progress tracker.
- Agency verification document staging.
- Property verification checklist.
- Lead detail drawer.
- Lead stage changes, notes, tasks, timeline, and quick actions.
- Smart-device command history.
- Admin agency verification filters and risk filters.
- Notification preferences with local/Supabase sync attempt.
- Realtime notification subscription wiring.
- Notification dispatch UI wired to the `notifications` Edge Function with email/SMS provider hooks.
- Notification dispatch now requires auth, blocks non-admin SMS, and prevents non-admin delivery to arbitrary email recipients.
- Role-aware dashboard.
- Viewing request flow and booking service wired to the `bookings` Edge Function.
- Booking writes now require auth and ignore request-body user identity.
- Property comparison page.
- Featured listing boost/subscription upsell UI wired to Stripe and Paystack checkout creation.
- Stripe/Paystack checkout now requires auth, checks listing organization access, and uses server-side pricing.
- Admin trust dashboard.
- Saved searches and buyer alerts wired to the generic `persistence` Edge Function.
- Map-style search mode with price/location filters wired to the `geo` Edge Function.
- Offer submission from property details wired to `persistence`.
- E-sign offer packet status wired to `persistence` until a real e-sign provider is selected.
- WhatsApp agent handoff.
- Team invite flow with roles and permissions wired to `persistence`.
- Admin audit log page wired to `persistence`.
- Persistence writes now require auth and use RLS-backed ownership/admin policies.
- Password reset page and profile completion/security page.
- Booking/channel calendar page with iCal connection and manual availability blocks.
- Billing page for Stripe/Paystack webhook-confirmed payment history.
- Transaction center for document vault, counter-offers, negotiation events, and closing checklist readiness.
- Integrations page for email, SMS, WhatsApp, push templates, and delivery logs.
- Admin moderation queue for listing decisions and trust reason codes.
- Edge Function shells for channel sync, payment webhooks, messaging, transaction workflow, and moderation.
- Agency analytics conversion forecast.
- AI buyer concierge screen wired to the `intelligence` Edge Function with local fallback.
- Owner portal, neighborhood intelligence, developer launch room, inspection app, revenue ops, partner API, verification passport, and property graph screens.
- Dynamic pricing and field inspection service calls wired through the `intelligence` Edge Function.
- Partner API Edge Function shell with hashed API-key lookup and usage event logging.

## Features Still Worth Adding

- Real user roles and permissions backed by Supabase RLS.
- Full listing moderation workflow with assigned reviewers.
- Buyer saved-search notification emails/SMS.
- Agent availability calendar and booking slot management.
- Booking approval, decline, and reschedule flow.
- Offer negotiation thread with counter-offers.
- Document vault for agency, buyer, property, and transaction records.
- Real-time chat between buyer and agent.
- In-app task reminders and due dates.
- Search ranking and recommendation engine backed by real listing/event data.
- Map radius/polygon search with provider-backed neighborhood insights.
- Property valuation estimate and comparable sales.
- Fraud scoring dashboard with reason codes.
- Payment and subscription billing history.
- Public agency profile SEO pages.
- Mobile PWA install support.
- Analytics for listing views, saves, inquiries, tours, offers, and close rate.
- Admin audit export and retention controls.
- Error monitoring and product analytics.
- Production deployment checklist.

## What Would Improve the App Most

1. Deploy and verify the Supabase schema, Storage bucket, RLS policies, and Edge Functions.
2. Add payment webhooks for Stripe and Paystack so checkout results update boost campaigns.
3. Add a real e-sign provider and document envelope lifecycle.
4. Add WhatsApp Business templates and delivery status tracking.
5. Add push notification subscriptions and preference-aware delivery routing.
6. Build agent availability management on top of the booking function.
7. Replace demo auth/local users with Supabase Auth sessions across all protected flows.
8. Clean the git worktree into separate frontend, backend, QA, and legacy-change commits.

# Worktree Change Groups

This repo already had many modified frontend files before the latest enhancement pass.
Use these groups when preparing commits or a PR.

## Frontend Enhancement Batch

- `baytmiftah/src/App.jsx`
- `baytmiftah/src/components/BackendStatusBanner.jsx`
- `baytmiftah/src/components/UI.jsx`
- `baytmiftah/src/components/Navigation.jsx`
- `baytmiftah/src/pages/Bookings.jsx`
- `baytmiftah/src/pages/CompareProperties.jsx`
- `baytmiftah/src/pages/CreateListing.jsx`
- `baytmiftah/src/pages/Dashboard.jsx`
- `baytmiftah/src/pages/ExploreProperties.jsx`
- `baytmiftah/src/pages/Favorites.jsx`
- `baytmiftah/src/pages/MyListings.jsx`
- `baytmiftah/src/pages/Notifications.jsx`
- `baytmiftah/src/pages/ResetPassword.jsx`
- `baytmiftah/src/pages/AccountSecurity.jsx`
- `baytmiftah/src/pages/BookingCalendar.jsx`
- `baytmiftah/src/pages/Billing.jsx`
- `baytmiftah/src/pages/TransactionCenter.jsx`
- `baytmiftah/src/pages/Integrations.jsx`
- `baytmiftah/src/pages/AIConcierge.jsx`
- `baytmiftah/src/pages/OwnerPortal.jsx`
- `baytmiftah/src/pages/NeighborhoodIntelligence.jsx`
- `baytmiftah/src/pages/DeveloperLaunchRoom.jsx`
- `baytmiftah/src/pages/InspectionApp.jsx`
- `baytmiftah/src/pages/RevenueOps.jsx`
- `baytmiftah/src/pages/PartnerPortal.jsx`
- `baytmiftah/src/pages/VerificationPassport.jsx`
- `baytmiftah/src/pages/PropertyGraph.jsx`
- `baytmiftah/src/pages/admin/AuditLog.jsx`
- `baytmiftah/src/pages/admin/TrustDashboard.jsx`
- `baytmiftah/src/pages/admin/ModerationQueue.jsx`
- `baytmiftah/src/pages/admin/AgencyVerification.jsx`
- `baytmiftah/src/pages/agency/AgencyOnboarding.jsx`
- `baytmiftah/src/pages/agency/LeadManagement.jsx`
- `baytmiftah/src/pages/smart-property/DeviceDetails.jsx`
- `baytmiftah/src/services/booking-service.js`
- `baytmiftah/src/services/audit-service.js`
- `baytmiftah/src/services/comparison-service.js`
- `baytmiftah/src/services/geo-service.js`
- `baytmiftah/src/services/listing-review-service.js`
- `baytmiftah/src/services/media-service.js`
- `baytmiftah/src/services/notification-realtime-service.js`
- `baytmiftah/src/services/notification-service.js`
- `baytmiftah/src/services/offer-service.js`
- `baytmiftah/src/services/saved-search-service.js`
- `baytmiftah/src/services/team-invite-service.js`
- `baytmiftah/src/services/upsell-service.js`
- `baytmiftah/src/services/production-service.js`
- `baytmiftah/src/services/frontier-service.js`

These cover route code splitting, data-state primitives, demo/offline banners,
progress/checklist UI, notification preferences, admin filters, lead detail drawer,
smart-device command history, Storage upload wiring, role-aware dashboards, and
listing/agency verification document staging. The latest feature pass also adds
AI-style listing quality review, viewing requests, buyer comparison, realtime
notification subscription, featured listing upsells, and an admin trust dashboard.
The latest local-first batch adds saved searches/alerts, map search controls,
offer/e-sign packets, WhatsApp handoff, team invite permissions, audit logs, and
conversion forecasts. The latest function-wiring pass connects those local-first
flows to Edge Function wrappers for persistence, AI review, geocoding, checkout,
bookings, and notification dispatch while preserving local fallbacks. The
production-readiness pass adds password recovery, profile completion/security,
channel calendars, billing history, transaction workflows, integration delivery
logs, and admin moderation surfaces.
The intelligence-frontier pass adds AI concierge, owner reporting, neighborhood
intelligence, developer launch, inspection, revenue ops, partner API,
verification passport, and property graph screens with local fallbacks.

## Browser QA Batch

- `baytmiftah/playwright.config.js`
- `baytmiftah/src/e2e/app.spec.js`
- `baytmiftah/package.json`
- `baytmiftah/package-lock.json`
- `baytmiftah/vitest.config.js`
- `.gitignore`

These add Playwright smoke coverage for desktop/mobile layout, login, navigation,
create listing, admin empty/review states, unknown-route recovery, and ignored
Playwright run artifacts.

## Supabase Backend Batch

- `baytmiftah-backend/SUPABASE_DEPLOYMENT_STATUS.md`
- `baytmiftah-backend/scripts/`
- `baytmiftah-backend/supabase/config.toml`
- `baytmiftah-backend/supabase/functions/bookings/`
- `baytmiftah-backend/supabase/functions/geo/`
- `baytmiftah-backend/supabase/functions/listing-ai/`
- `baytmiftah-backend/supabase/functions/notifications/`
- `baytmiftah-backend/supabase/functions/payments/`
- `baytmiftah-backend/supabase/functions/persistence/`
- `baytmiftah-backend/supabase/functions/channel-sync/`
- `baytmiftah-backend/supabase/functions/payments-webhook/`
- `baytmiftah-backend/supabase/functions/messaging/`
- `baytmiftah-backend/supabase/functions/transactions/`
- `baytmiftah-backend/supabase/functions/moderation/`
- `baytmiftah-backend/supabase/functions/intelligence/`
- `baytmiftah-backend/supabase/functions/partner-api/`
- `baytmiftah-backend/supabase/migrations/`
- `.gitignore`

These add the Edge Function schema contract, deployment safety scripts, Supabase
target diagnostics, local migration-history placeholders, and ignored Supabase
CLI temp files. The latest migration adds the `property-media` Storage bucket,
upload policies, listing workflow columns, and notification preference tables.
A follow-up migration adds viewing requests, property comparison sets, realtime
publication entries, and trust queue metadata. The function-wiring pass adds
manual-deploy Edge Function shells for Stripe/Paystack checkout, viewing
requests, OpenAI listing review, Mapbox geocoding, notification delivery, and
generic persistence for saved searches, offers, audit logs, team invites, and
e-sign packet status. The security hardening pass adds shared Edge Function
input/access helpers, authenticated payment/notification/persistence/AI writes,
server-side boost pricing, ownership checks, CORS origin configuration, and the
`20260608004752_harden_security_contract.sql` RLS migration. The
production-readiness backend pass adds channel sync, payment webhooks, messaging,
transaction workflow, moderation function shells, and the
`20260608011240_add_production_feature_contract.sql` migration.
The intelligence-frontier backend pass adds the `intelligence` and `partner-api`
function shells plus the `20260608080956_add_intelligence_frontier_contract.sql`
migration for AI sessions, owner reports, neighborhood data, developer projects,
inspections, revenue snapshots, and partner API events.

## Pre-Existing Or Unrelated Changes

Git status currently shows many additional modified frontend files and `.env` as
deleted. Do not include those in the enhancement commit unless they are reviewed
and intentionally grouped.

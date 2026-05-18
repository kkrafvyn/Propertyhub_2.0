# BaytMiftah V4 Checklist Status

BaytMiftah is the permanent app name. The v4 project plan is being implemented as a Ghana and diaspora real estate operating system with subscription SaaS, marketplace, Paystack/Stripe escrow lanes, internal cryptographic integrity, and a Smart Property Access layer.

Distributed payment and verification features are removed. Trust proof now uses SHA-256 records, append-only audit rows, optional RSA signatures, receipts, admin review, and payment processor records.

## Current Status

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 SaaS Core | Complete locally | Auth, org onboarding, Paystack subscription setup, workspace activation gate, billing recovery states, team invites, seat limits, admin org verification, and billing screens are wired. |
| Phase 2 Marketplace | Complete locally | Listings, public discovery, inquiries, lead workflows, viewings, messaging, favorites, reporting, listing moderation, analytics surfaces, and mobile shell coverage are in place. |
| Phase 3 Escrow + Trust | Complete locally | Paystack and Stripe-ready escrow lanes, document gates, admin review, payer confirmation, disputes, release/refund, watermarked document review, public receipts, rate limits, and integrity audit foundations are wired. |
| Phase 4 Smart Property Access | Foundation complete locally | Device registry, access grants, viewing-confirmed hook, user access view, workspace access view, provider command Edge Function, command audit rows, and device health sync hooks are wired. Provider API credentials still remain server-side production setup. |

## Done From V4

| Module | Done |
| --- | --- |
| A Authentication | Email auth, reset, organization account creation, MFA status, session visibility, RBAC, workspace routing. |
| B SaaS billing | Ghana Paystack subscription lane, tier seeds, activation on payment, billing history, cancellation/grace/suspension model, seat enforcement, org profile/docs. |
| C Team management | Invites, acceptance, roles, role changes, deactivation, profiles, pending invites, performance surfaces. |
| D Listings | Create/edit/archive/duplicate, media, visibility states, duplicate checks, listing caps. |
| E Leads | Inquiry capture, auto assignment, reassignment, statuses, notes, timeline, reminders, source tracking. |
| F Viewings | Requests, approval/reschedule/cancel/complete, notifications, calendar queue, attendance/no-show workflows. |
| G Messaging | Inquiry threads, realtime messages, unread counts, attachments-ready storage patterns, manager takeover, private notes. |
| I Marketplace | Browse, search filters, detail pages, agency profiles, favorites, verified agency badge, report listing, recently viewed, share links. |
| J Notifications | In-app and email infrastructure for billing, admin, workspace, viewing, and escrow events. |
| K Analytics | Workspace dashboard, listing/agent metrics, inquiry funnel, admin metrics, date-filter foundations. |
| N Admin baseline | `platform_admins` access, org queue, verification, suspension, users, listings, metrics, audit feed. |

## Added In This V4 Slice

| Item | Implementation |
| --- | --- |
| PaymentService abstraction | `supabase/functions/_shared/payment-service.ts` centralizes escrow initiation, release, refund, and Stripe subscription checkout helpers. |
| Stripe-ready payment lane | Schema now allows Stripe for property payments, refunds, and subscriptions, with server-only Stripe helpers. |
| Unified signed webhook router | `payment-webhook` validates Paystack and Stripe signatures, records idempotency rows, and routes events to subscription/payment reconciliation. |
| Integrity audit log | `integrity_audit_log` stores SHA-256 payload hashes, previous hash, chain hash, and optional RSA signature. A trigger rejects updates/deletes. |
| Public anchoring foundation | `integrity_anchors` records checkpoint hashes and `anchor-integrity-audit` can publish weekly GitHub anchor files when configured. |
| Rate-limit foundation | `edge_rate_limit_events` and `enforceRateLimit` support throttling sensitive Edge Function routes. |
| Escrow document watermark metadata | Approved escrow documents can store BaytMiftah watermark text, watermarked SHA-256, and the related integrity audit row. |
| Public verification receipts | Payment receipts can publish tokenized verification pages with receipt hashes and safe public payloads. |
| Condition reports | Agent and tenant move-in reports can be saved with private photos, hashed, viewed, and acknowledged. |
| Smart Property Access | IoT provider-neutral tables, services, workspace UI, user UI, viewing hook, provider command Edge Function, device sync, and revocation flow are in place. |
| Guided onboarding | Workspace dashboard now shows profile, payout, verification, team, listing, and Smart Access setup progress. |
| Public verification key | `public-verification-key` publishes the RSA public key when the production key is configured. |
| Printable receipts | Public verification pages can print or save receipts as PDF from the browser. |

## Still Left

| Item | Remaining Work |
| --- | --- |
| Stripe production activation | Configure live Stripe price IDs, Connect accounts, and webhook endpoint in production. |
| Paystack production activation | Configure live plans, transfer recipients, and webhook endpoint in production. |
| Provider credentials | Add TTLock, Yale, and Tuya command endpoints/tokens server-side before live device commands. |
| Scheduled anchoring | Point a weekly cron to `anchor-integrity-audit` with `ANCHOR_JOB_SECRET`. |
| Sandbox certification | Run Paystack/Stripe sandbox event tests once live provider dashboards are configured. |
| Legal and operations review | Finalize escrow fee, FX treatment, refund procedures, and device support policy. |

## Open Decisions

| Decision | Recommendation |
| --- | --- |
| Escrow fee | Start with 1% to 2%, configurable per org or tier. |
| Diaspora FX risk | Lock rate at payment time and show it on the receipt. |
| IoT hardware | BYOD with certified providers: TTLock, Yale, Tuya. |
| Stripe currencies | Start with USD and GBP; add EUR after first diaspora validation. |
| RSA key storage | Store private key only in server env or vault, never frontend or public tables. |

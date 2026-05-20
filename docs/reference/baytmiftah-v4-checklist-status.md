# BaytMiftah V4 Checklist Status

BaytMiftah is the permanent app name. The v4 project plan is being implemented as a Ghana and diaspora real estate operating system with subscription SaaS, marketplace, Paystack/Stripe/Flutterwave escrow lanes, internal cryptographic integrity, and a Smart Property Access layer.

Distributed payment and verification features are removed. Trust proof now uses SHA-256 records, append-only audit rows, optional RSA signatures, receipts, admin review, and payment processor records.

## Current Status

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 SaaS Core | Complete locally | Auth, org onboarding, provider-neutral subscription checkout with Paystack fallback, workspace activation gate, billing recovery states, team invites, seat limits, admin org verification, and billing screens are wired. |
| Phase 2 Marketplace | Complete locally | Listings, public discovery, map-based search with live provider tiles, inquiries, lead workflows, viewings, messaging, favorites, reporting, listing moderation, analytics surfaces, and mobile shell coverage are in place. |
| Phase 3 Escrow + Trust | Complete locally | Paystack, Stripe, and Flutterwave-ready escrow lanes, document gates, admin review, payer confirmation, disputes, release/refund, watermarked document review, public receipts, rate limits, and integrity audit foundations are wired. |
| Phase 4 Smart Property Access | Foundation complete locally | Device registry, access grants, viewing-confirmed hook, user access view, workspace access view, provider command Edge Function, command audit rows, device health sync hooks, and commercial property IoT device classes are wired. Provider API credentials still remain server-side production setup. |

## Done From V4

| Module | Done |
| --- | --- |
| A Authentication | Email auth, reset, organization account creation, MFA status, session visibility, RBAC, workspace routing. |
| B SaaS billing | Paystack, Stripe, and Flutterwave subscription checkout lanes, Paystack fallback, tier seeds, activation on payment, billing history, cancellation/grace/suspension model, seat enforcement, org profile/docs. |
| C Team management | Invites, acceptance, roles, role changes, deactivation, profiles, pending invites, performance surfaces. |
| D Listings | Create/edit/archive/duplicate, media, visibility states, duplicate checks, listing caps, and expanded property categories for warehouses, car parks, and office complexes. |
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
| PaymentService abstraction | `supabase/functions/_shared/payment-service.ts` centralizes escrow initiation, release, and refund for Paystack, Stripe, and Flutterwave, plus Stripe subscription checkout helpers. |
| Stripe-ready payment lane | Schema now allows Stripe for property payments, refunds, and subscriptions, with server-only Stripe helpers. |
| Flutterwave-ready payment lane | Schema now allows Flutterwave refunds and escrow release metadata, with server-only checkout, verification, transfer, refund, and webhook helpers. |
| Provider-neutral SaaS subscriptions | Organization onboarding can request Paystack, Stripe, or Flutterwave; the Edge Function selects the first configured provider and records fallback attempts before redirecting to checkout. |
| Payment gateway fallback | Property checkout now tries the selected provider first, then configured fallback gateways. With only Paystack keys configured, Stripe and Flutterwave selections fall back to Paystack instead of failing checkout. |
| Unified signed webhook router | `payment-webhook` validates Paystack, Stripe, and Flutterwave signatures, records idempotency rows, and routes events to subscription/payment reconciliation. |
| Integrity audit log | `integrity_audit_log` stores SHA-256 payload hashes, previous hash, chain hash, and optional RSA signature. A trigger rejects updates/deletes. |
| Public anchoring foundation | `integrity_anchors` records checkpoint hashes and `anchor-integrity-audit` can publish weekly GitHub anchor files when configured. |
| Rate-limit foundation | `edge_rate_limit_events` and `enforceRateLimit` support throttling sensitive Edge Function routes. |
| Escrow document watermark metadata | Approved escrow documents can store BaytMiftah watermark text, watermarked SHA-256, and the related integrity audit row. |
| Public verification receipts | Payment receipts can publish tokenized verification pages with receipt hashes and safe public payloads. |
| Condition reports | Agent and tenant move-in reports can be saved with private photos, hashed, viewed, and acknowledged. |
| Smart Property Access | IoT provider-neutral tables, services, workspace UI, user UI, viewing hook, provider command Edge Function, device sync, and revocation flow are in place. |
| Public map discovery | Search and property detail now use a live tile-map provider with listing pins, Ghana overview fallback, and external map handoff. |
| Commercial property expansion | Warehouses, car parks, and office complexes are first-class categories across onboarding, workspace listings, public search, AI parsing, and database constraints. |
| Commercial IoT device expansion | Smart Access supports parking gates, dock doors, warehouse sensors, occupancy counters, and CCTV links, with viewing access grants able to target parking gates and dock doors. |
| Guided onboarding | Workspace dashboard now shows profile, payout, verification, team, listing, and Smart Access setup progress. |
| Public verification key | `public-verification-key` publishes the RSA public key when the production key is configured. |
| Printable receipts | Public verification pages can print or save receipts as PDF from the browser. |
| Release hardening | Playwright smoke coverage, Vite/Vercel CSP and security headers, stronger production env checks, and the local `qa:local` browser-inclusive release gate are wired. |
| Launch readiness control plane | Remaining workstreams now have auditable tables, service helpers, seeded checklist items, provider readiness rows, sandbox evidence tracking, backup drill evidence, compliance evidence, official verification checks, hyperlocal data source readiness, community contribution queues, affordability plan review, AI score review, referral reward ledger, advanced fraud signals, construction progress updates, contributor payout controls, and an admin launch-readiness console. |
| Competitive engagement layer | Moderated listing/agency/project/vendor/deal reviews, review abuse reports, saved-search price-drop rules, social sharing, finance snapshots, rich media links, marketplace pulse, and AI listing draft helper are wired without external chain dependencies. |
| Competitive operations layer | Document template drafts, calendar export readiness, explainable trust signals, agency trust score, smart comparison recommendation, WhatsApp alert readiness, Ghana Card/manual registry checklist, owner reporting snapshot, referral reward status labels, neighborhood Q&A prompts, human-reviewed fraud signal helpers, investment score preview, affordability guardrails, construction readiness, and contributor monetization preview are wired as gated product surfaces. |

## Competitive Advantage Handoff Status

These items came from the Ghana-first competitive moat handoff. Anything that references external chain infrastructure has been converted to internal audit hashes, receipts, official registry checks, and signed verification records.

| Advantage Area | Current Repo Status | Still Needed |
| --- | --- | --- |
| Hyperlocal intelligence | Partly done. Area guides, market trends, flood-risk fields, location insights, backup-power/water prompts, and neighborhood context are visible across public and workspace flows. | Production data sources for drainage, flood incidents, power/water reliability, transit stops, safety signals, and commercial density. |
| Ghana trust layer | Partly done. Organization verification, listing reports, Ghana Trust Center, buyer verification requests, Ghana Card/manual registry readiness checklist, agency trust score, document review, fraud triage, and verification receipts are wired. | Ghana Card OCR/liveness provider, official business/tax checks, consented identity workflows, and a privacy impact review before facial recognition. |
| Payment resilience | Done locally for property checkout, SaaS subscription checkout, escrow release, and refunds. Checkout tries the selected gateway first, then configured fallback gateways, with Paystack live while Stripe/Flutterwave keys are absent. | Production credentials, sandbox certification, provider incident runbooks, and final fallback order approval. |
| Affordability payments | Foundation upgraded. Multi-currency and escrow lanes exist, and buyer dashboards now explain affordability-plan guardrails before any weekly/daily/BNPL feature can go live. | Provider contracts, weekly/daily rent plans, USSD payment support, BNPL/lender partnerships, and legal review so BaytMiftah does not accidentally operate as an unlicensed lender. |
| Community layer | Foundation upgraded. Public area guides, referral surfaces, neighborhood Q&A prompts, emergency-alert readiness, local-guide prompts, and community contribution queues exist. | Live neighborhood chats, broadcast permissions, contributor moderation operations, and abuse escalation SLAs. |
| Hyperlocal AI | Foundation upgraded. Valuation, trends, listing quality, neighborhood intelligence, and buyer-side investment score previews exist as product shells/helpers. | Ghana-trained data pipeline, model governance, explainability, approved investment score methodology, and human review for regulated or high-stakes recommendations. |
| SMS/offline-first | Partly done. Mobile offline queue/sync, notification dispatch foundations, and WhatsApp alert readiness UI exist. | SMS booking commands, USSD handoff, local-language message templates, provider short code setup, approved WhatsApp templates, and feature-phone journeys. |
| Verifiable property history | Partly done without external chain dependencies. Sold ledger, payment receipts, document hashes, and integrity audit records exist. | Land Registry/Lands Commission checks where available, ownership-chain display, dispute/mortgage status verification, and counsel-approved disclaimers. |
| Agent empowerment | Strong foundation. Team management, lead routing, performance metrics, client/deal surfaces, workspace operations, owner reporting readiness, document template drafts, and calendar export readiness are in place. | White-label packaging, deeper commission tracking, live Google/Outlook OAuth, and bank/FX integrations for commissions. |
| Construction intelligence | Partly done. Projects, public project discovery pages, and construction readiness cards exist for progress, confidence, and buyer-monitoring checklists. | Construction progress photos, developer verification, completion forecasts, presale investor workflows, and change logs. |
| Investment data | Partly done. Market trends, sold ledger, valuation estimate, neighborhood metrics, buyer-side investment score previews, and smart comparison recommendations exist. | Verified comparable transactions, bank/appraisal inputs, rental yield database, and production confidence scoring. |
| Referral engine | Partly done. Referral attribution service, referral metadata, referral performance panels, mobile referral links, reward ledger foundation, reward status display helpers, and contributor monetization preview exist. | Payout approval operations, fraud checks, terms, and accounting treatment. |
| Fraud prevention | Partly done. Admin fraud dashboard, moderation cases, suspicious listing reports, duplicate checks, listing quality checks, rate-limit foundation, audit events, image-auth readiness, and human-reviewed fraud signal helpers exist. | Device fingerprinting, live image authenticity provider, identity liveness, sanctions/PEP vendor review, and production incident response. |
| User monetization | Foundation upgraded. Referral attribution, contribution readiness tables, and contributor monetization preview are wired. | Paid area guides, contributor review operations, photography marketplace, payout/tax handling, and content quality controls. |

## Still Left

| Item | Remaining Work |
| --- | --- |
| Stripe production activation | Configure live Stripe price IDs, Connect accounts, secrets, and webhook endpoint in production. |
| Flutterwave production activation | Configure live Flutterwave secret, webhook secret hash, subscription payment plan IDs, beneficiary or bank payout details, and webhook endpoint in production. |
| Paystack production activation | Configure live plans, transfer recipients, and webhook endpoint in production. |
| Provider credentials | Add TTLock, Yale, Tuya, parking-gate, dock-door, occupancy, and CCTV provider endpoints/tokens server-side before live device commands. |
| Scheduled anchoring | Point a weekly cron to `anchor-integrity-audit` with `ANCHOR_JOB_SECRET`. |
| Sandbox certification | Run Paystack/Stripe sandbox event tests once live provider dashboards are configured. |
| Legal and operations review | Local readiness/evidence tracking is wired. Finalize escrow fee, FX treatment, refund procedures, and device support policy with counsel/ops signoff before public launch. |
| CI/CD remote verification | First-pass GitHub Actions CI is configured locally for install, typecheck, tests, build, release readiness, and audit. Push the branch and confirm the GitHub run passes before treating CI as complete. |
| Broader browser regression coverage | Core Playwright smoke now covers auth, listing search/detail, buyer requests, workspace billing, admin escrow, and mobile widths. Expand into deeper checkout/provider return paths and CRUD regressions as needed. |
| Competitive moat integrations | App-side readiness, review records, price-drop alerts, finance widgets, rich media, smart compare, agency trust score, WhatsApp readiness, Ghana Card/manual registry readiness, owner reporting readiness, document templates, calendar export readiness, community prompts, human-reviewed fraud signals, investment preview, affordability guardrails, construction readiness, and contributor monetization preview are wired. Add production providers/data sources for hyperlocal intelligence, Ghana Card verification, SMS/USSD, official registry checks, and community moderation. |
| Launch-readiness admin operations | `/admin/launch` now shows readiness percent, critical blockers, workstream items, provider go-live checks, admin status actions, and evidence attachment for gated production workstreams. |
| Compliance signoff | Replace generated compliance assumptions with counsel-reviewed launch rules for data protection, escrow/payment operations, property verification, SMS, AI, and IoT. |

## Open Decisions

| Decision | Recommendation |
| --- | --- |
| Escrow fee | Start with 1% to 2%, configurable per org or tier. |
| Diaspora FX risk | Lock rate at payment time and show it on the receipt. |
| IoT hardware | BYOD with certified providers: TTLock, Yale, Tuya. |
| Stripe currencies | Start with USD and GBP; add EUR after first diaspora validation. |
| Gateway fallback order | Keep Paystack as the live fallback until Stripe and Flutterwave credentials are configured; then approve final provider priority by currency and incident-response rules. |
| RSA key storage | Store private key only in server env or vault, never frontend or public tables. |

## Scan Corrections

| Claim From External Scan | Actual Repo Status |
| --- | --- |
| Edge Functions missing | Incorrect. Supabase Edge Functions exist for subscriptions, property payments, webhooks, escrow, smart access, notifications, anchoring, and refunds. |
| Realtime missing | Partly incorrect. Messaging has Supabase Realtime channels; broader realtime dashboards can still be expanded later. |
| CI/CD missing | Was correct before this slice. A local `.github/workflows/ci.yml` now exists, but the remote GitHub run still needs to pass after push. |
| Workspace detail pages missing | Mostly outdated. Core workspace pages exist; several old expansion pages were intentionally removed or hidden to keep the Phase 1/2 product focused. |
| Testing only 20% | Outdated. Local QA currently covers 40 test files and 192 tests, plus Playwright browser smoke for auth, marketplace, buyer requests, workspace billing, admin escrow, admin launch readiness, and mobile widths. |
| Map integration missing | Outdated. Public search and property detail now use a live tile-map provider with verified listing pins and Ghana overview fallback when coordinates are missing. |

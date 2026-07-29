# BaytMiftah — App Overview & Roadmap

**BaytMiftah** (بيت مفتاح — “house of keys”) is a Ghana-first Real Estate Operating System (REOS) built to become the **default property infrastructure for West Africa and beyond**. It combines a public property marketplace, consumer journeys (buy, rent, lease, short stay), professional workspace tools for agencies and landlords, and a platform admin console in one product.

### Mission

Give every person and property business in emerging markets a **trusted, end-to-end digital home** — from discovery to keys in hand — without juggling WhatsApp, spreadsheets, and disconnected payment apps.

### Long-term aim

1. **Ghana launch** → prove product-market fit (live today)
2. **West Africa expansion** → Nigeria, Côte d'Ivoire, Senegal (payments + agencies)
3. **Pan-African scale** → Kenya, South Africa, multi-currency operations
4. **Global diaspora** → buyers and renters abroad investing in African property
5. **Infrastructure maturity** → progressive migration to AWS for scale, compliance, and regional AI

| | |
|---|---|
| **Production** | [https://www.baytmiftah.com](https://www.baytmiftah.com) |
| **Stack** | React 18 · TypeScript · Vite · Supabase · Vercel |
| **Mobile** | PWA + Capacitor (Android / iOS) |
| **AI** | Integrated — guided help live; OpenAI optional ([guide](./AI_INTEGRATION.md)) |
| **Brand** | Arc + dot mark (not a house icon) |

---

## Table of contents

1. [What the app does](#what-the-app-does)
2. [System architecture](#system-architecture)
3. [User roles & UI surfaces](#user-roles--ui-surfaces)
4. [Feature modules (current state)](#feature-modules-current-state)
5. [Integrations](#integrations)
6. [Environment & deployment](#environment--deployment)
7. [Product roadmap](#product-roadmap)
8. [Related documentation](#related-documentation)

---

## What the app does

BaytMiftah is **not** a simple listings website. It is an operating system for real estate:

| Audience | What they get |
|---|---|
| **Consumers** | Search, save, message, book stays, apply for rent/lease, make purchase offers, pay, manage leases, maintenance, documents, and wallet |
| **Landlords & agencies** | Multi-org workspace: listings, leads, CRM, calendar, payments, team, compliance, automation, AI tools |
| **Platform admins** | User/org moderation, trust & KYC review, listings oversight, support queue |

### Strategic focus

1. Finding property (marketplace + search + maps)
2. Renting, leasing, and booking short stays
3. Completing transactions (escrow, wallets, Paystack/Stripe)
4. Managing property and smart-building features
5. Running agency operations (CRM, team, workflows)
6. Adjacent financial services (mortgage, insurance — planned)

**Out of scope (consumer):** investment analytics (ROI, cap rate, portfolio tracking). These may return later as an enterprise add-on. See [PRODUCT_DIRECTION.md](./PRODUCT_DIRECTION.md).

---

## System architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│  Clients                                                         │
│  Web (Vite/React) · PWA · Capacitor Android/iOS                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Vercel — static hosting + edge CDN                              │
│  baytmiftah.com                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ VITE_* env (client)
┌────────────────────────────▼────────────────────────────────────┐
│  Supabase                                                        │
│  · PostgreSQL + RLS                                              │
│  · Auth (email, phone OTP, Google/Apple OAuth)                 │
│  · Realtime (chat, notifications)                                │
│  · Storage (property-media, documents, receipts)                 │
│  · Edge Functions (payments, webhooks, automations)            │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  External services                                               │
│  Paystack · Stripe · Resend · OpenAI · Web Push (VAPID)        │
│  Google Maps · MLS syndication (optional) · Blockchain (later)   │
└─────────────────────────────────────────────────────────────────┘
```

### Repository layout

```text
src/
├── app/
│   ├── pages/           # Route-level screens (Home, Search, Dashboard, Workspace, Admin)
│   ├── components/      # Shared UI (DesktopShell, chat, settings, etc.)
│   ├── context/         # Auth, Market (location onboarding), Locale
│   ├── lib/             # Role routing, consumer nav, workspace permissions
│   ├── mobile/          # Mobile shell, bottom tabs
│   └── routes.tsx       # React Router 7 config
├── lib/                 # Services (listing, payment, org, deal case, wallet, …)
supabase/
├── migrations/          # Schema + RLS
└── functions/           # Edge functions (paystack-*, stripe-*, webhooks)
docs/                    # This file and setup/deployment guides
```

### Key routes

| Route | Purpose | Auth |
|---|---|---|
| `/` | Home / mobile discovery feed | Public |
| `/search` | Property search & filters | Public |
| `/property/:id` | Listing detail, inquiry, booking | Public |
| `/compare` | Side-by-side listing compare | Public |
| `/login`, `/signup` | Authentication | Public |
| `/app/*` | Consumer hub (saved, messages, leases, wallet, …) | Required |
| `/workspace` | Workspace entry / org picker | Required |
| `/workspace/:slug/:page` | Agency operations dashboard | Required |
| `/admin/*` | Platform administration | Platform admin |

Legacy paths (`/host`, `/agent`, `/offers`, etc.) redirect to canonical routes via `LegacyRouteRedirect`.

---

## User roles & UI surfaces

BaytMiftah uses **two role layers**:

### 1. App-level roles (`user_metadata.role`)

Set at signup or via auth metadata. Controls post-login redirect and consumer vs pro navigation.

| Role | Default home after login | Primary UI |
|---|---|---|
| `consumer` | `/app` | Consumer dashboard + marketplace |
| `host` | `/workspace` | Workspace + consumer account |
| `agent` | `/workspace` | Workspace + consumer account |
| `admin` / `platform_admin` | `/admin` | Admin console (requires `is_platform_admin` or admin role) |

Signup mapping: **User** → `consumer` · **Landlord** → `host`.

### 2. Workspace org roles (`organization_members.role`)

Per-organization permissions inside `/workspace/:slug`. Nav and write actions are filtered by role.

| Org role | Access summary |
|---|---|
| **owner** | Full workspace: listings, finance, team, settings, automation |
| **manager** | Same as owner for day-to-day ops (team/settings gated on some pages) |
| **agent** | Listings, leads, contacts, tasks, calendar — no team management |
| **analyst** | Read-only: listings, finance, analytics, contacts/tasks (view only) |

Permission matrix: `src/lib/workspace-permissions.ts`  
Nav filtering: `src/app/lib/workspace-role-nav.ts`  
Post-auth routing: `src/app/lib/auth-routing.ts`

### UI shells (what users actually see)

| Surface | Component | Used by |
|---|---|---|
| Marketplace | `DesktopShell` | Home, Search, Property detail |
| Consumer hub | `UserDashboard` (`/app`) | All authenticated consumers |
| Mobile home | `MobileAppShell` | Phone users on `/` |
| Workspace | `WorkspaceLayout` | Org members |
| Admin | `AdminLayout` | Platform admins |
| Auth | `AuthShell` | Login, Signup |

> **Note:** Older `*Shell` components (`HostShell`, `AgentShell`, etc.) are legacy wrappers and are **not** wired to routes. Live UI uses the layouts above.

### Consumer capabilities

Capabilities unlock contextual navigation (trips, leases, offers, host workspace links) based on live account context:

- Active short-stay bookings → trips / reservations
- Active leases → payments / maintenance / my home
- Active purchase offers → applications / transactions / documents
- Host/agent app role → workspace shortcuts

Defined in `src/app/lib/baytmiftah/capabilities.ts`.

### Location onboarding

Users choose a market on first visit. Listings, search defaults, and mobile home content personalize to that market (`MarketContext`, `user-market.service.ts`).

---

## Feature modules (current state)

Status as of **July 2026** production deployment.

| Module | Status | Notes |
|---|---|---|
| **Marketplace** | ✅ Live | Search, filters, maps, compare, agency cards |
| **Listing detail** | ✅ Live | Inquiry → deal case + shared inbox |
| **Authentication** | ✅ Live | Email/password, phone OTP, OAuth plumbing |
| **Consumer dashboard** | ✅ Live | Saved, messages, applications, viewings, wallet |
| **Short-stay booking** | ✅ Live | Trips, reservations, host workspace |
| **Tenant portal** | ✅ Live | Leases, payments, maintenance |
| **Workspace / CRM** | ✅ Live | Listings, leads, contacts, tasks, calendar, team |
| **Payments** | ✅ Partial | Paystack live; Stripe wired, keys pending |
| **Escrow & wallet** | ✅ MVP | Ledger, holds, payout requests |
| **Admin console** | ✅ Live | Users, orgs, listings, moderation, trust |
| **i18n** | ✅ Partial | 12+ locales; onboarding translated for 11 |
| **Mobile PWA** | ✅ Live | Bottom tabs, offline listing cache |
| **Capacitor native** | ✅ Scaffolded | Android/iOS builds; store links TBD |
| **AI assistant** | ✅ Integrated | Panels on home, search, property, consumer, workspace; works without keys |
| **Smart property** | 🟡 Beta | Resident home, IoT hooks in workspace |
| **Blockchain verification** | ⏸ Deferred | Contracts documented; deploy when ready |
| **MLS syndication** | 🟡 Optional | Integration hub UI; API keys optional |
| **Email (Resend)** | 🟡 Wired | `RESEND_API_KEY` not yet set |
| **Investment analytics** | ❌ Removed | Out of consumer scope |

---

## Integrations

All secrets live in a **single root `.env`** file (see `.env.example`). Client keys use the `VITE_` prefix.

| Service | Purpose | Status |
|---|---|---|
| **Supabase** | Database, auth, storage, edge functions | ✅ Required |
| **Vercel** | Production hosting | ✅ Live |
| **Paystack** | Ghana/Africa payments | ✅ Live (public + secret + webhook) |
| **Stripe** | Card payments | 🟡 Keys empty — run `integrations:wire` after adding |
| **Resend** | Transactional email | 🟡 Keys empty |
| **Web Push (VAPID)** | Browser notifications | ✅ Generated via `integrations:wire` |
| **Google / Apple OAuth** | Social login | 🟡 Enable in Supabase dashboard — [OAUTH_SETUP.md](./setup/OAUTH_SETUP.md) |
| **OpenAI** | AI chat & smart search | ✅ Integrated (keys optional) |
| **Google Maps** | Property maps | ✅ Client key in use |
| **Twilio** | SMS / WhatsApp | ⏸ Skipped |
| **MLS / Zillow / Realtor** | Listing syndication | ⏸ Optional |
| **Blockchain** | On-chain verification | ⏸ Deferred — see [blockchain/](./blockchain/) |

### Wire integrations after adding keys

```bash
npm run integrations:wire
npm run supabase:deploy:payments -- --skip-db
npx vercel --prod
```

---

## Environment & deployment

| Task | Command / doc |
|---|---|
| Local dev | `npm install` → copy `.env.example` to `.env` → `npm run dev` |
| Tests | `npm test` (Vitest) · `npm run test:e2e` (Playwright) |
| DB types | `npm run db:types` |
| **Backup data** | `npm run backup` |
| Deploy web | `npx vercel --prod` |
| Deploy edge functions | `npm run supabase:deploy:payments -- --skip-db` |

**Guides:**

- [SUPABASE_SETUP.md](./setup/SUPABASE_SETUP.md)
- [OAUTH_SETUP.md](./setup/OAUTH_SETUP.md)
- [DEPLOYMENT_GUIDE.md](./deployment/DEPLOYMENT_GUIDE.md)
- [PRODUCTION_CHECKLIST.md](./deployment/PRODUCTION_CHECKLIST.md)
- [MOBILE_SETUP.md](./deployment/MOBILE_SETUP.md)

---

## Product roadmap

### ✅ Recently completed

- BaytMiftah rebrand (arc + dot logo, production favicons)
- Unified `.env` for client + server secrets
- Location-based market onboarding
- Role-optimized navigation (consumer, host, workspace org roles, admin)
- Paystack production wiring
- Onboarding i18n (11 locales)
- Production deploy to baytmiftah.com

### 🔜 Near term (next 2–4 weeks)

| Priority | Item | Why |
|---|---|---|
| **P0** | Add **Resend** API key | Password reset, booking confirmations, payment receipts |
| **P0** | Add **Stripe** keys | International card payments |
| **P1** | Enable **Google / Apple OAuth** in Supabase | Faster signup, lower friction |
| **P1** | **KYC verification** flow completion | Trust center, Ghana compliance |
| **P1** | Mobile workspace entry | Dedicated pro shortcuts on small screens |
| **P2** | Mortgage marketplace UI | Purchase journey completion |
| **P2** | Insurance marketplace UI | Adjacent financial services |
| **P2** | Vendor marketplace | Maintenance vendor assignments |
| **P2** | Subscription billing (Pro / Enterprise) | Monetization |

### 📅 Medium term (1–3 months)

| Area | Plans |
|---|---|
| **Trust & reputation** | Review system, verified host badges, fraud scoring improvements |
| **AI** | Pricing suggestions, maintenance triage, lead scoring (requires `OPENAI_API_KEY`) |
| **Smart property** | Door access, utilities, building announcements for residents |
| **Developer platform** | Public API, webhooks, partner integrations |
| **Enterprise** | White-label, multi-org insights, custom workflows (UI exists, harden + billing) |
| **MLS** | Automated syndication when `MLS_API_KEY` provided |
| **Native apps** | App Store / Play Store submission with Capacitor builds |

### ⏸ Deferred (by decision)

| Item | Notes |
|---|---|
| **Blockchain mainnet** | Testnet contracts documented in `docs/blockchain/`; user chose to add later |
| **Investment module** | ROI, portfolio, cap rate — enterprise-only if revived |
| **Twilio SMS** | Skipped for now; email + in-app notifications preferred |
| **Flutterwave** | Removed from app; Paystack + Stripe primary |

### 🎯 Long-term vision

BaytMiftah aims to be the **default REOS for West Africa**, then expand internationally:

1. **Discover** — best-in-class search, maps, and AI recommendations  
2. **Transact** — escrow-backed rent, lease, and purchase flows  
3. **Operate** — full agency ERP in the browser  
4. **Trust** — KYC, fraud alerts, compliance center, optional on-chain verification  
5. **Monetize** — Pro workspace subscriptions, enterprise white-label, API access  

See also:

- [INTERNATIONAL_EXPANSION.md](./INTERNATIONAL_EXPANSION.md) — country-by-country rollout plan  
- [AWS_MIGRATION_PLAN.md](./AWS_MIGRATION_PLAN.md) — infrastructure migration when scale requires it  
- [AI_INTEGRATION.md](./AI_INTEGRATION.md) — how AI works with and without API keys

---

## Module completion estimates

From [PRODUCT_DIRECTION.md](./PRODUCT_DIRECTION.md) — updated direction:

| Module | Estimate |
|---|---|
| Marketplace | 90% |
| Consumer experience | 90% |
| Agent CRM | 85% |
| Agency ERP (workspace) | 80% |
| Property management | 75% |
| Smart property | 65% |
| Financial services | 60% |
| Developer platform | 70% |
| Enterprise platform | 60% |
| Trust & compliance | 80% |
| Mobile platform | 90% |

---

## Related documentation

| Document | Description |
|---|---|
| [AI_INTEGRATION.md](./AI_INTEGRATION.md) | AI surfaces, edge functions, optional OpenAI keys |
| [AWS_MIGRATION_PLAN.md](./AWS_MIGRATION_PLAN.md) | Future AWS migration phases |
| [INTERNATIONAL_EXPANSION.md](./INTERNATIONAL_EXPANSION.md) | Country rollout plan |
| [PRODUCT_DIRECTION.md](./PRODUCT_DIRECTION.md) | Product scope, role model, build queue |
| [reference/property-hub-reos-mvp.md](./reference/property-hub-reos-mvp.md) | Detailed MVP feature spec |
| [setup/SUPABASE_SETUP.md](./setup/SUPABASE_SETUP.md) | Database and Supabase project setup |
| [setup/OAUTH_SETUP.md](./setup/OAUTH_SETUP.md) | Google & Apple OAuth configuration |
| [setup/INTERNATIONAL_MLS_SETUP.md](./setup/INTERNATIONAL_MLS_SETUP.md) | i18n, MLS, payments |
| [deployment/DEPLOYMENT_GUIDE.md](./deployment/DEPLOYMENT_GUIDE.md) | Full deployment walkthrough |
| [deployment/PRODUCTION_CHECKLIST.md](./deployment/PRODUCTION_CHECKLIST.md) | Launch checklist |
| [deployment/MOBILE_SETUP.md](./deployment/MOBILE_SETUP.md) | PWA and native wrappers |
| [blockchain/BLOCKCHAIN_CONTRACTS.md](./blockchain/BLOCKCHAIN_CONTRACTS.md) | Smart contract reference |
| [implementation/IMPLEMENTATION_COMPLETE.md](./implementation/IMPLEMENTATION_COMPLETE.md) | International & MLS implementation notes |
| [README.md](../README.md) | Developer quick start |

---

## Glossary

| Term | Meaning |
|---|---|
| **REOS** | Real Estate Operating System |
| **Listing** | A property offered for rent, sale, lease, or short stay |
| **Deal case** | A workflow instance (rental application, purchase offer, lease) |
| **Workspace** | An organization’s operational dashboard |
| **Escrow** | Funds held until a milestone (deposit, installment) is released |
| **KYC** | Know Your Customer — identity verification for trust |

---

*Last updated: July 2026 · Maintainers: update this file when shipping major features or changing roadmap priorities.*

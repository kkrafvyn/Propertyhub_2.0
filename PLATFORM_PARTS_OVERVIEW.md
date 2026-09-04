# BaytMiftah / PropertyHub — Parts Overview

This document describes **each major part of the app first**, then how they connect. Use it as a map before diving into role details or feature checklists.

> **Live app:** [propertyhub-2-0-ecru.vercel.app](https://propertyhub-2-0-ecru.vercel.app)  
> **Deep dive (platform roles only):** [PLATFORM_ROLES_AND_ADMIN_CONSOLE.md](./PLATFORM_ROLES_AND_ADMIN_CONSOLE.md)

---

## Part 1 — Marketing & public site

**What it is:** The public face of BaytMiftah — landing pages, pricing, and CTAs that send users to the main app.

| Item | Detail |
|------|--------|
| **Routes** | Marketing shell (home, about, pricing, etc.) |
| **Who uses it** | Visitors, prospects, SEO traffic |
| **Key paths** | `src/app/pages/marketing/`, `src/lib/marketing-urls.ts` |
| **Build** | `npm run dev:marketing` / `build:marketing` |

**Does:** Explains the product, links sign-up and login to the Vercel app origin.

---

## Part 2 — Consumer app (`/app`)

**What it is:** The end-user experience for renters, buyers, and general consumers.

| Item | Detail |
|------|--------|
| **Routes** | `/app`, saved listings, wallet, consumer portal, applications |
| **Who uses it** | Users with role `consumer`, `buyer`, `renter` |
| **Login redirect** | Default for non-workspace, non-admin users |
| **Key paths** | `src/app/pages/app/`, `src/lib/consumer-context.service.ts` |

**Does:** Browse properties, save favorites, apply to rent/buy, pay rent, view lease/sign documents, tenant wallet, notifications.

---

## Part 3 — Workspace (`/workspace/:orgSlug`)

**What it is:** The professional operations hub for landlords, agents, and property teams.

| Item | Detail |
|------|--------|
| **Routes** | `/workspace`, org-scoped modules (leases, tenants, accounting, team, etc.) |
| **Who uses it** | `host`, `agent`, `manager`, `owner`, agency roles |
| **Login redirect** | Workspace roles → `/workspace` |
| **Key paths** | `src/app/pages/workspace/`, `src/lib/workspace.ts`, org RBAC services |

**Does:** Manage properties, leases, maintenance, payments, team members, HOA, revenue tools, e-signatures, integrations — per **organization**.

**Org roles (inside a team):** Separate from platform roles — owner, manager, agent, etc., with 20+ workspace permissions. Managed in **Workspace → Team**, not in Admin.

---

## Part 4 — Admin console (`/admin`)

**What it is:** The **SaaS operator** back office — run the whole platform without redeploying code.

| Item | Detail |
|------|--------|
| **Routes** | `/admin`, `/admin/users`, `/admin/organizations`, … |
| **Who uses it** | Platform Admin and Platform Staff (delegates) |
| **Login redirect** | Anyone with platform console access → `/admin` |
| **Key paths** | `src/app/pages/admin/AdminLayout.tsx`, `src/lib/admin.service.ts` |

### Admin sections (each part of the console)

| Section | Route | Purpose |
|---------|-------|---------|
| **Overview** | `/admin` | Counts, queue summary, platform health |
| **Users** | `/admin/users` | Directory, verify/ban, **assign platform roles** |
| **Organizations** | `/admin/organizations` | Approve or suspend workspace teams |
| **Listings** | `/admin/listings` | Moderate status, visibility, featured |
| **Moderation** | `/admin/moderation` | Fraud alerts, review cases, audit trail |
| **Trust & KYC** | `/admin/trust` | Identity docs, agency trust requests |
| **Revenue** | `/admin/revenue` | Fees, subscriptions, promos, taxes, gateways |
| **Support** | `/admin/support` | User lookup, support routing |
| **Settings** | `/admin/settings` | Operator notes and role documentation |

---

## Part 5 — Platform roles (who can use Admin)

**What it is:** Access control for **Part 4 only** — stored on the user record in Supabase, not in org team settings.

### Two levels

| Level | Label in app | Summary |
|-------|--------------|---------|
| **Platform Admin** | Platform Admin | Full `/admin` access; can assign roles to others |
| **Platform Staff** | Platform Staff | Only the console areas an admin assigned |

### Eight assignable areas (grants)

Admins pick these in **Admin → Users → Assign roles**:

| Grant | What the person can do |
|-------|-------------------------|
| **User management** | Verify/ban users, browse user directory |
| **Organizations** | Verify or suspend workspace organizations |
| **Listings** | Change listing status, visibility, featured |
| **Moderation** | Triage fraud, manage review cases, read audit logs |
| **Trust & KYC** | Review KYC and trust verification requests |
| **Support** | Support search and escalations |
| **Revenue** | Platform fee and billing configuration |
| **Settings** | Platform settings (usually admin-only) |

### Quick presets (when assigning)

| Preset | Typical use |
|--------|-------------|
| **Moderator** | Listings + moderation only |
| **Trust reviewer** | KYC/trust only |
| **User support** | Users + support |
| **Operations manager** | All ops except revenue/settings |
| **Platform admin** | Full control |
| **Custom** | Any checkbox mix |

**First admin bootstrap (SQL):**
```sql
UPDATE users SET is_platform_admin = true WHERE email = 'your@email.com';
```

Full security and DB details: [PLATFORM_ROLES_AND_ADMIN_CONSOLE.md](./PLATFORM_ROLES_AND_ADMIN_CONSOLE.md)

---

## Part 6 — Authentication & routing

**What it is:** Decides where users land after login and which routes they may open.

| Item | Detail |
|------|--------|
| **Auth** | Supabase Auth + `AuthContext` profile on `users` table |
| **Post-login** | `src/app/lib/auth-routing.ts` |
| **Admin guard** | `ProtectedAdminRoute` in `ProtectedRoute.tsx` |
| **Desktop app** | `src/lib/desktop-routing.ts` (Electron → admin or workspace) |
| **Mobile** | Consumer vs business app IDs via Capacitor |

**Does:** Blocks banned users, requires email verification where configured, sends platform staff to `/admin`, professionals to `/workspace`, consumers to `/app`.

---

## Part 7 — Payments & financial ops

**What it is:** Rent collection, wallets, ACH/card, payouts, and platform revenue rules.

| Item | Detail |
|------|--------|
| **Tenant/consumer** | Wallet, pay rent, promise-to-pay |
| **Workspace** | Invoicing, bank feeds, property payments |
| **Platform** | Revenue admin (`/admin/revenue`), fee rules in DB |
| **Key paths** | Payment services, `supabase/functions/` payment webhooks, revenue migrations |

**Does:** Move money between tenants, owners, and the platform; configurable fees for the SaaS operator.

---

## Part 8 — Leases & e-signatures

**What it is:** Digital lease signing with security hardening and workspace/consumer UX.

| Item | Detail |
|------|--------|
| **Service** | `src/lib/lease-esignature.service.ts` |
| **Security** | Per-signer tokens, routing order, server-side finalize |
| **UX** | Per-signer links, cosign banners, hide legacy "Mark signed" when envelope exists |
| **Channels** | Online sign flow, WhatsApp lease sign webhook |

**Does:** Send envelopes, track signer status, complete leases without manual override when online signing is active.

---

## Part 9 — Trust, KYC & compliance

**What it is:** Identity verification for consumers and trust badges for agencies.

| Item | Detail |
|------|--------|
| **Admin UI** | `/admin/trust` |
| **AI screening** | `supabase/functions/kyc-ai-screen` (platform staff allowed) |
| **Data** | `kyc_submissions`, `trust_verification_requests` |

**Does:** Submit documents, AI/rule screening, human review, approve or reject trust status.

---

## Part 10 — Moderation & fraud

**What it is:** Platform safety — alerts, cases, and audit history.

| Item | Detail |
|------|--------|
| **Admin UI** | `/admin/moderation` |
| **Service** | `src/lib/fraud-detection.service.ts` |
| **Data** | `fraud_review_cases`, `fraud_case_events`, `audit_logs` |

**Does:** Triage suspicious activity, assign investigators, escalate, dismiss, maintain audit trail.

---

## Part 11 — Communications

**What it is:** Outbound and inbound messaging across channels.

| Item | Detail |
|------|--------|
| **SMS** | Unified outbound SMS |
| **WhatsApp** | Webhooks, lease sign links, notifications |
| **In-app** | `notification.service.ts`, deep links to signing/actions |

**Does:** Notify tenants, owners, and staff; drive users to the right screen from a link.

---

## Part 12 — Integrations & extensions

**What it is:** Connect external systems and advanced product modules.

| Module | Purpose |
|--------|---------|
| **Integration hub** | Self-serve connector setup |
| **Developer API & webhooks** | `developer-api.service.ts` |
| **MLS syndication** | Listing distribution |
| **Desktop ERP (Electron)** | GL, procurement, bulk ops |
| **Whitelabel / mobile** | Branded apps, Launchpad |
| **Web3 / tokenization** | Property tokens, explorer (where enabled) |
| **AI command center** | Operational AI tools in workspace |

---

## Part 13 — Database & backend (Supabase)

**What it is:** Postgres, RLS, edge functions, and migrations.

| Item | Detail |
|------|--------|
| **Migrations** | `supabase/migrations/` |
| **Platform roles** | `2026090323_platform_manager_role.sql`, `2026090324_platform_console_grants.sql` |
| **RLS** | Row-level security per org and per platform grant |
| **Functions** | KYC, payments, WhatsApp, etc. under `supabase/functions/` |
| **Deploy DB** | `npm run db:push` |
| **Offsite backup** | `npm run backup:pre-migration` then `npm run backup:offsite` |
| **Restore drill** | `npm run backup:restore-drill:verify` |

**Does:** Enforces who can read/write each table — org members for workspace data, grant holders for admin operations. **Before AWS migration:** run a pre-migration snapshot and verify restore — see [docs/setup/BACKUP_AND_DISASTER_RECOVERY.md](docs/setup/BACKUP_AND_DISASTER_RECOVERY.md).

---

## How the parts fit together

```
                    ┌─────────────────┐
                    │   Marketing     │  Part 1 — public site
                    └────────┬────────┘
                             │ sign up / login
                             ▼
              ┌──────────────────────────────┐
              │         Auth (Part 6)         │
              └──────────────┬───────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   ┌───────────┐      ┌─────────────┐     ┌─────────────┐
   │ Consumer  │      │  Workspace  │     │    Admin    │
   │  /app     │      │ /workspace  │     │   /admin    │
   │  Part 2   │      │   Part 3    │     │  Part 4+5   │
   └─────┬─────┘      └──────┬──────┘     └──────┬──────┘
         │                   │                    │
         └───────────────────┴────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │  Supabase DB + RLS (Part 13) │
              │  Payments · E-sign · Comms   │
              │  Parts 7–12                  │
              └──────────────────────────────┘
```

---

## Role cheat sheet (which part you use)

| If you are… | You mainly use… | Assigned how… |
|-------------|-----------------|---------------|
| Renter / buyer | Part 2 — Consumer `/app` | Sign up as user |
| Landlord / agent | Part 3 — Workspace | Sign up as landlord or join org team |
| Org owner / manager | Part 3 — Team permissions | Workspace → Team |
| Night-shift operator | Part 4 — Admin (subset) | Admin assigns grants |
| SaaS owner / CTO | Part 4 — Admin (full) | `is_platform_admin` in DB |

---

## Related docs

| File | Contents |
|------|----------|
| [PLATFORM_ROLES_AND_ADMIN_CONSOLE.md](./PLATFORM_ROLES_AND_ADMIN_CONSOLE.md) | Platform roles, grants, RLS, assignment UI, security |
| [BAYTMIFTAH_VS_BUILDIUM_CHECKLIST.md](./BAYTMIFTAH_VS_BUILDIUM_CHECKLIST.md) | Feature parity vs Buildium |

---

*Last updated: platform granular roles feature (`dc8e5f5`).*

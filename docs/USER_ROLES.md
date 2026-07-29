# BaytMiftah — User Roles Guide

This document describes **who each user type is**, **what they see in the app**, and **how permissions work**. For the full product roadmap, see [APP_OVERVIEW_AND_ROADMAP.md](./APP_OVERVIEW_AND_ROADMAP.md).

---

## Role layers

BaytMiftah uses two independent role systems:

```text
App role (user_metadata)     →  Where you land after login, consumer vs pro menus
        +
Org role (organization_members)  →  What you can do inside a workspace
```

---

## App-level roles

| Role | Who | Login redirect | Primary screens |
|---|---|---|---|
| **consumer** | Buyers, renters, guests | `/app` | Marketplace, saved, messages, trips, leases |
| **host** | Landlords, property owners | `/workspace` | Workspace + consumer account |
| **agent** | Independent or agency agents | `/workspace` | Workspace + consumer account |
| **admin** | Platform operators | `/admin` | Admin console |

**Signup:** choosing “User” sets `consumer`; choosing “Landlord” sets `host`.

**Code:** `src/app/lib/baytmiftah/roles.ts`, `src/app/lib/auth-routing.ts`

---

## Workspace org roles

Each user can belong to one or more **organizations**. Inside `/workspace/:slug`, permissions depend on org role:

| Org role | Listings | Leads / CRM | Finance | Team / settings | Analytics |
|---|---|---|---|---|---|
| **owner** | Full | Full | Full | Full | Full |
| **manager** | Full | Full | Full | Full | Full |
| **agent** | Create & edit | Full | View | — | View |
| **analyst** | View only | View | View | — | View |

### Analyst (read-only)

Analysts can browse listings, contacts, tasks, payments, and reports but **cannot**:

- Create or edit listings
- Add contacts or tasks
- Change assignments or archive records
- Access team management, whitelabel, or automation settings

### Navigation filtering

The workspace sidebar hides pages the current org role cannot access. Direct URL access shows an “Access restricted” card.

**Code:** `src/lib/workspace-permissions.ts`, `src/app/lib/workspace-role-nav.ts`

---

## Consumer journeys

Consumers unlock **contextual tabs** based on real activity (not just signup type):

| Journey | Unlocks |
|---|---|
| Short-stay booking | Trips, reservations, calendar |
| Active lease | Leases, payments, maintenance, my home |
| Purchase offer | Applications, transactions, documents, mortgage |
| Host/agent app role | Workspace + list property shortcuts |

New users with no activity see a **clean dashboard** without empty journey tabs.

**Code:** `src/app/lib/baytmiftah/capabilities.ts`, `src/lib/consumer-context.service.ts`

---

## Platform admin

Access requires **`is_platform_admin`** on the user profile **or** admin role in auth metadata.

Admins can:

- Review and moderate users, organizations, and listings
- Manage trust & KYC queue
- Handle support tickets
- Configure platform settings

Admins also retain consumer and workspace access via the account menu.

**Code:** `src/app/components/ProtectedAdminRoute.tsx`, `src/app/pages/admin/AdminLayout.tsx`

---

## UI quick reference

| User type | Desktop header | Mobile bottom nav | Account menu |
|---|---|---|---|
| Consumer | Marketplace nav + list property | Home · Explore · Saved · Messages · Profile | Dashboard, saved, workspace link |
| Host / agent | Same + workspace-first menu | Workspace shortcuts on home | Workspace first, my account |
| Workspace analyst | Workspace sidebar (read-only pages) | Consumer tabs + workspace links | Same as host |
| Platform admin | + Admin console link | Consumer tabs (admin is desktop-first) | Admin console |

---

## Future role model

[PRODUCT_DIRECTION.md](./PRODUCT_DIRECTION.md) describes a expanded 13-role model (`agency_owner`, `property_manager`, `enterprise_operator`, etc.). Current production uses the simplified app roles above plus workspace org roles until a full migration is completed.

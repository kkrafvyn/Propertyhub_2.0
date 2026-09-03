# Platform Roles & Admin Console

This document describes the **platform operator system** built for BaytMiftah — how admins delegate work, what each role can do, and how access is enforced in the app and database.

> **Live app:** [propertyhub-2-0-ecru.vercel.app](https://propertyhub-2-0-ecru.vercel.app)  
> **Admin console:** `/admin` (requires platform access)

---

## What we built from scratch

### 1. Platform Admin Console (`/admin/*`)

A full SaaS operator console for running the marketplace without code deploys:

| Section | Route | Purpose |
|---------|-------|---------|
| Overview | `/admin` | Platform health, user/org/listing counts, moderation queue summary |
| Users | `/admin/users` | Directory, verify/ban accounts, **assign platform roles** |
| Organizations | `/admin/organizations` | Approve or suspend workspace teams |
| Listings | `/admin/listings` | Moderate status, visibility, featured flags |
| Moderation | `/admin/moderation` | Fraud alert triage, review cases, audit feed |
| Trust & KYC | `/admin/trust` | Identity document review, agency trust requests |
| Revenue | `/admin/revenue` | Fees, subscriptions, promos, taxes, payment gateways |
| Support | `/admin/support` | User lookup and support routing |
| Settings | `/admin/settings` | Role documentation and platform operator notes |

**Key files:** `src/app/pages/admin/AdminLayout.tsx`, `src/app/routes/admin.routes.tsx`, `src/lib/admin.service.ts`

---

### 2. Granular platform role assignment

Instead of a single “make manager” toggle, **platform admins pick exactly which console areas** each delegate may use.

**UI flow**

1. Sign in as platform admin → **Admin → Users**
2. Click **Assign roles** on any user (not yourself)
3. Choose:
   - **Platform admin** (full access), or
   - A **quick preset**, or
   - Individual **console responsibility** checkboxes
4. Click **Save roles**

Assigned roles appear as badges on the user row (e.g. “Moderation”, “Trust & KYC”).

**Key files:** `src/app/components/admin/PlatformRoleAssignmentDialog.tsx`, `src/lib/platform-console-grants.ts`, `src/lib/platform-access.ts`

---

### 3. Database-backed access control

Two Supabase migrations enforce roles at the database layer (not UI-only):

| Migration | What it adds |
|-----------|----------------|
| `2026090323_platform_manager_role.sql` | `is_platform_manager`, `is_platform_staff()`, staff RLS policies, privileged-column trigger |
| `2026090324_platform_console_grants.sql` | `platform_console_grants[]`, `has_platform_console_grant()`, grant-scoped RLS, sync trigger |

**Columns on `public.users`**

| Column | Type | Meaning |
|--------|------|---------|
| `is_platform_admin` | boolean | Full super-admin; all grants implicitly |
| `is_platform_manager` | boolean | Legacy/sync flag — `true` when grants array is non-empty |
| `platform_console_grants` | text[] | Assigned console areas (see grants below) |

**SQL helpers**

- `is_platform_admin()` — full operator
- `is_platform_manager()` — has delegate flag or grants
- `is_platform_staff()` — admin OR has any grant
- `has_platform_console_grant('users')` — admin OR grant in array

Only **platform admins** may change `is_platform_admin`, `platform_console_grants`, or another user’s manager flag (enforced by `protect_users_privileged_columns` trigger).

---

### 4. App-wide routing & guards

Platform access is wired through login redirects, menus, and route protection:

| Behavior | Implementation |
|----------|----------------|
| Post-login redirect to `/admin` | `src/app/lib/auth-routing.ts` |
| Desktop (Electron) home | `src/lib/desktop-routing.ts` |
| Admin route guard | `ProtectedAdminRoute` in `src/app/components/ProtectedRoute.tsx` |
| User menu “Admin” link | `src/app/components/baytmiftah/UserMenu.tsx` |
| Nav + section visibility | `canAccessAdminSection()` in `AdminLayout` |
| Workspace org bypass | Platform staff may open any org workspace (`organization-access.ts`, `authorization.ts`) |
| KYC AI screening edge function | Platform staff may screen submissions (`supabase/functions/kyc-ai-screen`) |

---

## Role hierarchy (platform level)

```
Platform Admin          → all console areas + assign roles
    │
    └── Platform Staff  → only assigned grants (custom mix)
            │
            └── Regular user → no /admin access
```

### Platform Admin

- **Who:** User with `is_platform_admin = true`
- **Console label:** “Platform Admin”
- **Can do everything:** all sections including Revenue and Settings
- **Exclusive power:** assign or revoke platform roles for other users
- **Bootstrap (first admin):** run in Supabase SQL if none exists:
  ```sql
  UPDATE users SET is_platform_admin = true WHERE email = 'your@email.com';
  ```

### Platform Staff (delegate)

- **Who:** User with one or more entries in `platform_console_grants` (or legacy `is_platform_manager`)
- **Console label:** “Platform Staff”
- **Can do:** only what was assigned — nav items and API/RLS match grants
- **Cannot:** assign roles, unless explicitly granted Revenue + Settings and promoted to admin

---

## Console grants (what each role does)

Each grant maps to an admin section and database permissions.

| Grant key | UI label | Admin route | What they can do in the app |
|-----------|----------|-------------|----------------------------|
| `users` | User management | `/admin/users` | View user directory; verify/unverify accounts; ban/unban users |
| `organizations` | Organizations | `/admin/organizations` | View all orgs; verify teams; suspend/reinstate workspace access |
| `listings` | Listings | `/admin/listings` | View all listings; change status, visibility, featured |
| `moderation` | Moderation | `/admin/moderation` | Triage fraud alerts; open/assign/resolve review cases; view related audit logs |
| `trust` | Trust & KYC | `/admin/trust` | Review KYC submissions; approve/reject trust verification requests; run AI KYC screening |
| `support` | Support | `/admin/support` | Support user lookup and escalation workflows |
| `revenue` | Revenue | `/admin/revenue` | Configure platform fees, subscriptions, promos, taxes, payment gateways |
| `settings` | Settings | `/admin/settings` | View platform operator settings and role documentation |

**Overview** (`/admin`) is visible to anyone with at least one grant (or admin). Stats load only for sections the user can access.

**Direct URL access:** Opening a section without the grant shows an “access restricted” card.

---

## Quick presets (admin assignment UI)

Admins can start from a preset, then customize checkboxes.

| Preset | Grants included | Typical use |
|--------|-----------------|-------------|
| **Moderator** | Listings, Moderation | Content and fraud queue only |
| **Trust reviewer** | Trust & KYC | Identity/compliance review shift |
| **User support** | User management, Support | Helpdesk / account issues |
| **Operations manager** | Users, Organizations, Listings, Moderation, Trust, Support | Cover day-to-day ops when admin is away (no Revenue/Settings) |
| **Custom** | Pick any combination | Mixed responsibilities |

---

## Example assignments

| Scenario | Assignment |
|----------|------------|
| KYC-only contractor | Preset: **Trust reviewer** |
| Listing quality team | Preset: **Moderator** |
| Night-shift operator | Preset: **Operations manager** |
| Co-founder / billing owner | **Platform admin** |
| Support agent | **User support** preset |

---

## App roles vs platform roles

BaytMiftah has **two separate role systems**:

### A. Platform roles (this document)

- Stored on `users.is_platform_admin`, `users.platform_console_grants`
- Controls **`/admin`** SaaS operator console
- Assigned only by platform admins in **Admin → Users**

### B. Workspace / product roles (existing)

Used for consumer and professional product surfaces (`/app`, `/workspace`):

| Role (metadata / profile) | Home | Purpose |
|---------------------------|------|---------|
| `consumer` | `/app` | Browse, save, rent/buy as end user |
| `host` / `landlord` | `/workspace` | Property owner workspace |
| `agent` | `/workspace` | Agent workspace |
| `manager` / `owner` | `/workspace` | Org-level workspace RBAC (team permissions) |
| `admin` / `platform_admin` (metadata) | `/admin` | Legacy metadata aliases; DB flags take precedence |

**Org RBAC** (20+ workspace permissions) is separate — managed inside each organization’s Team settings, not from the platform Users screen.

Constants: `src/lib/platform-roles.ts`, `src/app/lib/baytmiftah/roles.ts`

---

## Security summary

| Rule | Enforcement |
|------|-------------|
| Only admins assign roles | DB trigger + `canManagePlatformRoles()` |
| Staff see only their nav sections | `canAccessAdminSection()` + conditional data loading |
| Staff cannot update users without `users` grant | RLS `has_platform_console_grant('users')` |
| Revenue tables stay admin-only by default | Existing revenue migrations + `revenue` grant |
| Banned users signed out | `AuthContext` profile check |
| Privileged self-edit blocked | Users cannot set their own admin/grants/banned/verified |

---

## Tests

| File | Covers |
|------|--------|
| `src/lib/platform-access.test.ts` | Grant resolution, section access, legacy manager bundle |
| `src/lib/organization-access.test.ts` | Platform staff org bypass |
| `src/app/lib/auth-routing.test.ts` | Redirect to `/admin` for staff |

Run: `npm run test -- src/lib/platform-access.test.ts src/app/lib/auth-routing.test.ts`

---

## Related source files

```
src/lib/platform-console-grants.ts      # Grant keys, labels, presets
src/lib/platform-access.ts              # Access helpers used across app
src/lib/admin.service.ts                # listUsers, setPlatformAccess, etc.
src/app/components/admin/PlatformRoleAssignmentDialog.tsx
src/app/pages/admin/AdminLayout.tsx
supabase/migrations/2026090323_platform_manager_role.sql
supabase/migrations/2026090324_platform_console_grants.sql
```

---

## Changelog (this feature set)

1. **Platform manager delegate** — operational admin when super-admin unavailable  
2. **User promotion UI** — verify, ban, assign roles from Admin → Users  
3. **Granular grants** — per-area checkboxes and presets instead of one manager flag  
4. **RLS + triggers** — database enforces least privilege per grant  
5. **Routing & guards** — staff land on `/admin` with scoped nav and sections  

# Platform admin console (owner + team)

BaytMiftah is operated by a **platform owner** (`users.is_platform_admin`) and optional **platform staff** granted scoped access via `platform_console_grants`.

## Access model

| Role | Database signals | Console behavior |
|------|------------------|------------------|
| **Owner** | `is_platform_admin = true` | All `/admin` sections, team roster, feature flags, owner-only operations health |
| **Staff** | Non-empty `platform_console_grants` or legacy `is_platform_manager` | Grant-scoped nav and KPIs only |
| **Everyone** | MFA + `ProtectedAdminRoute` | Sensitive RPCs require `require_account_admin()` (owner + AAL2) |

Presets live in `src/lib/platform-console-grants.ts` (Moderator, Trust reviewer, User support, Operations manager).

## Routes

| Path | Audience | Grant / rule |
|------|----------|--------------|
| `/admin` | All console users | Command Center (owner full snapshot; staff grant-filtered) |
| `/admin/team` | Owner only | Assign grants via `PlatformRoleAssignmentDialog` |
| `/admin/integrations` | `integrations` | Health, jobs, operational events |
| `/admin/operations` | Owner only | Deep app & API health |
| `/admin/features` | Owner only | Global feature flags |
| `/admin/payments` | `payments` or `revenue` | Payment ledger (read) |
| `/admin/ai` | `ai_governance` | AI action audit (read) |
| `/admin/communications` | `communications` or `support` | Delivery attempts (read) |
| Legacy sections | Per existing grants | Users, orgs, listings, moderation, trust, revenue, support, settings |

## Data layer

- `src/lib/platform-admin-dashboard.service.ts` — owner vs staff command center snapshots and list helpers.
- Migration `20261004230000_platform_staff_cross_tenant_read.sql` — RLS SELECT for staff on payments, AI logs, comms; extended grant allowlist on `admin_set_user_platform_access`; `require_platform_operations_access` for integrations grant + MFA.

## Delegation guidance

- Keep **revenue** and **settings** owner-default unless explicitly delegated.
- Only the owner should assign platform roles (`/admin/team` or user management with role dialog).
- Staff mutations remain on existing admin RPCs; new pages are primarily read/governance views.

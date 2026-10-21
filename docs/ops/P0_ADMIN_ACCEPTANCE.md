# P0 — Live admin acceptance (disposable accounts)

Evidence checklist for [UPGRADE_TODO.md](../UPGRADE_TODO.md) §1. Record **deployment URL**, **test account roles**, and **pass/fail** — never store passwords in git.

Automated smoke (unauthenticated gates only): `npx playwright test e2e/admin-acceptance.spec.ts`

## Platform admin

| Step | Expected |
|------|----------|
| Create organization | New org visible in admin; creator has membership |
| Assign existing user to org | User sees workspace entry for that slug |
| Transfer ownership | Previous owner loses owner role; new owner has owner role |
| Block signed-in user | Same session: REST/Storage/Edge calls return unauthorized |
| Unblock user | Access restored; revoked keys stay revoked |
| Delete account (non-protected) | Auth user removed; business records retained per policy |
| Deny self-delete, active owner delete, other platform-admin delete | Clear error; no partial delete |

## Organization admin & department head

| Step | Expected |
|------|----------|
| Org A admin → Org B data | Denied in UI and API |
| Dept head → other dept team/task | Denied on server |

## Security & visibility

| Step | Expected |
|------|----------|
| MFA-required roles | Cannot bypass MFA for protected actions |
| Console delegate | Cannot access global telemetry outside grant |
| Health / activity | Unavailable checks show degraded, not “healthy” |

## Sign-off

- Tester: _______________
- Date: _______________
- Build / commit: _______________
- Notes: _______________

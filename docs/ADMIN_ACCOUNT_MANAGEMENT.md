# Admin account management and operations

Implemented locally:

- Admin > Users: create organizations for verified existing users, assign membership and company roles, block/unblock accounts, and delete Auth accounts with typed confirmation. Deletion retains business records and supports retries; it is not personal-data erasure.
- Admin > Organizations: transfer ownership to an active verified member before deleting an owner. Former owners become organization admins. Self-deletion and deletion/blocking of another platform admin are protected; remove their admin role first.
- Admin > App & API health: on-demand database/REST, Auth, app-version and web availability probes, queue counts, recorded errors and activity feed. Provider configuration indicators do not claim provider availability. Missing or failed checks are identified explicitly.
- Organization admins manage their organization; department heads manage roles and tasks within their section and see scoped activity. Heads cannot grant custom permission overrides or remove users in other departments. Unknown roles fail closed.
- Blocking revokes Auth sessions, refresh tokens, creator API keys and associated external grants. Existing JWTs are rejected by the REST pre-request hook, restrictive database/Storage policies and updated authenticated Edge handlers. The frontend checks on focus and every 30 seconds. Unblocking does not restore revoked keys or shares.

Sensitive account actions require an active platform admin and completed MFA when enrolled. Console delegates cannot access global operations telemetry.

## Deployment order

1. Apply migrations `2026092301` through `2026092304` in order using the project's migration process, first in staging.
2. Deploy `admin-delete-account`, `platform-health`, and all Edge functions importing the updated shared authentication or organization helpers. Also redeploy `dispatch-notification`, `send-enrollment-notification`, and `send-organization-invite`.
3. Set the Supabase Edge secret `APP_HEALTH_URL` to the deployed frontend URL. Deploy the frontend after the migrations.
4. With disposable staging accounts, verify organization creation, membership assignment, ownership transfer, scoped team/task access, block/unblock, old JWT rejection through REST/Storage/Edge, Auth removal, retained business records and deletion retry.
5. Verify the PostgREST pre-request setting and any existing chained hook in the deployed environment. Validate Auth schema permissions for session revocation and monitor activity-table growth.

## Coverage and limits

Activity records metadata for database changes after deployment; it does not reconstruct history or record every read or external provider request. Client error reporting is rate-limited and excludes raw errors. Health checks are snapshots, not a continuous uptime monitor. Future tables need the account restriction policy and activity instrumentation. Plan activity retention appropriate to production volume.

Blocking protects authenticated server access. It cannot retract downloaded files, offline copies, already-issued signed storage URLs, or anonymous public content. Existing business validation, payment workflows and subscription controls remain enforced. Department controls added here cover team management, section tasks and activity; this is not proof that every legacy module has been fully audited.

## Local verification

- `npm run typecheck`
- `npm run build` (passes with existing bundle-size/dynamic-import warnings)
- Focused Vitest coverage: 30 tests across account dialogs, deletion handler, role assignment, platform access and company model.
- `node scripts/security/test-admin-account-management.mjs <absolute-path-to-pglite/dist/index.js> --control-plane`: 23 isolated PostgreSQL checks.

Install PGlite in a temporary directory for the SQL harness. It executes real migration functions against a reduced fixture and verifies authorization, MFA, KYC, ownership, scope preservation, deletion retries, department RLS and blocking. It does not replace staging verification against the complete deployed schema and Supabase services.

Deployment on 2026-09-23: applied all six pending migrations (the two earlier fee-setting migrations and `2026092301` through `2026092304`) to configured project `ixmbfnfwpjwbfahqaftc`. Deployed 22 affected Edge functions, including account deletion and platform health, and configured `APP_HEALTH_URL`. Verified the REST pre-request setting and account restrictions on 284 tables. No account deletion or block was manually initiated; migration backfill enforces restrictions on already-blocked accounts. Authenticated end-to-end workflow verification remains outstanding.

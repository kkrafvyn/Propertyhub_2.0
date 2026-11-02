# Platform marketing editor and app roles

The platform admin console now has **Marketing page** (`/admin/marketing`) and
**App roles** (`/admin/roles`). Both require an actual platform admin; grants such
as Settings or User management do not confer either management capability.
Server-side mutations use the existing admin guard and require MFA/AAL2.

## Marketing

Admins can edit hero copy, select and order four or five photos from the licensed
library, change search/sharing metadata, maintain FAQs, add plain-text sections,
and update the final conversion heading/copy. Extended fields cover teams,
consumers, workflow compare bullets, mobile store links, app preview toggles,
and footer tagline. Product tours and existing conversion destinations remain
connected to the application.

Repo default content lives in `src/lib/marketing-page-document.ts` and
`marketing/cms/homepage-default.json`. Ops can sync production CMS with:

- `npm run marketing:export-default`
- `npm run marketing:publish-default` (requires `SUPABASE_SERVICE_ROLE_KEY`)
- `npm run marketing:copy-previews` (copies App Store preview MP4s into `public/marketing/previews/` for the marketing build)

Save draft -> Preview draft -> Publish saved draft -> Confirm publication.
Drafts and public content are stored separately. Anonymous visitors can read only
published content. Revision checks prevent an old editor from overwriting or
publishing another admin's changes. Restore default content changes only the
editor until saved and published. The public homepage falls back to its default
content when no publication exists or the content service is unavailable.

## App roles

Create a named role using existing app-console permissions, assign it to an app
user, and edit it later to update all assigned users atomically. A user has one
named app role. This does not change their consumer role, organization role,
organization membership, or workspace permissions.

Assignment replaces direct platform grants; removing the assignment revokes the
named role's grants. A later manual grant change through the existing user-access
screen detaches the named role. Roles can be deleted only after all assignments
are removed. Admins cannot use named roles to change their own access or assign
one to an existing platform admin. Banned/deleted accounts cannot receive roles.
Account deletion removes the role link so later definition edits cannot regrant
privileges. All mutations produce audit records.

## Database and verification

Apply `supabase/migrations/2026101101_marketing_editor_and_app_roles.sql` and
`supabase/migrations/2026101102_marketing_app_roles_rpc_acl.sql` before releasing
these admin screens. The second migration removes Supabase's explicit default
anonymous EXECUTE grants, in addition to the first migration's PUBLIC revocations.

Production release on 2026-10-11: both migrations applied transactionally, and
the app and marketing projects deployed to their existing Vercel production targets.
Both Vercel builds completed successfully. Direct deployment browser checks passed
at 1440px, 768px, and 390px; photos loaded without horizontal overflow, controls
worked, and unauthenticated admin routes redirected to login. Production REST
checks confirmed public published-content access and denied draft/role access.
Custom domains currently return DNS name-not-found; Vercel reports third-party
DNS configuration is incomplete. The deployments remain accessible through Vercel.

Local checks:

- `node scripts/security/test-marketing-and-app-roles.mjs` runs real isolated
  PostgreSQL tests in PGlite, with no deployed database connection.
- `npx vitest run src/app/pages/admin/admin-content-and-roles.test.tsx src/lib/marketing-page-document.test.ts`
- `npm run typecheck`
- `npm run build`
- `npm run test:e2e:marketing` checks the preserved public carousel and product tour.

Regenerate Supabase types after the schema migration is applied, using the
repository's normal database-type generation process.

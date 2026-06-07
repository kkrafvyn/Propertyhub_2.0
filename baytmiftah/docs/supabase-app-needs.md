# BaytMiftah Supabase App Needs

This app now routes marketplace, agency, and smart-property data through Supabase Edge Functions. The browser Supabase client is used for session storage only, so the frontend can attach the user's bearer token to Edge Function requests.

## Client Configuration

- Required browser env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`.
- Never place a service-role key in any `VITE_` variable.

## Live Supabase Scan

Checked with the current `.env` publishable key on June 6, 2026.

Exposed and readable:

- `organizations`
- `organization_members`
- `properties`
- `listings`
- `property_media`

Not exposed/found yet:

- `leads`
- `agency_invitations`
- `agency_verification_requests`
- `agency_analytics`
- `smart_devices`
- `smart_automation_rules`
- `smart_alerts`
- `alert_preferences`
- `smart_device_logs`
- `device_sharing`

The frontend is now aligned to `organizations` instead of the older backend-doc `agencies` table name.

## Tables Used By Edge Functions

- `organizations`
- `organization_members`
- `agency_invitations`
- `agency_verification_requests`
- `agency_analytics`
- `properties`
- `leads`
- `smart_devices`
- `smart_automation_rules`
- `smart_alerts`
- `alert_preferences`
- `smart_device_logs`
- `device_sharing`

## RPC Functions Needed By The Schema

The frontend no longer calls RPC functions directly. Edge Functions may call database RPCs later, but the current checked-in Edge implementation handles missing optional RPCs gracefully.

## Edge Functions Expected

- `auth`
- `marketplace`
- `agencies`
- `smart-devices`

The checked-in Edge Functions have been aligned to the live `organizations`, `organization_members`, `properties`, `listings`, and `property_media` schema. Optional modules such as leads, analytics, alerts, and smart devices return empty/null responses until their tables are created and exposed.

## Role Model

Backend authorization uses `public.user_roles`, `organizations.owner_id`, and `organization_members`. It does not trust user-editable `user_metadata.role` for privileged decisions.

- `buyer`: searches, saves, compares, schedules viewings, contacts agents/owners, submits offers.
- `renter`: searches rentals, applies, schedules inspections, manages rental agreements.
- `property_owner`: creates and manages owned listings and property operations.
- `independent_agent`: works independently with assigned properties, leads, clients, and deals.
- `agency_owner`: full agency control, staff, settings, listings, revenue, and analytics.
- `agency_manager`: day-to-day agency operations, lead/listing assignment, reporting.
- `agency_agent`: assigned agency listings, leads, viewings, and client communication.
- `agency_support`: scheduling, document, and customer follow-up access without ownership controls.
- `property_developer`: projects, phases, units, reservations, and construction updates.
- `property_manager`: tenant, maintenance, inspection, and building operations workflows.
- `platform_admin`: platform operations, moderation, verification, disputes, and security monitoring.
- `super_admin`: global configuration, subscription, revenue, admin management, and audit access.

Smart-property access is permission-based through property/device access, not a standalone role.

Self-serve signup accepts `buyer`, `renter`, `property_owner`, `independent_agent`, `property_developer`, and `property_manager`. Agency roles are assigned by agency creation or invitations. Platform admin and super admin roles must be granted through SQL/dashboard/service-role tooling.

Hierarchy:

```text
super_admin
  platform_admin
    agency_owner
      agency_manager
        agency_agent
        agency_support
    property_owner
    independent_agent
    property_developer
    property_manager
    buyer
    renter
```

## Edge Function Authorization

- `auth`: login, signup, and current profile enrichment from `user_roles`.
- `marketplace`: public listing/org reads; listing creation requires organization ownership or membership.
- `agencies`: public agency profile read; private list/team/properties/leads/analytics require organization ownership or membership; verification approval/rejection requires platform admin or super admin.
- `smart-devices`: device, rule, alert, log, and sharing operations require property organization access or device ownership.

Required Edge Function secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

There are no direct frontend `.from()`, `.rpc()`, or realtime channel calls in `src`. Deploy the Edge Functions before deploying the frontend, otherwise data screens will fail at the function boundary.

## Security Checklist

- Enable RLS on every table in the exposed schema.
- Grant only the privileges needed for `anon` and `authenticated`.
- Do not rely on user-editable metadata for authorization.
- Keep privileged database functions in a non-exposed schema when possible.
- For new Supabase projects, explicitly grant Data API access to tables that should be reachable from the client.
- For Realtime tables, confirm publication and RLS policies both allow the intended subscriptions.

## Recommended Next Schema Step

Run or convert [supabase-required-schema.sql](./supabase-required-schema.sql) into a proper Supabase migration. It defines the missing live-app tables/RPCs and adds baseline RLS policies for organization-owned property/listing writes.

The Supabase CLI was not available in the local shell during this pass, so the SQL is checked in as a runnable schema file rather than a generated migration.

Before launch sequence:

- Run `supabase-required-schema.sql` in the Supabase SQL editor or convert it to a migration.
- Add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as Edge Function secrets.
- Deploy Edge Functions: `auth`, `marketplace`, `agencies`, `smart-devices`.
- Create/confirm a `platform_admin` or `super_admin` row in `public.user_roles` for the reviewer account.
- Deploy the Vercel frontend after the functions respond successfully.

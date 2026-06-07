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

Before launch, extend that SQL with:

- `owner_id`, `agency_id`, or `user_id` ownership columns where needed.
- Policies for buyers, owners, individual agents, agency members, and admins.
- Storage buckets for property media and verification documents.
- Private document access policies for offers, contracts, and verification files.

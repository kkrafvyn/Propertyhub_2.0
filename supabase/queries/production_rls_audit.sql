-- Production RLS and Data API audit for Property Hub.
-- Run this in the Supabase SQL editor after applying migrations and before launch.

with expected_tables(table_name) as (
  values
    ('profiles'),
    ('organizations'),
    ('organization_members'),
    ('properties'),
    ('listings'),
    ('deal_cases'),
    ('messages'),
    ('buyer_groups'),
    ('buyer_group_members'),
    ('buyer_group_comments'),
    ('escrow_milestones'),
    ('analytics_events'),
    ('crm_tasks'),
    ('trust_review_events')
)
select
  expected_tables.table_name,
  coalesce(pg_class.relrowsecurity, false) as rls_enabled,
  coalesce(pg_class.relforcerowsecurity, false) as force_rls,
  count(pg_policy.polname) as policy_count,
  bool_or(has_table_privilege('anon', format('public.%I', expected_tables.table_name), 'select')) as anon_can_select,
  bool_or(has_table_privilege('anon', format('public.%I', expected_tables.table_name), 'insert')) as anon_can_insert,
  bool_or(has_table_privilege('authenticated', format('public.%I', expected_tables.table_name), 'select')) as authenticated_can_select,
  bool_or(has_table_privilege('authenticated', format('public.%I', expected_tables.table_name), 'insert')) as authenticated_can_insert
from expected_tables
left join pg_namespace
  on pg_namespace.nspname = 'public'
left join pg_class
  on pg_class.relnamespace = pg_namespace.oid
 and pg_class.relname = expected_tables.table_name
 and pg_class.relkind = 'r'
left join pg_policy
  on pg_policy.polrelid = pg_class.oid
group by expected_tables.table_name, pg_class.relrowsecurity, pg_class.relforcerowsecurity
order by expected_tables.table_name;

-- Expected launch posture:
-- 1. Every listed table exists and has rls_enabled = true.
-- 2. Public analytics should be anon insert-only. anon_can_select should stay false.
-- 3. Buyer group, escrow, CRM, trust review, message, and workspace tables should have policies.
-- 4. Re-run targeted user-role tests in the app after any policy changes.

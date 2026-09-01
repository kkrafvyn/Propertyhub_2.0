# BaytMiftah Tenant Isolation

## Rule

Company A must never read or mutate Company B data. Tenant scope must be enforced in Postgres RLS and server-side functions, not by React navigation.

## Required relationship checks

Audit every organization-, company-, property-, unit-, tenant-, lease-, ticket-, payment-, document-, message-, report-, export-, notification-, and AI-related path. Indirect relationships must resolve back to the same organization before access.

## Current controls

Many tables use `organization_members`-based RLS. Edge Functions authenticate users and check organization membership. Bank-feed connection management now checks explicit finance-capable roles.

## Required proof

Add deployed-database positive/negative tests for two organizations covering direct SQL/RLS, APIs, Edge Functions, Storage, reports, exports, messaging, notifications, search, and AI. This proof is not currently available in the repository.

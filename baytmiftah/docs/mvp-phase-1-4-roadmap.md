# MVP Phase 1-4 Launch Gates

This phase turns the roadmap into deployable operating modules before the next production push.

## 1. Ghana Compliance Baseline

- Ghana-first required document checklist for sale and rental listings.
- Listing compliance review records with score, missing documents, and risk flags.
- Edge Function: `compliance`.
- UI workspace: `/mvp`, Ghana Compliance card.

## 2. Trust and Fraud Engine

- Trust scores for organizations, listings, properties, and users.
- Fraud signals for duplicate listings, missing ownership documents, suspicious pricing, and risky lead behavior.
- Edge Function: `trust`.
- UI workspace: `/mvp`, Trust and Fraud card.

## 3. Agency CRM Depth

- Pipeline stages with probability and sorting.
- Lead intent score, next follow-up, lead source, budget, and preferred area.
- Activity timeline for notes, calls, messages, viewings, offers, and tasks.
- Edge Function: `agency-crm`.
- UI workspace: `/mvp`, Agency CRM card.

## 4. Monetization

- Agency and developer subscription plans.
- Organization subscription tracking.
- Featured listing campaigns with budget, placements, impressions, clicks, and leads.
- Edge Function: `monetization`.
- UI workspace: `/mvp`, Monetization card.

## Deployment Order

1. Apply `docs/supabase-required-schema.sql`.
2. Apply `docs/global-readiness-schema.sql`.
3. Apply `docs/mvp-phase-1-4-schema.sql`.
4. Deploy Edge Functions: `auth`, `marketplace`, `agencies`, `smart-devices`, `compliance`, `trust`, `agency-crm`, `monetization`.
5. Deploy frontend to Vercel.

## Notes

- The frontend continues to call Supabase Edge Functions only.
- Edge Functions use the service role on the server side and enforce access through token verification and organization role checks.
- RLS remains enabled on all public schema tables in this phase.

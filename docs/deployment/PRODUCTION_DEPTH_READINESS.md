# Production Depth Readiness

Use this checklist when promoting the collaboration, concierge, analytics, escrow, CRM, and rich media bundle.

## Supabase rollout

Apply the migration:

```bash
npx supabase migration up
```

For the linked remote project, do not run a blind `db push` if migration history is empty or out of sync. Use the database password and apply only this reviewed migration:

```bash
$env:SUPABASE_DB_PASSWORD="your_database_password"
npx supabase db query --linked -f supabase\migrations\20260516131850_production_depth_features.sql
```

Then deploy the new Edge Function:

```bash
npx supabase functions deploy ai-concierge
```

Confirm these tables are visible to the authenticated Data API role after the migration:

- `ai_concierge_conversations`
- `buyer_groups`
- `buyer_group_members`
- `buyer_group_comments`
- `escrow_milestones`
- `analytics_events`
- `crm_tasks`
- `trust_review_events`

The migration enables RLS and grants authenticated access explicitly because new public tables may not be exposed automatically in newer Supabase projects.
Analytics also grants anonymous insert only, scoped to `user_id IS NULL`, so public listing views can be tracked without exposing analytics reads.

## Security checks

- Run `supabase/queries/production_rls_audit.sql` in the Supabase SQL editor.
- Confirm RLS is enabled on every new public table.
- Confirm buyer-group policies do not use `user_metadata`; invitations match the authenticated JWT email claim.
- Confirm anonymous users can insert `analytics_events` only with `user_id IS NULL`, and cannot select analytics rows.
- Confirm escrow milestones are visible only to the buyer or organization members.
- Confirm CRM tasks are only manageable by organization members.
- Confirm trust review events are inserted by organization members and visible to request participants.
- Confirm `property-media` allows only the configured image, video, and PDF MIME types.

## Product checks

- Open `/app/concierge`, ask a question, and confirm a row appears in `ai_concierge_conversations`.
- Open `/app/groups`, create a buying group, invite a reviewer, and add a group note.
- Open `/app/deals`, confirm escrow milestones are generated for a deal room and can be completed.
- Open workspace CRM, generate tasks, and mark one task complete.
- Open workspace Seller Portal and confirm seller net sheet, owner update draft, and launch readiness actions reflect current listings, cases, documents, and payments.
- Open a listing, share/save/inquire/book/pay, and confirm `analytics_events` receives the matching events.
- Open buyer tools and confirm rent-vs-buy, closing reserve, remote readiness, negotiation playbook, viewing prep, and inspection checklist values update from the focus listing.
- Open a listing detail page and confirm the buyer decision brief shows reserve, offer coach, readiness, viewing prep, and inspection priorities before verification.
- Upload media with `media_type` values for photo, video, floor plan, virtual tour, and document before app-store release.

## Mobile release checks

- Run `npm run build`.
- Run `npm test`.
- Run `npx cap sync`.
- Run `npm run release:check`.
- Verify bottom navigation includes Concierge and Groups in the right mobile sections.
- Verify listing pages still fit one-handed mobile use after the media readiness and trust cards.
- Verify APNS and FCM credentials are configured before relying on native push delivery.
- Complete the store and legal checklist in `docs/deployment/RELEASE_HARDENING_CHECKLIST.md`.

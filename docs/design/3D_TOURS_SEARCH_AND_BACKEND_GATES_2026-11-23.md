# BaytMiftah — Interactive 3D tours and backend release gates
Updated 2026-11-23. Scope: draft PR #42 on `feat/mobile-booking-ux-dm-hardening-20261122`.

## User-facing 3D experience
- Create a listing at `WorkspaceNewListing` or edit an existing listing at `WorkspaceListings`.
- Supply a **real, published Matterport scan** using `https://my.matterport.com/show/?m=<model-id>`. We intentionally do not claim to reconstruct 3D geometry from ordinary property photographs.
- Server storage: `properties.virtual_tour_url`, constrained to an allowlisted Matterport model URL. No arbitrary iframe code.
- Consumer detail page: optional interactive, responsive 3D viewer; explicit **Start 3D tour** click before third-party iframe loads, external full-screen tour link, **Stop tour** button, third-party data disclosure.
- Cards display a 3D badge **only** when a valid tour URL exists. A 3D scan is not evidence of property-title or ownership verification.
- Property admins can remove the tour by clearing the link. Any new provider requires a separate security review of host, frame policy, link normalization and content moderation.

## Remaining blockers and production protections

### 1. Deploy DB before clients
Run migrations on a dedicated staging database, in filename order:
1. `20261122190000_private_conversation_realtime.sql`
2. `20261122191000_guard_message_identity.sql`
3. `20261123100000_property_3d_tours.sql`
4. `20261123101000_public_search_server_pagination.sql`
5. `20261123102000_message_abuse_block_rate.sql`
6. `20261123103000_payangels_webhook_retry_state.sql`

Take a database snapshot first. Inspect all `realtime.messages` permissive policies. Private channel authorization can be undermined by unrelated broad policies. Never deploy the client or provider webhook handler before the matching DB migrations.

### 2. Search checks
- Confirm `search_public_listing_ids` returns only RLS-readable, listed, public listings.
- Validate all filters, counts, pages, sorting by currency, viewport geo bounds (including antimeridian), amenities, organizations and country/region matches against staging fixtures.
- Price ordering is **within currency groups**: without a trusted FX snapshot no global cheapest-property claim is supported.
- Track query plans and indexes with `EXPLAIN (ANALYZE, BUFFERS)` on staging-scale inventory. Avoid exposing hidden listings through count or sort.
- Search returns IDs + count in the database, followed by fetching only the bounded page of public listing information.

### 3. DMs
- Use three independent signed-in accounts. Confirm participants can join only their own private Realtime topic; an unrelated user cannot read, broadcast, subscribe, edit message identity or access attachments.
- Verify a block in either direction rejects **new direct messages** and no notification is delivered; existing data is retained per retention policy.
- Confirm at most 20 authenticated sends/minute per user, even with parallel requests. Trusted server-origin AI/system messages remain a separate privileged path.
- Ensure client messaging errors tell users the message was not saved; avoid losing drafts and duplicate sends. Test offline reconnect and revoked JWTs.
- SQL trigger is an abuse boundary, not full spam prevention or a hosted production penetration test.

### 4. PayAngels
- PayAngels is a payment provider; BaytMiftah does not hold customer money. All API paths, signatures and provider webhooks require provider-issued staging credentials and documented contracts.
- Webhook verifies signature **first**, claims an event by ID + payload digest with a lease, reconciles, then marks completed before responding with HTTP 200. Busy/failed events are retried rather than falsely acknowledged.
- Reconciliation rejects mismatched provider reference/currency; late non-success event must not downgrade paid or refund-in-progress states.
- Verify duplicate/out-of-order events, worker death after audit insert, timeout and lease reclaim, successful reconciling after retry, and processed refunds.
- **Unresolved high priority:** payment side-effects still span multiple independent wallet, booking and receipt updates, rather than one durable database transaction/outbox. Do not certify payout correctness until atomic/idempotent finalization and provider reconciliation have been tested.

### 5. Device/mobile acceptance
- Added 390px touch-viewport Chromium Playwright checks for signup and search.
- Real iOS Safari, Android Chrome, VoiceOver/TalkBack, native Capacitor builds, low-bandwidth Matterport errors, keyboard and reduced-motion checks still require physical/device-lab verification.

## Automated test entry points
```bash
npm run typecheck
npm run test
npm run test:sql:upgrades
npm run test:e2e
npm run security:all
npm run pilot:payangels-e2e -- --dry-run
```
Isolated PGlite tests exercise the actual DB migrations for public search, DM rate/blocks and PayAngels webhook lifecycle. They do **not** prove remote Supabase migrations, external PayAngels certification, security group policies, live data correctness, or device compatibility.

## Release decision
Keep PR #42 **draft** until all CI checks are green on the final SHA; isolated SQL checks pass; staging three-user and provider tests pass; external payment reconciliation is certified; property tours are loaded on real devices; and a rollout/rollback plan is approved.

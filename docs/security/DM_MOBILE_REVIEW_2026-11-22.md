# BaytMiftah mobile and direct messaging review — 2026-11-22

## Scope

- Consumer mobile home: `MobileAppShell.tsx`, `MobileHomeSections.tsx`, booking-style quick filters.
- Messaging: `realtime-messaging.service.ts`, `RealtimeMessagingContext.tsx`, `message.service.ts`.
- Database: existing participant/message RLS, workspace chat RPCs, new Realtime topic RLS and message identity guard.

**Design constraint:** the approved `Logo` component and all logo/branding assets remain unchanged. This is an additive mobile booking UX, not a rebrand.

## Source-confirmed findings and changes

| Priority | Source finding | Change / status |
|---|---|---|
| Critical if public Realtime access enabled | Contextual DMs sent full `NEW_MESSAGE` payloads over channels without `private: true`. Public Broadcast lacks conversation-specific RLS. | Private channel + membership-based `realtime.messages` policies. Removed untrusted `NEW_MESSAGE` broadcasts, using Postgres Changes for durable messages. **Not live verified**. |
| High | Existing message UPDATE RLS is based on sender identity; no original message identity trigger was found. Editing message conversation IDs can threaten integrity if permissions permit. | Restrict authenticated changes to immutable message identity/destination/sender. **Needs negative integration tests**. |
| High | UI can receive a database event and locally append the same message before/after local send resolves. | De-duplicate by message ID. |
| Medium | One send path inserts a message then separately updates `last_message_at`, throwing if the second write fails. A trigger already updates conversation metadata. | Removed redundant update so saved messages aren't falsely presented as failed. |
| Medium | Mobile listings only show a price and generic verification badge. | More informative transaction labels, accurate organization verification, detail/enquiry CTA, quick search routes, pricing disclaimer. |

## Current protections already observed

- `messages` has participant/sender RLS policies.
- Workspace direct threads use `open_workspace_direct_message` RPC with membership and block checks.
- `workspace_conversation_boundary` and `workspace_message_boundary` restrictive policies protect managed workspace conversations.
- No basis to claim the live database and its migration state match the repository without operator validation.

## Remaining risks to assess

1. **Realtime project-level public access:** review Realtime Settings and ALL existing policies on `realtime.messages`. Because permissive policies OR together, a broad legacy policy could undercut these new policies. Disable public Realtime channels only after auditing other consumers.
2. **Blocking and abuse:** the marketplace `messageService.createOrGetConversation` path does not visibly enforce the `blocked_users` table; workspace DMs use a different guarded RPC. Validate marketplace block bypasses, account suspension and per-user send rate limiting on live fixtures.
3. **Trusted agent/AI messages:** existing client-facing code can request `sender_type = 'ai_bot'`. The new database guard rejects such authenticated inserts; AI/system replies should be sent via a trusted server-side endpoint rather than impersonated by browser clients. Verify this workflow before release.
4. **Broadcast semantics:** typing/reaction/delivery events remain ephemeral client-origin signals and should never be used as authoritative records. Harden identity validation for those events if displayed as trusted status.
5. **Listing search scalability:** `listingService.searchListingsWithCount` currently downloads public listings and performs filtering, sort, counts, and pagination in client JavaScript. This risks incomplete search beyond PostgREST/Supabase row limits, expensive payloads, and slow browsing at scale. Implement an indexed, RLS-respecting server-side search RPC / query with true total counts and bounds. Cross-currency `price_asc` comparisons must be normalized before offering global price sort.
6. **Other backends:** validate production migrations, RLS for multi-tenant data, payment webhook signatures/PayAngels certification, rate limiting, backup restore evidence, and secret access. None of these are proven live-ready by reading source.

## Required rollout and verification order

1. Apply `20261122190000_private_conversation_realtime.sql` and `20261122191000_guard_message_identity.sql` on staging first.
2. Inspect existing remote Realtime policies (look for broad permissive policies):
   ```sql
   SELECT policyname, cmd, roles, qual, with_check
   FROM pg_policies
   WHERE schemaname='realtime' AND tablename='messages'
   ORDER BY policyname;
   ```
3. With two ordinary test accounts, verify permitted DM join, text delivery, reconnect, typing. With an unrelated third account, verify unauthorized private-channel join and REST `messages` read/write fail.
4. Attempt to UPDATE a sender-owned message with another `conversation_id` or `sender_type`, and INSERT `sender_type='system'`; all must fail. Also verify legitimate edits/read receipts still work.
5. Verify workspace-private channel access, blocked user behaviour, suspended organizations, and AI support flows in staging.
6. Deploy web/mobile client only when DB tests pass. Check live configurations (RLS, public-channel setting, JWT refresh and revocation). No migration was executed or application published by this branch.

## Run tests

```bash
npm run typecheck
npx vitest run src/app/components/baytmiftah/mobile/MobileBookingQuickFilters.test.tsx src/lib/security/dm-realtime-guard.test.ts src/lib/realtime-messaging.service.test.ts
npm run build
```

The static security tests check code presence; they **do not** constitute a penetration test or validate deployed Postgres access controls.

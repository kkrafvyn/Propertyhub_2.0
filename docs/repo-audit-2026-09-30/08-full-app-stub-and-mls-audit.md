# Full-app stub and MLS syndication audit

Audit follow-up: 2026-10-01

## Scope and method

The scan covered first-party runtime code in `src`, Supabase Edge Functions, Electron code, operational scripts, database migrations, environment wiring, and exposed workspace routes. Generated output, dependencies, tests, UI input placeholder text, and legitimate empty-state returns were excluded from the stub count.

Searches included explicit `TODO`/`FIXME` markers, mock/demo/fake datasets, simulated provider results, “not implemented” comments, empty click handlers, hard-coded provider endpoints, client-side secret access, and functions that report success without making the claimed external call.

## MLS/listing syndication — fixed

The previous implementation was not production-safe:

- It incorrectly required an `MLS_API_SECRET` even though the configured provider issued one API token.
- It stored provider keys in a table readable from the browser by organization members.
- It called guessed MLS, Zillow, and Realtor endpoints directly from the browser.
- It accepted a feed URL from browser-managed credential data.
- The external listing uniqueness constraint omitted `organization_id`, allowing cross-organization collisions.

The replacement implementation:

- Uses `MLS_API_KEY` plus `MLS_FEED_URL`; no API secret is required.
- Supports `bearer`, `x-api-key`, and query-parameter authentication.
- Keeps provider keys in Supabase Edge Function secrets and never returns them to the browser.
- Requires an authenticated organization operator before status or sync operations.
- Requires HTTPS, applies a 30-second timeout and 15 MB response limit, and accepts JSON/RESO-style feeds only.
- Upserts on `(organization_id, provider, external_id)`.
- Revokes browser access to the legacy `mls_credentials` secret table.
- Removes credential entry from the Integration Hub; the UI now reports server configuration state.

The root `.env` contains an MLS API token and is set to Bearer authentication. The provider account had one successful listing Actor run, so `MLS_FEED_URL` now uses that Actor's stable “latest successful run” dataset endpoint with clean JSON output. The sampled result contained structured property, address, price, GPS, image, and area fields; those fields are covered by the normalizer. Apify recommends the Bearer authorization header for tokens.

## Confirmed production stubs still requiring provider work

### P1 — Tenant screening adapters

`src/lib/tenant-screening-providers.ts` does not call TransUnion or a KYC provider. When no key is present it creates a fabricated sandbox score, and when a key is present it labels a locally generated response as `mode: live`. `lease-screening.service.ts` then records the result as completed. This must be replaced with a server-side provider function and webhook/status polling before tenant screening can be marketed as automated.

### P1 — FCM push delivery

`src/lib/fcm-push.service.ts` stores tokens but does not call Firebase Admin/FCM. It can show a notification in the sender's current browser and then reports every token as delivered. The existing `dispatch-notification` Edge Function has real Web Push delivery; the omnichannel router should be migrated to that path or a Firebase Admin Edge/backend worker.

## Non-production or non-deceptive remnants

- `contractor-dispatch.service.ts`, `owner-disbursement.service.ts`, and `visitor-clearance.service.ts` retain dead `MOCK_*` fixtures. Their public legacy methods throw and active workspace pages use live Supabase methods, so they do not fabricate production results. The fixtures should be deleted as cleanup.
- Utility submeter, realtime messaging, agentic contractor matching, WhatsApp bot simulation, and call simulation are gated by `isDemoSimulationAllowed()`, which is test-only in shipped builds.
- FX hedging is explicitly presented as a calculator/simulator and is not an external execution claim.
- “Receipt not available,” unsupported-market checkout, empty health states, `return []`, and React `return null` occurrences are data/permission/conditional UI paths rather than implementation stubs.

## Recommended next implementation order

1. Run one authenticated controlled sync from the Integration Hub and review imported listing quality.
2. Replace tenant screening simulations with a server-side provider adapter and asynchronous result verification.
3. Route omnichannel push through the existing Web Push backend or add Firebase Admin delivery.
4. Delete unreachable mock fixture blocks and their obsolete synchronous APIs.

## Validation

- TypeScript typecheck: passed.
- Production Vite build: passed.
- Listing syndication unit tests cover key-only auth, RESO-style mapping, and incomplete configuration behavior.

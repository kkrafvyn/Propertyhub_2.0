# Stub and degraded-mode registry

Single reference for intentional non-production behavior in BaytMiftah REOS. Updated 2026-11-12 after stub inventory refresh and registry-gap sync.

Gate: `src/lib/simulation-mode.ts` — `isDemoSimulationAllowed()` is true only under Vitest (`MODE === "test"`). Shipped builds never enable demo simulators.

## Test-only simulators (`import.meta.env.MODE === "test"`)

| Surface | Module | Notes |
|---------|--------|--------|
| Agentic demo ledger / Night Watch narratives | `src/lib/agentic-ai-orchestrator.service.ts` | Production uses UUID org + live DB only; non-UUID throws. |
| WhatsApp group message simulation | `src/lib/whatsapp-group-bot.service.ts` | `simulateGroupMessage*` throws outside Vitest. |
| Incoming call simulation | `src/app/context/CallContext.tsx` | `simulateIncomingCall` no-ops outside test. |
| Realtime messaging local map | `src/lib/realtime-messaging.service.ts` | In-memory fallback only in test. |
| Developer API memory store | `src/lib/developer-api.service.ts` | `USE_MEMORY` when `MODE === 'test'`. |
| Stub contract guard | `src/lib/stub-guard.test.ts` | Asserts simulators stay test-gated. |

## Degraded modes (honest UX)

| Surface | Behavior | User signal |
|---------|----------|-------------|
| AI assistant local FAQ | `ai-assistant.service.ts` + edge `ai-assistant` | `responseMode: local_faq` + panel badge |
| Ghana trust screening | `tenant-screening-providers.ts` | `mode: manual_review`; no fabricated credit scores |
| PayAngels sandbox | Checkout pages (`InAppCheckoutPage`, `PaymentCheckout`) | Amber sandbox banner; live pay blocked when `simulated` / `sim_` |
| FCM client dispatch | `fcm-push.service.ts` | Deprecated; returns 0 delivered — use `dispatch-notification` edge |
| Web / native push client | `push-notification.service.ts`, `baytmiftah/push-service.ts`, `native-push-registration.service.ts` | Explicit “not configured” when VAPID/native keys missing |
| Mobile push settings copy | `MobileAppSettings.tsx` | States native FCM/APNs not configured for production mobile builds yet |
| Gate clearance SMS | `GateClearanceKiosk.tsx` | Toast when pass saves but SMS delivery is not configured |

## Provider gaps (fail closed — not fake success)

| Area | Module | Behavior |
|------|--------|----------|
| TransUnion SmartMove | `tenant-screening-providers.ts` | `isConfigured: () => false`; throws until server-side SmartMove is wired |
| Ghana / Smile KYC | `tenant-screening-providers.ts` + `supabase/functions/_shared/smile-identity.ts` | Manual review path; Smile defaults to `sandbox` env when keys present |
| In-app voice / video | `CallContext.tsx`, `EstateCommunications.tsx` | Alert + `tel:` / messaging fallback when providers unset |
| Multi-agent workers | `agentic-ai-orchestrator.service.ts` | Non–Executive goals throw “not connected to a production worker” |
| Bank feed sync | `supabase/functions/sync-bank-feed/index.ts` | `status: "not-configured"`, empty `transactions` when feed env missing |
| DocuSign envelopes | `docusign-envelope.service.ts` | Throws if `DOCUSIGN_*` secrets missing |
| Property tokens / chain | `property-token.service.ts` (+ blockchain helpers) | Rejects `sim:` addresses; requires live contract config |
| WhatsApp Cloud | Edge `whatsapp-webhook` / `send-whatsapp` | Functions may be ACTIVE; Meta secrets + org `whatsapp` integration + group channels still required |
| Listing syndication | `supabase/functions/listing-syndication/index.ts` | 503 when MLS API key / feed URL missing |
| Import data extract | `supabase/functions/import-data-extract/index.ts` | Fail closed when AI extraction is not configured |
| Polygon transactions | `supabase/functions/polygon-transactions/index.ts` | Fail closed when PolygonScan is not configured |
| Omnichannel notify | `supabase/functions/dispatch-notification` + `_shared/resend-mail.ts` | Email / Twilio SMS / web-push fail closed without secrets |
| PayAngels disbursement | `supabase/functions/initiate-payangels-disbursement/index.ts` | Fail closed when disbursement credentials are unset |

## Config-gated integrations (secrets / feature flags)

WhatsApp Cloud, voice/video providers, web push VAPID, TransUnion SmartMove, DocuSign, Polygon / PolygonScan, Prembly/Smile KYC, MLS listing syndication, Resend, Twilio, PayAngels checkout/disbursement — require Edge/platform secrets and/or `platform_settings`. Fail closed with explicit errors. See `docs/API_KEYS_AND_INTEGRATIONS.md`.

## Static fallbacks and intentional demos (not fabricated tenant data)

| Item | Purpose |
|------|---------|
| `WORKSPACE_MODULE_CATALOG_FALLBACK` | Nav metadata when module catalog table is empty |
| Empty arrays / null UI | Permission or no rows |
| Practice sandbox estates | `practice-mode-fixtures.ts` — explicit workspace practice mode only |
| FX hedging calculator | `multi-currency-fx.service.ts` — labeled simulation / calculator, not live execution |
| Marketing product-tour copy | `marketing-page-document.ts` — “Demo data only” disclaimer |
| Call audio meter jitter | `CallContext.tsx` — UI chrome only |

## Prioritized provider work

Order for closing remaining provider gaps (highest impact first):

1. **TransUnion SmartMove + Smile/Prembly KYC** — replace fail-closed / manual-review screening with server-side adapters + webhook/status polling (`tenant-screening-providers.ts`, lease screening, Smile shared helper).
2. **WhatsApp Meta Cloud** — set `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`; connect org WhatsApp Business integration; link group channels in WhatsApp Hub.
3. **In-app voice/video provider** — configure provider credentials so `CallContext` / estate communications stop falling back to alerts + `tel:`.
4. **Multi-agent production workers** — connect non–Executive agent goals in `agentic-ai-orchestrator.service.ts` to real workers (beyond live Executive Night Watch scans).
5. **Bank feed credentials** — configure sync-bank-feed env so reconciliation leaves `not-configured`.
6. **DocuSign + property token contracts** — `DOCUSIGN_*` secrets and non-`sim:` chain addresses when those products are marketed live.
7. **Mobile native push (FCM/APNs)** — production mobile builds; web path already prefers `dispatch-notification`.

## Removed

### 2026-10-04 sweep

- `MOCK_*` fixtures in owner disbursement, visitor clearance, contractor dispatch
- Legacy throw-only sync APIs on those services
- WhatsApp hub dead simulator UI and Demo Tenant group sim defaults
- Production path into hardcoded agent goal narratives

### 2026-11-12 cleanup

- Unused `supabase/functions/_shared/simulation.ts` (`isSimulationAllowed` always `false`, no importers)

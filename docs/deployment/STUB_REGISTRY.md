# Stub and degraded-mode registry

Single reference for intentional non-production behavior in BaytMiftah REOS. Updated 2026-10-04 after the full stub sweep.

## Test-only simulators (`import.meta.env.MODE === "test"`)

| Surface | Module | Notes |
|---------|--------|--------|
| Agentic demo ledger / Night Watch narratives | `src/lib/agentic-ai-orchestrator.service.ts` | Production uses UUID org + live DB only; non-UUID throws. |
| WhatsApp group message simulation | `src/lib/whatsapp-group-bot.service.ts` | `simulateGroupMessage*` throws outside Vitest. |
| Incoming call simulation | `src/app/context/CallContext.tsx` | `simulateIncomingCall` no-ops outside test. |
| Realtime messaging local map | `src/lib/realtime-messaging.service.ts` | In-memory fallback only in test. |
| Developer API memory store | `src/lib/developer-api.service.ts` | `USE_MEMORY` when `MODE === 'test'`. |

## Degraded modes (honest UX)

| Surface | Behavior | User signal |
|---------|----------|-------------|
| AI assistant local FAQ | `ai-assistant.service.ts` + edge `ai-assistant` | `responseMode: local_faq` + panel badge |
| Ghana trust screening | `tenant-screening-providers.ts` | Manual review, no fabricated credit scores |
| PayAngels sandbox | Checkout pages | Amber sandbox banner; live pay blocked when `simulated` / `sim_` |
| FCM client dispatch | `fcm-push.service.ts` | Deprecated; use `dispatch-notification` edge |

## Config-gated integrations (not code stubs)

WhatsApp Cloud, voice/video providers, web push VAPID, TransUnion SmartMove, DocuSign, Polygon, Prembly/Smile KYC — require secrets and/or platform feature flags (`platform_settings`). Fail closed with explicit errors.

## Static fallbacks (not fabricated tenant data)

| Item | Purpose |
|------|---------|
| `WORKSPACE_MODULE_CATALOG_FALLBACK` | Nav metadata when module catalog table is empty |
| Empty arrays / null UI | Permission or no rows |

## Removed in 2026-10-04 sweep

- `MOCK_*` fixtures in owner disbursement, visitor clearance, contractor dispatch
- Legacy throw-only sync APIs on those services
- WhatsApp hub dead simulator UI and Demo Tenant group sim defaults
- Production path into hardcoded agent goal narratives

# BaytMiftah Smart Property Access Rollout

This is the practical rollout plan for IoT access across homes, apartments, warehouses, car parks, and office complexes. The current app is already provider-neutral; this document explains what to buy, what accounts to create, what keys to add later, and what must pass before live users get access codes.

## Launch Recommendation

Start with one access provider and one sensor provider:

| Priority | Provider | Use first | Why |
| --- | --- | --- | --- |
| 1 | TTLock | Residential locks and viewing codes | Affordable, common smart-lock ecosystem, good first pilot choice. |
| 2 | Tuya | Sensors, smart plugs, energy monitoring, occupancy, some locks | Broad device coverage for vacant properties and commercial monitoring. |
| 3 | Yale | Premium locks after the first pilot | Useful for higher-end homes/offices, but add after the workflow is proven. |

Do not launch all providers at once. Run the first pilot with TTLock plus Tuya, then add Yale after support and legal processes are stable.

## Pilot Hardware Kit

| Device | Quantity | Property type | Purpose |
| --- | ---: | --- | --- |
| TTLock-compatible smart lock | 1 | Apartment/house/office | Temporary viewing code and tenant key test. |
| Tuya smart plug or energy meter | 1 | Apartment/warehouse/office | Vacant-property power usage and energy alert test. |
| Tuya door sensor | 1 | Apartment/warehouse/office | Entry state test without storing camera footage. |
| Tuya motion sensor | 1 | Warehouse/office/vacant home | Vacancy-window motion alert test. |
| Parking gate relay/controller | 1 optional | Car park/office complex | Temporary vehicle access test. |
| Dock door/gate controller | 1 optional | Warehouse | Loading-bay access test. |

## Provider Accounts To Create

| Provider | Account needed | Notes |
| --- | --- | --- |
| TTLock | Developer/API account or approved partner integration | Ask for API access that can create, revoke, and audit passcodes. |
| Tuya | Tuya IoT Platform cloud project | Create project, link devices, enable APIs for device status and commands. |
| Yale | Yale/August partner or API access | Keep as phase-two provider unless a pilot landlord already uses Yale. |

## Environment Variables

Store secrets only in Supabase/Vercel server environments. Never expose IoT tokens to the frontend.

```env
TTLOCK_COMMAND_ENDPOINT=
TTLOCK_ACCESS_TOKEN=
TTLOCK_CLIENT_ID=
TTLOCK_CLIENT_SECRET=
TTLOCK_API_BASE_URL=
TTLOCK_GENERATE_VIEWING_CODE_ENDPOINT=
TTLOCK_SEND_ACCESS_GRANT_ENDPOINT=
TTLOCK_REVOKE_ACCESS_GRANT_ENDPOINT=
TTLOCK_SYNC_DEVICE_HEALTH_ENDPOINT=

TUYA_COMMAND_ENDPOINT=
TUYA_ACCESS_TOKEN=
TUYA_ACCESS_ID=
TUYA_ACCESS_SECRET=
TUYA_PROJECT_ID=
TUYA_API_BASE_URL=
TUYA_GENERATE_VIEWING_CODE_ENDPOINT=
TUYA_SEND_ACCESS_GRANT_ENDPOINT=
TUYA_REVOKE_ACCESS_GRANT_ENDPOINT=
TUYA_SYNC_DEVICE_HEALTH_ENDPOINT=

YALE_COMMAND_ENDPOINT=
YALE_ACCESS_TOKEN=
YALE_CLIENT_ID=
YALE_CLIENT_SECRET=
YALE_API_BASE_URL=
YALE_GENERATE_VIEWING_CODE_ENDPOINT=
YALE_SEND_ACCESS_GRANT_ENDPOINT=
YALE_REVOKE_ACCESS_GRANT_ENDPOINT=
YALE_SYNC_DEVICE_HEALTH_ENDPOINT=

IOT_PILOT_SUPPORT_PHONE=
IOT_PILOT_SUPPORT_EMAIL=
IOT_EMERGENCY_ESCALATION_PHONE=
```

The Edge Function first looks for command-specific endpoints like `TTLOCK_GENERATE_VIEWING_CODE_ENDPOINT`. If those are absent, it falls back to `TTLOCK_COMMAND_ENDPOINT`.

## BaytMiftah Setup Steps

1. Add the provider keys to production secrets.
2. Run `npm run prod:env:check -- --strict-iot --env-file=.env.production`.
3. In the workspace, create an IoT provider connection.
4. Register the test device against a real test listing.
5. Confirm a viewing for that listing.
6. Generate a viewing code from Smart Access.
7. Revoke the code after testing.
8. Attach evidence in `/admin/launch` and `docs/operations/PRODUCTION_EVIDENCE_PACKET.md`.

## Live Device Test Matrix

| Test | Expected result | Evidence |
| --- | --- | --- |
| Generate viewing code | Code is created, time-limited, and hint is stored without exposing full PIN publicly. | Screenshot/log of grant and provider response with secret redacted. |
| Use viewing code | Door/gate opens only during the approved viewing window. | Timestamped test note. |
| Expire viewing code | Code fails after the access window. | Provider/event log. |
| Revoke viewing code | Code stops working immediately. | Provider/event log. |
| Tenant digital key | Long-lived key is created only after approved tenancy/escrow handoff. | Test tenant record and provider event. |
| Move-out revocation | Tenant key is removed at tenancy end. | Revocation log. |
| Device offline | App shows safe fallback and support path. | Screenshot and provider status. |
| Failed unlock | Failure is logged without repeated unsafe retries. | Command event log. |
| Entry log | Only metadata is stored: who, when, access type, device. | Access event row. |
| Emergency access | Support process is followed without exposing master credentials. | Incident drill note. |

## Property-Type Coverage

| Property type | Recommended devices |
| --- | --- |
| Apartment | Smart lock, door sensor, energy monitor. |
| House | Smart lock, gate access, door sensor, motion sensor, energy monitor. |
| Office | Smart lock/gate, occupancy counter, energy monitor. |
| Office complex | Lobby access, parking gate, occupancy counter, shared-area sensors. |
| Warehouse | Dock door, service gate, warehouse sensor, motion sensor, energy monitor. |
| Car park | Parking gate, occupancy counter, CCTV link metadata only. |

## Operating Rules

- Agency/landlord owns and installs the device unless BaytMiftah later creates a managed hardware program.
- BaytMiftah should only connect certified providers and tested devices.
- No camera footage should be stored on BaytMiftah servers in the first IoT release.
- Every live access grant must have a reason: viewing, tenancy, maintenance, owner, admin, or emergency.
- Every access grant must have a start and end time.
- Emergency support must have a human fallback before live launch.
- Legal must approve IoT privacy wording before storing live tenant/viewer entry logs.

## Go/No-Go Criteria

BaytMiftah can enable live IoT for a pilot only when:

- At least one provider credential set passes `--strict-iot`.
- One real lock/gate code cycle passes: create, use, expire, revoke.
- One device-health sync passes.
- One provider-offline fallback test passes.
- Legal signs off Smart Access policy language.
- Support confirms emergency phone/email coverage.
- Ops signs the evidence packet.

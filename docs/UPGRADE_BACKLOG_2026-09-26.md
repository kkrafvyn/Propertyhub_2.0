# Upgrade backlog and product improvement plan

Updated: 2026-09-26

This backlog captures the next high-value work after the current code-level and deployment smoke validation. It is intentionally focused on moves that improve trust, polish, and operational reliability without expanding the system beyond the current product scope.

## Current status

The app is currently in a strong state for:

- repo-level regression checks
- build validation
- live deployment smoke checks
- admin authorization and ownership guardrails
- owner access, digests, and negative authorization coverage
- consumer KYC and booking-flow gating logic

The remaining value now sits in product polish, better trust signaling, and cleaner role/admin UX.

## Priority 0 — final live admin acceptance

### 1. Authenticated admin validation against the deployed app
Why: repo tests are green, but the final acceptance still requires real signed-in admin flows.

Files to verify:
- [src/app/pages/admin/AdminLayout.tsx](../src/app/pages/admin/AdminLayout.tsx)
- [src/app/components/admin/AdminOrganizationAccessDialog.tsx](../src/app/components/admin/AdminOrganizationAccessDialog.tsx)
- [src/lib/admin.service.ts](../src/lib/admin.service.ts)
- [src/lib/authorization.ts](../src/lib/authorization.ts)
- [src/lib/role-assignment.ts](../src/lib/role-assignment.ts)

Recommended checks:
- create organization as platform admin with disposable accounts
- transfer ownership and confirm previous owner status changes correctly
- block and unblock signed-in accounts and test protected REST/Storage access denial
- confirm org-admin / department-head cross-boundary denial paths in the live UI
- verify MFA and console-delegate denial behavior

## Priority 1 — trust and fraud UX

### 2. Add clearer listing and user trust indicators
Why: trust is a differentiator and should be explicit in the consumer journey.

Files to review:
- [src/app/pages/PropertyDetail.tsx](../src/app/pages/PropertyDetail.tsx)
- [src/app/components/baytmiftah/StayBookingCard.tsx](../src/app/components/baytmiftah/StayBookingCard.tsx)
- [src/lib/kyc-gate.service.ts](../src/lib/kyc-gate.service.ts)
- [src/lib/kyc.service.ts](../src/lib/kyc.service.ts)

Planned improvements:
- visible identity / verification status badges
- explicit KYC requirement banners before final booking or payout workflows
- risk labels for high-sensitivity actions
- clearer “pending review / approved / blocked” states across listing and booking flows

### 3. Harden trust flow around payment and payout actions
Why: trust failures are costly when they happen late in the journey.

Files to review:
- [src/lib/payment-certification.test.mjs](../scripts/pilot/payment-certification.test.mjs)
- [src/lib/owner-disbursement-live.service.test.ts](../src/lib/owner-disbursement-live.service.test.ts)
- [src/lib/booking.service.ts](../src/lib/booking.service.ts)
- [src/lib/commission.service.ts](../src/lib/commission.service.ts)

Planned improvements:
- show payment status with clear explanation states
- attach who approved / who reviewed the payout path
- improve cancellation and refund messaging
- add reconciliation warnings when totals or status mismatches appear

## Priority 2 — better role-based admin UX

### 4. Make admin workflows easier to understand and audit
Why: power is present, but the UI still needs stronger clarity and faster operational confidence.

Files to review:
- [src/app/pages/admin/AdminLayout.tsx](../src/app/pages/admin/AdminLayout.tsx)
- [src/app/pages/admin/AdminOrganizationDetail.tsx](../src/app/pages/admin/AdminOrganizationDetail.tsx)
- [src/app/components/admin/AdminDeleteAccountDialog.tsx](../src/app/components/admin/AdminDeleteAccountDialog.tsx)
- [src/lib/authorization.ts](../src/lib/authorization.ts)
- [src/lib/role-assignment.ts](../src/lib/role-assignment.ts)

Planned improvements:
- show current scope and org membership status in one place
- add danger states for cross-org or cross-dept actions with direct explanations
- add audit summaries for ownership transfer, account blocking, and role changes
- improve the admin onboarding flow for new platform admins and org admins

## Priority 3 — performance and app weight

### 5. Reduce bundle size and first-load weight
Why: the app is functionally large, and route-level chunking can be improved.

Files to review:
- [vite.config.ts](../vite.config.ts)
- [src/app/routes/consumer.routes.tsx](../src/app/routes/consumer.routes.tsx)
- [src/app/pages/ConsumerIndex.tsx](../src/app/pages/ConsumerIndex.tsx)
- [src/app/shells/ConsumerWebShell.tsx](../src/app/shells/ConsumerWebShell.tsx)

Planned improvements:
- split heavy route and dashboard modules further
- lazy-load non-critical legal, marketing, and analytics components
- move large workspace modules behind route-level loading
- reduce rehydration cost in the first consumer screen

## Priority 4 — offline reliability and background sync

### 6. Improve mobile and workspace sync resilience
Why: trust and user satisfaction increase when the app handles connectivity and retries cleanly.

Files to review:
- [src/lib/workspace-sync.service.ts](../src/lib/workspace-sync.service.ts)
- [src/app/mobile/MobileAppShell.tsx](../src/app/mobile/MobileAppShell.tsx)
- [src/app/pages/workspace/WorkspaceEntry.tsx](../src/app/pages/workspace/WorkspaceEntry.tsx)
- [src/app/context/RealtimeMessagingContext.tsx](../src/app/context/RealtimeMessagingContext.tsx)

Planned improvements:
- visible online/offline status in workspace and mobile app shells
- retry queues for failed edits and unsynced work
- conflict banners for stale local changes
- clear “last sync” and “failed sync” messaging

## Priority 5 — branding and product consistency

### 7. Remove stale or misleading brand assets and unify the identity system
Why: brand consistency reduces confusion and makes the product feel more premium and trustworthy.

Files to review:
- [src/app/components/baytmiftah/Logo.tsx](../src/app/components/baytmiftah/Logo.tsx)
- [public/brand/README.md](../public/brand/README.md)
- [public/brand/logo-primary.svg](../public/brand/logo-primary.svg)
- [public/brand/logo-stacked.svg](../public/brand/logo-stacked.svg)
- [public/brand/logo-inverted.svg](../public/brand/logo-inverted.svg)
- [public/manifest.workspace.webmanifest](../public/manifest.workspace.webmanifest)

Planned improvements:
- keep only approved BaytMiftah marks in the active brand set
- align favicon, QR/app icon, web app icon, and splash visuals with the same mark
- remove any stale or inaccurate variants from the public asset folder
- ensure splash and workspace icons match the actual design language

### 8. Standardize the app icon and favicon set
Why: inconsistent icons reduce trust and make the app feel unfinished.

Files to review:
- [public/brand/app-icon.svg](../public/brand/app-icon.svg)
- [public/brand/app-icon-workspace.svg](../public/brand/app-icon-workspace.svg)
- [public/brand/symbol.svg](../public/brand/symbol.svg)
- [public/brand/symbol-white.svg](../public/brand/symbol-white.svg)
- [index.html](../index.html)

Planned improvements:
- validate the default favicon, app icon, and workspace icon are all consistent
- regenerate any stale PNG or icon assets if they still exist
- ensure the browser tab, PWA, and native app all use the same brand direction

## Priority 6 — product polish and customer journey flows

### 9. Improve conversion flow from browse to booking to confirmation
Why: the strongest app wins on clarity and trust in the transaction path.

Files to review:
- [src/app/pages/PropertyDetail.tsx](../src/app/pages/PropertyDetail.tsx)
- [src/app/pages/user/Dashboard.tsx](../src/app/pages/user/Dashboard.tsx)
- [src/app/lib/consumer-routes.ts](../src/lib/consumer-routes.ts)
- [src/lib/booking-progress.test.ts](../src/lib/booking-progress.test.ts)

Planned improvements:
- clearer state transitions in booking progress
- better persistence of filters, saved searches, and deep links
- stronger handoff between viewing, enquiry, offer, and booking
- direct trust and payment status visibility to users and staff

## Suggested order of execution

1. final live admin acceptance validation
2. trust and fraud UX cleanup
3. role-admin clarity and audit improvements
4. branding cleanup and icon consistency
5. bundle size and app performance pass
6. offline sync resilience
7. customer journey polish

This order keeps the effort aligned with impact: trust, clarity, and product confidence first, then polish and optimization.

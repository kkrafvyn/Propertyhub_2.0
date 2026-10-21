# BaytMiftah UI patterns

Operator reference for consumer and workspace surfaces. See also [PRODUCTION_SCORE.md](../deployment/PRODUCTION_SCORE.md).

## Consumer (`/app`, checkout, public flows)

| Pattern | Component | Notes |
|---------|-----------|--------|
| Page chrome | `PageLayout` + `PageHeader` | `variant="consumer"`; `#main-content` on `<main>` |
| Standalone `/app` orphans | `ConsumerHubChrome` | Nav pills when not inside `UserDashboard` |
| Query states | `OperationalQueryState` | Never show empty UI on fetch failure |
| Surfaces | `app-surface-card`, `app-page-title` | [`app-ui.css`](../../src/styles/app-ui.css) |
| Degraded modes | `DegradedModeBanner` | Sandbox checkout, AI local FAQ |
| Funnel reference | `PropertySearch`, `PropertyDetail`, `StayBookingCard`, `ConsumerJourneyPage` |

## Workspace (`/workspace/:slug/...`)

| Pattern | Component | Notes |
|---------|-----------|--------|
| Page chrome | `WorkspacePageShell` | Title, description, actions; uses `app-page-title` |
| Layout frame | `WorkspaceLayout` | Lazy `PageLoadingSkeleton`, offline banner, command bar |
| Query states | `OperationalQueryState` | Same as consumer |
| Reference modules | `WorkspaceLeads`, `OwnerDisbursements`, `LeasingApplications` | Shell + dialogs |

### Shell coverage (audit: 103/103 workspace page modules)

All audited `src/app/pages/workspace/*.tsx` modules (excluding layout/entry/tests) import `WorkspacePageShell`. Pair with `OperationalQueryState` wherever data is fetched. Finance modules often pass `tone="finance"`.

Run `npm run workspace:audit:shell` to verify; CI appends output to the job summary (non-blocking).

**Deprecated:** `ConsumerShell` — use `ConsumerHubChrome` + `PageLayout` for consumer orphans (see consumer table above).

## Mobile surfaces

| Stack | Where |
|-------|--------|
| `mobile-bolt` + `MobileBottomNav` | Consumer phone routes (not `/` home shell) |
| `MobileAppShell` | Phone `/` home only |
| `BusinessMobileShell` | Workspace field app (`bg-background`, not bolt) |

## Overlays (z-index)

Use CSS variables from `app-ui.css`: `--z-overlay-gallery`, `--z-overlay-call`, `--z-overlay-ai`.

## Charts

`src/app/components/ui/chart.tsx` (Recharts) is stock shadcn. **OrganizationInsights** and **PortfolioAnalytics** intentionally use `MetricCard` / tables for v1 — migrate to tokenized charts when analytics API stabilizes.

## Forms

Prefer `FormRow` (label + hint + error), `Label` + `Input`, or shadcn `Form` on new work (`PropertyDetail` inquiry, `WorkspaceNewListing`).
